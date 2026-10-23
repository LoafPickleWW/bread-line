// Check a release and build the landing page's kit: `npm run kit`
// Fails if the engine, the installer, the Claude Code plugin and the Codex plugin aren't all at one version, or if the
// setup skills don't pin their bootstrap command to it. Then writes site/bread-line-kit.json: the shareable files as
// { files: { path: text } }, which the claude.ai landing page zips in the browser for its download button. That file is
// generated and not committed. Only the shared parts go in: never a profile other than _template.
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const INCLUDE = ['bin', 'src', 'scripts', 'tracker', 'profiles/_template', '.claude/skills', '.agents/skills',
  'README.md', 'RUNBOOK.md', 'AGENTS.md', 'package.json', '.gitignore', 'LICENSE'];

const readJson = async (rel) => JSON.parse(await readFile(new URL(rel, root), 'utf8'));
const read = (rel) => readFile(new URL(rel, root), 'utf8');

// ---- Release check ----
const engine = await readJson('package.json');
const installer = await readJson('create-bread-line/package.json');
const versions = {
  engine: engine.version,
  installer: installer.version,
  claudePlugin: (await readJson('.claude-plugin/plugin.json')).version,
  codexPlugin: (await readJson('plugins/bread-line/plugin.json')).version,
};
const problems = [];
if (new Set(Object.values(versions)).size !== 1) problems.push(`versions differ: ${JSON.stringify(versions)}`);
if (installer.dependencies['@loafpickleww/bread-line'] !== '^' + engine.version) problems.push(`installer depends on ${installer.dependencies['@loafpickleww/bread-line']}, not ^${engine.version}`);
for (const skill of ['.claude/skills/bread-line-setup/SKILL.md', '.agents/skills/bread-line-setup/SKILL.md']) {
  if (!(await read(skill)).includes(`npm create bread-line@${engine.version}`)) problems.push(`${skill} doesn't pin npm create bread-line@${engine.version}`);
}
if ((await read('plugins/bread-line/skills/bread-line-setup/SKILL.md')) !== (await read('.agents/skills/bread-line-setup/SKILL.md'))) problems.push('plugins/bread-line is out of date: run npm run plugins:sync');
if (problems.length) {
  throw new Error('Release check failed:\n  - ' + problems.join('\n  - ') + '\nBump package.json, create-bread-line/package.json (and its dependency), .claude-plugin/plugin.json and the skills\' pinned command together, then run npm run plugins:sync.');
}

// ---- Kit ----
async function walk(rel) {
  const url = new URL(rel, root);
  try {
    const entries = await readdir(url, { withFileTypes: true });
    return (await Promise.all(entries.map((e) => walk(`${rel}/${e.name}`)))).flat();
  } catch (e) {
    if (e.code === 'ENOTDIR') return [rel];
    throw e;
  }
}
const paths = (await Promise.all(INCLUDE.map(walk))).flat().sort();
const files = {};
for (const p of paths) files[`bread-line/${p}`] = await read(p);

await mkdir(new URL('site/', root), { recursive: true });
await writeFile(new URL('site/bread-line-kit.json', root), JSON.stringify({ version: engine.version, files }));
console.log(`Release ${engine.version} checks out. ${paths.length} files -> site/bread-line-kit.json`);
