// Sanity-check a profile before its first run: `npm run profile:check -- --profile <name>`
// Loads its settings and filters the way a run would, and lists anything still unfinished.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { profile, profileDir, PROFILE_NAME, PROFILE_REL } from '../src/profile.js';
import { ROLE_CATEGORIES, OFF_LIMITS, SALARY_FLOOR_USD } from '../src/config.js';
import { ALL_BOARDS } from '../src/sources/boards.js';

const problems = [];
const text = async (f) => (existsSync(new URL(f, profileDir)) ? readFile(new URL(f, profileDir), 'utf8') : null);

if (!profile.name || profile.name === 'Your Name') problems.push('profile.json: set "name"');
const local = profile.tracker === 'local';
if (local && !profile.resumeFallback) problems.push('profile.json: a local tracker needs "resumeFallback" (scoring can\'t read the page\'s resume)');
if (local && profile.resumeFallback && !existsSync(profile.resumeFallback)) problems.push(`profile.json: resumeFallback not found: ${profile.resumeFallback}`);
if (!local && !profile.trackerUrl) problems.push('profile.json: no "trackerUrl" yet (publish the tracker page, or set "tracker": "local")');
for (const b of profile.boards ?? []) if (!ALL_BOARDS[b]) problems.push(`profile.json: unknown board "${b}" (have: ${Object.keys(ALL_BOARDS).join(', ')})`);
if (profile.boards?.includes('linkedin') && !profile.linkedin?.gmail) problems.push('profile.json: "linkedin" board is on but linkedin.gmail is not set');
if (!ROLE_CATEGORIES.length) problems.push('filters.js: no ROLE_CATEGORIES');
for (const c of ROLE_CATEGORIES) if (!c.key || !c.label || !(c.title instanceof RegExp)) problems.push(`filters.js: category ${c.key ?? '?'} needs key, label and a title regex`);

const scoring = await text('scoring.md');
if (!scoring) problems.push('scoring.md is missing');
else for (const m of scoring.match(/\{\{[A-Z_]+/g) ?? []) problems.push(`scoring.md: fill in ${m.slice(2)}`);

const companies = JSON.parse((await text('companies.json')) ?? '{"companies":[],"unresolved":[]}');
if (!companies.companies.length) problems.push('companies.json: no boards found yet (run discover)');

console.log(`Profile ${PROFILE_NAME} (${PROFILE_REL}): ${profile.name}`);
console.log(`  roles:      ${ROLE_CATEGORIES.map((c) => c.key).join(', ') || 'none'}`);
console.log(`  off-limits: ${[OFF_LIMITS.companies && 'companies', OFF_LIMITS.title && 'titles', OFF_LIMITS.text && 'text'].filter(Boolean).join(', ') || 'nothing'}`);
console.log(`  pay floor:  ${SALARY_FLOOR_USD ? '$' + SALARY_FLOOR_USD.toLocaleString() : 'off'}`);
console.log(`  boards:     ${companies.companies.length} company boards (${companies.unresolved?.length ?? 0} unresolved), plus ${(profile.boards ?? Object.keys(ALL_BOARDS)).join(', ')}`);
console.log(`  tracker:    ${local ? `local file (${PROFILE_REL}bread-line.html)` : profile.trackerUrl ?? 'not published'}`);
console.log(`  schedule:   ${profile.schedule?.taskId ? `${profile.schedule.taskId} (${profile.schedule.cron})` : 'none'}`);
console.log(problems.length ? `\nTo do (${problems.length}):\n  - ${problems.join('\n  - ')}` : '\nReady.');
process.exitCode = problems.length ? 1 : 0;
