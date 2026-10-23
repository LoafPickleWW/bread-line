// Probe each candidate company on Greenhouse, Lever and Ashby; write the boards that exist to companies.json.
// Companies already in companies.json are kept as-is (so hand edits survive). Use --all to re-probe everything.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { ATS_NAMES, probe } from '../src/sources/ats.js';
import { pool } from '../src/http.js';
import { profileDir, PROFILE_REL } from '../src/profile.js';

const candidates = JSON.parse(await readFile(new URL('companies.candidates.json', profileDir), 'utf8'));
const outPath = new URL('companies.json', profileDir);
const existing = existsSync(outPath) ? JSON.parse(await readFile(outPath, 'utf8')) : { companies: [], unresolved: [] };
const known = new Map(existing.companies.map((c) => [c.name, c]));
const reprobeAll = process.argv.includes('--all');

const todo = [];
for (const [category, rows] of Object.entries(candidates)) {
  if (category.startsWith('_')) continue;
  for (const [name, ...slugs] of rows) {
    if (!reprobeAll && known.has(name)) continue;
    todo.push({ name, category, slugs });
  }
}

console.log(`Probing ${todo.length} companies across ${ATS_NAMES.join(', ')}...`);
const found = [];
const unresolved = [];
await pool(todo, 8, async (c) => {
  let best = null;
  for (const slug of c.slugs) {
    const counts = await Promise.all(ATS_NAMES.map((ats) => probe(ats, slug)));
    counts.forEach((n, i) => {
      // Prefer the board with the most postings (some companies leave a stale empty board behind).
      if (n != null && (!best || n > best.jobs)) best = { ats: ATS_NAMES[i], slug, jobs: n };
    });
    if (best?.jobs > 0) break;
  }
  if (best) {
    found.push({ name: c.name, category: c.category, ats: best.ats, slug: best.slug });
    console.log(`  ok   ${c.name.padEnd(32)} ${best.ats}/${best.slug} (${best.jobs} jobs)`);
  } else {
    unresolved.push({ name: c.name, category: c.category, tried: c.slugs });
    console.log(`  --   ${c.name.padEnd(32)} not found (${c.slugs.join(', ')})`);
  }
});

const companies = [...(reprobeAll ? [] : existing.companies), ...found].sort(
  (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
);
await writeFile(outPath, JSON.stringify({ companies, unresolved }, null, 2) + '\n');
console.log(`\n${companies.length} companies with a public board, ${unresolved.length} unresolved -> ${PROFILE_REL}companies.json`);
