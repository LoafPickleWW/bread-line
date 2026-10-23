// Merge a scoring pass into data/scores.json: `node scripts/save-scores.js <file>`
// <file> is a JSON array of [score, reason, gaps, headline, summary], one per job, in data/new-jobs.json order.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dataDir } from '../src/profile.js';
import { positionals } from '../src/workspace.js';

const jobs = JSON.parse(await readFile(new URL('new-jobs.json', dataDir), 'utf8'));
const [passFile] = positionals();
if (!passFile) throw new Error('Usage: save-scores <pass.json> [--profile <name>]');
const rows = JSON.parse(await readFile(passFile, 'utf8'));
if (rows.length !== jobs.length) throw new Error(`Got ${rows.length} scores for ${jobs.length} jobs`);

const path = new URL('scores.json', dataDir);
const scores = existsSync(path) ? JSON.parse(await readFile(path, 'utf8')) : {};
jobs.forEach((j, i) => {
  const [score, reason, gaps, headline, summary] = rows[i];
  scores[j.id] = { score, reason, gaps: gaps || null, headline, summary: summary || null, title: j.title, company: j.company };
});
await writeFile(path, JSON.stringify(scores, null, 2) + '\n');

const bands = { '85+': 0, '70–84': 0, '50–69': 0, '<50': 0 };
for (const j of jobs) {
  const s = scores[j.id].score;
  bands[s >= 85 ? '85+' : s >= 70 ? '70–84' : s >= 50 ? '50–69' : '<50']++;
}
console.log(bands);
jobs
  .map((j) => scores[j.id])
  .sort((a, b) => b.score - a.score)
  .slice(0, 10)
  .forEach((s) => console.log(s.score, s.title, '|', s.company));
