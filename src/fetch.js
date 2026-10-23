// Daily run, step 1: pull postings from every source, filter, drop anything seen before,
// and write the new matches to the profile's data/new-jobs.json for Claude to score.
//
//   npm run radar        normal run (marks jobs as seen)
//   npm run radar:dry    same, but doesn't touch the seen list, so you can re-run freely
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fetchBoard } from './sources/ats.js';
import { BOARDS } from './sources/boards.js';
import { evaluate, salaryRange, formatSalary } from './filter.js';
import { pool } from './http.js';
import { profileDir, dataDir, DATA_REL, PROFILE_NAME } from './profile.js';

const DRY = process.argv.includes('--dry');
await mkdir(new URL('runs/', dataDir), { recursive: true });

const readJson = async (url, fallback) => (existsSync(url) ? JSON.parse(await readFile(url, 'utf8')) : fallback);
const { companies } = await readJson(new URL('companies.json', profileDir), { companies: [] });
const seenPath = new URL('seen.json', dataDir);
const seen = await readJson(seenPath, { ids: {}, keys: {} });

const started = Date.now();
const errors = [];
const perSource = {};

// ---- Fetch ----
const tasks = [
  ...companies.map((c) => ({ label: `${c.ats}/${c.slug}`, source: c.ats, run: () => fetchBoard(c) })),
  ...Object.entries(BOARDS).map(([name, fn]) => ({ label: name, source: name, run: fn })),
];
const results = await pool(tasks, 10, async (t) => {
  try {
    const jobs = await t.run();
    perSource[t.source] = (perSource[t.source] ?? 0) + jobs.length;
    return jobs;
  } catch (e) {
    errors.push(`${t.label}: ${e.message}`);
    return [];
  }
});
const all = results.flat();

// ---- Filter + dedupe ----
// Same role reposted under a new ID (or listed on two boards) shares this key.
const dupKey = (j) => `${j.company}|${j.title}`.toLowerCase().replace(/[^a-z0-9|]+/g, ' ').trim();

const dropped = {};
const fresh = [];
const batchKeys = new Set();
for (const job of all) {
  const v = evaluate(job);
  if (!v.keep) {
    dropped[v.reason] = (dropped[v.reason] ?? 0) + 1;
    continue;
  }
  const key = dupKey(job);
  if (seen.ids[job.id] || seen.keys[key] || batchKeys.has(key)) {
    dropped['already seen'] = (dropped['already seen'] ?? 0) + 1;
    continue;
  }
  batchKeys.add(key);
  fresh.push({
    id: job.id,
    source: job.source,
    company: job.company,
    companyCategory: job.companyCategory,
    title: job.title,
    roleCategory: v.category,
    location: job.location,
    salaryMaxUsd: v.salaryMax ?? null,
    salaryText: salaryLabel(job),
    postedAt: job.postedAt,
    url: job.url,
    // Enough for scoring without blowing up the file.
    description: job.description.slice(0, 6000),
  });
}

function salaryLabel(job) {
  const s = job.salary;
  if (s?.text) return formatSalary(salaryRange(job)) || s.text;
  if (s?.max && s.currency && s.currency !== 'USD') {
    const k = (n) => (n ? `${Math.round(n / 1000)}k` : '?');
    return `${k(s.min)}–${k(s.max)} ${s.currency}`;
  }
  // Feed fields, or a range found in the posting text (Greenhouse and Lever usually put it there).
  return formatSalary(salaryRange(job));
}

// ---- Write ----
const today = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
fresh.sort((a, b) => a.roleCategory.localeCompare(b.roleCategory) || a.company.localeCompare(b.company));
await writeFile(new URL('new-jobs.json', dataDir), JSON.stringify(fresh, null, 2) + '\n');

const summary = {
  date: today,
  finishedAt: new Date().toISOString(),
  seconds: Math.round((Date.now() - started) / 1000),
  dry: DRY,
  fetched: all.length,
  newMatches: fresh.length,
  byCategory: Object.fromEntries(
    Object.entries(Object.groupBy(fresh, (j) => j.roleCategory)).map(([k, v]) => [k, v.length])
  ),
  perSource,
  dropped,
  errors,
};
// Dry runs leave the day's run record alone.
if (!DRY) await writeFile(new URL(`runs/${today}.json`, dataDir), JSON.stringify({ ...summary, jobs: fresh }, null, 2) + '\n');

if (!DRY) {
  // Non-matches are marked now so they aren't re-evaluated forever. The new matches are marked only by
  // `npm run radar:commit`, after they're safely in the tracker, so a failed run just finds them again next time.
  const freshIds = new Set(fresh.map((j) => j.id));
  for (const j of all) if (!freshIds.has(j.id)) seen.ids[j.id] ??= today;
  await writeFile(seenPath, JSON.stringify(seen) + '\n');
}

console.log(`Fetched ${all.length} postings from ${tasks.length - errors.length}/${tasks.length} sources in ${summary.seconds}s`);
console.log(`New matches: ${fresh.length}`, summary.byCategory);
console.log('Dropped:', dropped);
if (errors.length) console.log(`Errors (${errors.length}):\n  ` + errors.join('\n  '));
console.log(`${DRY ? '[dry run] seen list unchanged. ' : ''}Wrote ${DATA_REL}new-jobs.json (profile: ${PROFILE_NAME})`);
