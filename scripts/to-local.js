// Offline tracker, for agents that can't publish to claude.ai: `npm run tracker:local`
// Run `npm run tracker:prep` first. Adds this run's job docs to data/local-jobs.json (every job ever loaded),
// then writes bread-line.html in the profile: the tracker page with all of them embedded. Status, notes and
// the resume are saved in the browser, on top of the embedded data, so rebuilding never loses them.
// Like the claude.ai load, a job already in the file only gets its score fields refreshed.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { PKG, profileDir, dataDir, PROFILE_NAME, PROFILE_REL } from '../src/profile.js';

const storePath = new URL('local-jobs.json', dataDir);
const store = existsSync(storePath) ? JSON.parse(await readFile(storePath, 'utf8')) : {};
const jobsDir = new URL('tracker/jobs/', dataDir);
const SCORE_FIELDS = ['score', 'reason', 'gaps', 'headline', 'summary'];

let added = 0;
for (const f of existsSync(jobsDir) ? await readdir(jobsDir) : []) {
  if (!f.endsWith('.json')) continue;
  const doc = JSON.parse(await readFile(new URL(encodeURIComponent(f), jobsDir), 'utf8'));
  const path = 'jobs/' + f.slice(0, -5).replace(/__/g, ':');
  if (store[path]) for (const k of SCORE_FIELDS) store[path][k] = doc[k] ?? store[path][k];
  else { store[path] = doc; added++; }
}
const metaPath = new URL('tracker/meta/latestRun.json', dataDir);
if (existsSync(metaPath)) store['meta/latestRun'] = JSON.parse(await readFile(metaPath, 'utf8'));
await writeFile(storePath, JSON.stringify(store) + '\n');

const page = await readFile(new URL('tracker/index.html', PKG), 'utf8');
// Escape "<" so posting text can never close the script tag.
const data = JSON.stringify({ profile: PROFILE_NAME, docs: store }).replace(/</g, '\\u003c');
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<script>window.BREADLINE_LOCAL = ${data};</script>
</head><body>
${page}
</body></html>\n`;
await writeFile(new URL('bread-line.html', profileDir), html);
const total = Object.keys(store).filter((p) => p.startsWith('jobs/')).length;
console.log(`${added} new, ${total} jobs total -> ${PROFILE_REL}bread-line.html (open it in a browser)`);
