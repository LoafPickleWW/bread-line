// Turn data/new-jobs.json into tracker database documents: `npm run tracker:prep`
//
// Writes data/tracker/jobs/<docId>.json (one per job), data/tracker/meta/latestRun.json (the digest),
// and data/tracker/batches.json: ready-made write lists of at most 50 entries for Claude to load into
// the tracker page's database. Scores, reasons and gaps get merged in by the scoring step later.
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { root, dataDir, DATA_REL } from '../src/profile.js';
import { ROLE_CATEGORIES } from '../src/config.js';
import { abs } from '../src/workspace.js';

const outDir = new URL('tracker/', dataDir);
const jobs = JSON.parse(await readFile(new URL('new-jobs.json', dataDir), 'utf8'));
const scoresPath = new URL('scores.json', dataDir);
const scores = existsSync(scoresPath) ? JSON.parse(await readFile(scoresPath, 'utf8')) : {};

// Clear the last run's files but never remove folders: this project lives in OneDrive, which can hold a
// folder open and make rmdir fail with EPERM. Stale files are harmless anyway, since batches.json lists
// exactly which files to send.
for (const sub of ['jobs/', 'meta/']) {
  const dir = new URL(sub, outDir);
  await mkdir(dir, { recursive: true });
  for (const f of await readdir(dir)) await unlink(new URL(encodeURIComponent(f), dir)).catch(() => {});
}

// Database ids allow letters, digits and _ - . ~ : @ + only.
export const docId = (id) => id.replace(/[^A-Za-z0-9_\-.~:@+]/g, '_').slice(0, 200);

const today = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
const writes = [];
for (const j of jobs) {
  const id = docId(j.id);
  const s = scores[j.id] ?? {};
  const doc = {
    title: j.title,
    company: j.company,
    companyCategory: j.companyCategory ?? null,
    roleCategory: j.roleCategory,
    location: j.location,
    salaryText: j.salaryText ?? null,
    salaryMaxUsd: j.salaryMaxUsd ?? null,
    postedAt: j.postedAt ?? null,
    foundAt: today,
    url: j.url,
    source: j.source,
    snippet: j.description.replace(/\s+/g, ' ').slice(0, 600),
    description: j.description.slice(0, 6000), // for cover letters
    score: s.score ?? null,
    reason: s.reason ?? null,
    gaps: s.gaps ?? null,
    headline: s.headline ?? null,
    summary: s.summary ?? null,
    status: 'new',
    notes: '',
  };
  const file = `${DATA_REL}tracker/jobs/${id.replace(/:/g, '__')}.json`; // Windows filenames can't hold ':'
  await writeFile(new URL(file, root), JSON.stringify(doc, null, 2) + '\n');
  writes.push({ op: 'set', collection: 'jobs', doc_id: id, file_path: abs(file) });
}

const scored = jobs.filter((j) => scores[j.id]?.score != null).sort((a, b) => scores[b.id].score - scores[a.id].score);
const meta = {
  date: today,
  newMatches: jobs.length,
  // The page's role filter chips, in the profile's order.
  categories: ROLE_CATEGORIES.map((c) => [c.key, c.chip ?? c.label]),
  byCategory: Object.fromEntries(Object.entries(Object.groupBy(jobs, (j) => j.roleCategory)).map(([k, v]) => [k, v.length])),
  top: scored.slice(0, 3).map((j) => ({ id: docId(j.id), title: j.title, company: j.company, score: scores[j.id].score })),
};
await writeFile(new URL('meta/latestRun.json', outDir), JSON.stringify(meta, null, 2) + '\n');
// meta/latestRun already exists after the first run, so its write must carry the version just read:
// `node scripts/to-tracker.js --meta-version 3`
const mv = process.argv.indexOf('--meta-version');
const metaVersion = mv > -1 ? Number(process.argv[mv + 1]) : null;
writes.push({
  op: 'set',
  collection: 'meta',
  doc_id: 'latestRun',
  file_path: abs(`${DATA_REL}tracker/meta/latestRun.json`),
  ...(metaVersion ? { if_version: metaVersion } : {}),
});

const batches = [];
for (let i = 0; i < writes.length; i += 50) batches.push(writes.slice(i, i + 50));
await writeFile(new URL('batches.json', outDir), JSON.stringify(batches, null, 2) + '\n');
console.log(`${jobs.length} job docs + digest in ${batches.length} batch(es) -> ${DATA_REL}tracker/batches.json`);
