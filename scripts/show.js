// Print data/new-jobs.json as a compact table: `npm run show`
import { readFile } from 'node:fs/promises';
import { dataDir } from '../src/profile.js';

const jobs = JSON.parse(await readFile(new URL('new-jobs.json', dataDir), 'utf8'));
const col = (s, n) => String(s ?? '').slice(0, n).padEnd(n);
for (const j of jobs) {
  console.log(
    [col(j.roleCategory, 7), col(j.source, 10), col(j.company, 18), col(j.title, 58), col(j.location, 40), j.salaryText ?? ''].join(' ')
  );
}
console.log(`\n${jobs.length} jobs`);
