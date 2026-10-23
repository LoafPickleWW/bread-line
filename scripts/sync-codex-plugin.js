// Build the Codex plugin (plugins/bread-line) from the Codex setup skill: `npm run plugins:sync`
// `npm run kit` runs this first. The plugin's skill is a copy of .agents/skills/bread-line-setup, its manifest takes
// the engine's version, and everything under plugins/bread-line is generated, so edit the sources, not the copy.
// Files are overwritten in place and never deleted, because this project may live in a synced folder where removing
// folders fails.
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const out = new URL('plugins/bread-line/', root);
const { version } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));

const manifest = {
  $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
  name: 'bread-line',
  version,
  description: 'A daily remote job radar scored against your resume. The setup skill reads your resume, builds your filters and company watchlist, and schedules a weekday run.',
  author: { name: 'LoafPickle Worldwide LLC', url: 'https://loafpickle.com' },
  homepage: 'https://jobs.loafpickle.com',
  repository: 'https://github.com/LoafPickleWW/bread-line',
  license: 'MIT',
  keywords: ['jobs', 'job-search', 'resume', 'remote-jobs', 'career', 'bread-line'],
  extensions: {
    'com.openai': {
      interface: {
        displayName: 'Bread Line',
        shortDescription: 'A daily remote job radar scored against your resume',
        longDescription: 'Bread Line reads company job boards every weekday, filters them to the roles you want, and scores the rest against your resume. The setup skill interviews you, builds your profile, and schedules the run.',
        developerName: 'LoafPickle Worldwide LLC',
        category: 'Productivity',
        capabilities: ['Read', 'Write'],
        websiteURL: 'https://jobs.loafpickle.com',
        privacyPolicyURL: 'https://jobs.loafpickle.com/privacy.html',
        defaultPrompt: ['Set up Bread Line for me'],
        brandColor: '#E3141B',
      },
    },
  },
};

const readme = `# Bread Line for Codex

A daily remote job radar scored against your resume. Every weekday it reads 150+ company job boards, filters them to the roles you want, and Codex scores what's left against your resume.

Install this plugin, then ask Codex to "set up Bread Line for me" (or type \`$\` and pick bread-line-setup). The setup skill reads your resume, asks about ten questions, builds your filters and company watchlist, tests them on today's real postings, and schedules your weekday run. If you aren't in a Bread Line folder it makes one at \`~/bread-line\` with \`npm create bread-line\`.

Bread Line only reads public job boards. Your resume and job history stay in that folder on your computer. It never applies for jobs or messages anyone.

Source, docs and privacy: https://github.com/LoafPickleWW/bread-line and https://jobs.loafpickle.com

MIT License. Made by LoafPickle Worldwide LLC.
`;

await mkdir(new URL('skills/', out), { recursive: true });
await cp(new URL('.agents/skills/bread-line-setup/', root), new URL('skills/bread-line-setup/', out), { recursive: true, force: true });
await writeFile(new URL('plugin.json', out), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(new URL('README.md', out), readme);
await cp(new URL('LICENSE', root), new URL('LICENSE', out), { force: true });
console.log(`Codex plugin ${version} -> plugins/bread-line`);
