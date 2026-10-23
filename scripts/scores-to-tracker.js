// Score patches for jobs already in the tracker: `node scripts/scores-to-tracker.js [version]`
// Writes data/tracker/score-updates.json: batches of `update` writes that merge only score/reason/gaps/headline,
// so status and notes set on the page are untouched. [version] is the docs' current version (default 1).
// Run `npm run tracker:prep` first so data/tracker/meta/latestRun.json carries the new top 3.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { root, dataDir, DATA_REL } from '../src/profile.js';
import { positionals } from '../src/workspace.js';

const version = Number(positionals()[0] ?? 1);
const jobs = JSON.parse(await readFile(new URL('new-jobs.json', dataDir), 'utf8'));
const scores = JSON.parse(await readFile(new URL('scores.json', dataDir), 'utf8'));
const docId = (id) => id.replace(/[^A-Za-z0-9_\-.~:@+]/g, '_').slice(0, 200);

await mkdir(new URL('tracker/scores/', dataDir), { recursive: true });
const writes = [];
for (const j of jobs) {
  const s = scores[j.id];
  if (!s) continue;
  const id = docId(j.id);
  const file = `${DATA_REL}tracker/scores/${id.replace(/:/g, '__')}.json`;
  await writeFile(new URL(file, root), JSON.stringify({ score: s.score, reason: s.reason, gaps: s.gaps, headline: s.headline }) + '\n');
  writes.push({ op: 'update', collection: 'jobs', doc_id: id, file_path: file, if_version: version });
}
writes.push({ op: 'set', collection: 'meta', doc_id: 'latestRun', file_path: `${DATA_REL}tracker/meta/latestRun.json`, if_version: version });

const batches = [];
for (let i = 0; i < writes.length; i += 50) batches.push(writes.slice(i, i + 50));
await writeFile(new URL('tracker/score-updates.json', dataDir), JSON.stringify(batches, null, 2) + '\n');
console.log(`${writes.length} writes in ${batches.length} batch(es) -> ${DATA_REL}tracker/score-updates.json`);
