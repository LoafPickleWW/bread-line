// Re-fetch full posting text for jobs already in the tracker: `node scripts/backfill-descriptions.js <version>`
// Reads job ids from data/scores.json, pulls just their boards, and writes data/tracker/desc-updates.json:
// batches of `update` writes that add a `description` field (pinned to <version>, the docs' current version).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fetchBoard } from '../src/sources/ats.js';
import { BOARDS } from '../src/sources/boards.js';
import { root, dataDir, DATA_REL } from '../src/profile.js';
import { positionals, abs } from '../src/workspace.js';

const version = Number(positionals()[0] ?? 2);
const scores = JSON.parse(await readFile(new URL('scores.json', dataDir), 'utf8'));
const ids = Object.keys(scores);
const docId = (id) => id.replace(/[^A-Za-z0-9_\-.~:@+]/g, '_').slice(0, 200);

// Which feeds to pull: "ats:slug" for board jobs, board name for aggregator jobs.
const boards = new Set(ids.map((id) => (id.startsWith('hn:') ? 'hackernews' : id.split(':').slice(0, 2).join(':'))));
const found = new Map();
for (const b of boards) {
  const jobs = BOARDS[b] ? await BOARDS[b]() : await fetchBoard({ ats: b.split(':')[0], slug: b.split(':')[1], name: '', category: '' });
  for (const j of jobs) if (scores[j.id]) found.set(j.id, j.description);
}

await mkdir(new URL('tracker/desc/', dataDir), { recursive: true });
const writes = [];
for (const id of ids) {
  const d = found.get(id);
  if (!d) continue;
  const file = `${DATA_REL}tracker/desc/${docId(id).replace(/:/g, '__')}.json`;
  await writeFile(new URL(file, root), JSON.stringify({ description: d.slice(0, 6000) }) + '\n');
  writes.push({ op: 'update', collection: 'jobs', doc_id: docId(id), file_path: abs(file), if_version: version });
}
const batches = [];
for (let i = 0; i < writes.length; i += 50) batches.push(writes.slice(i, i + 50));
await writeFile(new URL('tracker/desc-updates.json', dataDir), JSON.stringify(batches, null, 2) + '\n');
const missing = ids.filter((id) => !found.has(id));
console.log(`${writes.length}/${ids.length} descriptions found${missing.length ? '; missing (posting closed?): ' + missing.join(', ') : ''}`);
