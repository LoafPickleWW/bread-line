#!/usr/bin/env node
// The `bread-line` command. `npm create bread-line@latest` sets up a workspace folder; every other command runs one
// engine step for the workspace you're in (see src/workspace.js), e.g. `bread-line radar --profile sam`.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, relative } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const PKG = fileURLToPath(new URL('../', import.meta.url));
const VERSION = JSON.parse(readFileSync(resolve(PKG, 'package.json'), 'utf8')).version;

// Command -> script (plus fixed arguments). Workspace package.json scripts map `npm run <name>` to these.
const STEPS = {
  radar: ['src/fetch.js'],
  'radar:dry': ['src/fetch.js', '--dry'],
  'radar:commit': ['scripts/commit.js'],
  show: ['scripts/show.js'],
  digest: ['scripts/digest.js'],
  discover: ['scripts/discover.js'],
  'save-scores': ['scripts/save-scores.js'],
  'tracker:prep': ['scripts/to-tracker.js'],
  'tracker:scores': ['scripts/scores-to-tracker.js'],
  'tracker:local': ['scripts/to-local.js'],
  'tracker:page': ['scripts/tracker-page.js'],
  'profile:new': ['scripts/new-profile.js'],
  'profile:check': ['scripts/check-profile.js'],
};

const HELP = `Bread Line ${VERSION}: a daily remote job radar, scored against your resume.

Start:
  npm create bread-line@latest [folder]  set up a Bread Line folder (default: ./bread-line),
                                         then offer to start Claude Code or Codex on the setup
    --agent claude|codex   start that agent without asking     --no-launch   just make the folder

Daily steps (run inside the folder; add --profile <name> for a profile other than the active one):
${Object.keys(STEPS).map((c) => '  bread-line ' + c).join('\n')}

Inside the folder, \`npm run <step>\` does the same thing. RUNBOOK.md has the daily run.`;

const GITIGNORE = `# Profiles hold resumes, job history and personal filters. Keep them out of git.
profiles/*
!profiles/_template/
node_modules/
`;
const README = `# My Bread Line

A daily remote job radar. Every weekday it reads company job boards, filters them to the roles you want, and your
coding agent scores what's left against your resume and puts it in your Bread Line tracker.

## Set up

Open Claude Code or Codex in this folder and say "set up Bread Line for me". The setup reads your resume, asks a
few questions, builds your profile in \`profiles/<name>/\`, and schedules your weekday run.

## Every day

The scheduled run follows RUNBOOK.md. To run it by hand, say "run the job radar" in this folder.

## Updating

\`npm update @loafpickleww/bread-line\` gets the newest engine. Your profiles are untouched.

## Privacy

Everything about you lives in \`profiles/\`, which .gitignore keeps out of git. Bread Line only reads public job
boards; it never applies for jobs or messages anyone.

Made by LoafPickle Worldwide LLC.
`;

const [cmd, ...rest] = process.argv.slice(2);

// Agents the setup can start, with how to launch each one on a first prompt.
const AGENTS = [
  { id: 'claude', label: 'Claude Code', bin: 'claude' },
  { id: 'codex', label: 'Codex', bin: 'codex' },
];
const SETUP_PROMPT = 'set up Bread Line for me';
const onPath = (bin) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin], { stdio: 'ignore' }).status === 0;

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  console.log(HELP);
} else if (cmd === '--version' || cmd === '-v') {
  console.log(VERSION);
} else if (cmd === 'init') {
  await init(rest);
} else if (STEPS[cmd]) {
  const [script, ...fixed] = STEPS[cmd];
  const r = spawnSync(process.execPath, [resolve(PKG, script), ...fixed, ...rest], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
} else {
  console.error(`Unknown command "${cmd}". Run \`bread-line help\` for the list.`);
  process.exit(1);
}

async function init(args) {
  const noInstall = args.includes('--no-install');
  const noLaunch = args.includes('--no-launch');
  const ai = args.indexOf('--agent');
  const wanted = ai > -1 ? args[ai + 1] : null;
  const folderArg = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--agent');
  const dest = resolve(folderArg ?? 'bread-line');
  if (existsSync(dest) && readdirSync(dest).length) {
    console.error(`${dest} already has files in it. Pick an empty or new folder: npm create bread-line@latest <folder>`);
    process.exit(1);
  }
  mkdirSync(dest, { recursive: true });

  // The skills, agent notes, runbook and blank profile come from the package; the engine stays in node_modules.
  for (const p of ['.claude/skills/bread-line-setup', '.agents/skills/bread-line-setup', 'profiles/_template', 'AGENTS.md', 'RUNBOOK.md']) {
    cpSync(resolve(PKG, p), resolve(dest, p), { recursive: true });
  }
  writeFileSync(resolve(dest, '.gitignore'), GITIGNORE);
  writeFileSync(resolve(dest, 'README.md'), README);
  const name = basename(dest).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'bread-line';
  const pkg = {
    name: name === 'bread-line' ? 'my-bread-line' : name,
    private: true,
    description: 'My Bread Line: a daily job radar scored against my resume.',
    type: 'module',
    scripts: Object.fromEntries(Object.keys(STEPS).map((c) => [c, `bread-line ${c}`])),
    // BREADLINE_SPEC lets a test install point at a local tarball before a version is on npm.
    dependencies: { '@loafpickleww/bread-line': process.env.BREADLINE_SPEC || `^${VERSION}` },
  };
  writeFileSync(resolve(dest, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  const where = relative(process.cwd(), dest) || '.';
  if (!noInstall) {
    console.log('Installing the Bread Line engine...');
    const r = spawnSync('npm install --no-fund --no-audit', { cwd: dest, stdio: 'inherit', shell: true });
    if (r.status !== 0) {
      console.error(`\nThe install didn't finish. Run \`npm install\` inside ${where}, then carry on below.`);
    }
  }
  console.log(`\nBread Line is set up in ${where}.`);

  // Start the setup for them: pick an agent (asking only when there's a real choice), then open it in the new
  // folder with the setup prompt already entered, so the whole install is one command.
  const found = AGENTS.filter((a) => onPath(a.bin));
  let agent = wanted ? AGENTS.find((a) => a.id === wanted) : null;
  if (wanted && !agent) console.error(`Unknown agent "${wanted}". Use claude or codex.`);
  if (!agent && !noLaunch && !noInstall && found.length && process.stdin.isTTY && process.stdout.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      if (found.length === 1) {
        const yes = (await rl.question(`\nStart the setup now in ${found[0].label}? Have your resume handy. [Y/n] `)).trim().toLowerCase();
        if (yes === '' || yes === 'y' || yes === 'yes') agent = found[0];
      } else {
        console.log('\nStart the setup now? Have your resume handy.');
        found.forEach((a, i) => console.log(`  ${i + 1}) ${a.label}`));
        const pick = (await rl.question('Pick one, or press Enter to skip: ')).trim();
        agent = found[Number(pick) - 1] ?? found.find((a) => a.id === pick.toLowerCase()) ?? null;
      }
    } finally { rl.close(); }
  }
  if (agent && !onPath(agent.bin)) {
    console.error(`${agent.label} isn't installed here (no \`${agent.bin}\` on your PATH), so open it yourself below.`);
    agent = null;
  }
  if (agent && !noLaunch) {
    console.log(`\nOpening ${agent.label}...\n`);
    const r = spawnSync(`${agent.bin} "${SETUP_PROMPT}"`, { cwd: dest, stdio: 'inherit', shell: true });
    process.exit(r.status ?? 0);
  }
  const cdTarget = where.includes(' ') ? `"${where}"` : where;
  console.log(`
To start the setup yourself:
  cd ${cdTarget}
  claude     (or: codex)

Then say: "${SETUP_PROMPT}". Have your resume handy as a PDF, Word or text file.`);
}

