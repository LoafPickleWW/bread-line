// Mark the jobs in data/new-jobs.json as seen, once they're loaded into the tracker: `npm run radar:commit`
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dataDir } from '../src/profile.js';

const jobs = JSON.parse(await readFile(new URL('new-jobs.json', dataDir), 'utf8'));
const seenPath = new URL('seen.json', dataDir);
const seen = existsSync(seenPath) ? JSON.parse(await readFile(seenPath, 'utf8')) : { ids: {}, keys: {} };
const dupKey = (j) => `${j.company}|${j.title}`.toLowerCase().replace(/[^a-z0-9|]+/g, ' ').trim();

const today = new Date().toLocaleDateString('en-CA');
for (const j of jobs) {
  seen.ids[j.id] ??= today;
  seen.keys[dupKey(j)] ??= today;
}
await writeFile(seenPath, JSON.stringify(seen) + '\n');
// LinkedIn alert jobs are handled now; start the next run with an empty inbox.
await writeFile(new URL('linkedin-inbox.json', dataDir), '[]\n');
console.log(`Marked ${jobs.length} jobs as seen.`);
