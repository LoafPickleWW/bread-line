// Condense data/new-jobs.json into what scoring needs: `npm run digest`
// For each job: header facts, plus the posting lines that carry requirements and domain signals.
// Writes data/digest.txt.
import { readFile, writeFile } from 'node:fs/promises';
import { dataDir, DATA_REL } from '../src/profile.js';
import { DIGEST_SIGNAL as SIGNAL } from '../src/config.js';

const jobs = JSON.parse(await readFile(new URL('new-jobs.json', dataDir), 'utf8'));

const out = jobs.map((j, i) => {
  const lines = j.description
    .split(/\n|(?<=[.!?])\s+(?=[A-Z•])/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 25 && l.length < 400 && SIGNAL.test(l));
  const picked = [];
  let len = 0;
  for (const l of lines) {
    if (len + l.length > 1100) break;
    picked.push('- ' + l);
    len += l.length;
  }
  return [
    `#${i + 1} ${j.title} | ${j.company} [${j.roleCategory}] | ${j.location} | pay ${j.salaryText ?? 'n/a'} | id=${j.id}`,
    ...picked,
  ].join('\n');
});
await writeFile(new URL('digest.txt', dataDir), out.join('\n\n') + '\n');
console.log(`${jobs.length} jobs -> ${DATA_REL}digest.txt (${out.join('').length} chars)`);
