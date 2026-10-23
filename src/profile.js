// Which person's settings and data this run uses. Everything personal lives in profiles/<name>/:
//
//   profile.json                tracker URL, resume fallback, salary floor, which boards to pull
//   filters.js                  role categories, off-limits topics, title exclusions (see src/config.js)
//   scoring.md                  the scoring rubric Claude follows
//   companies.candidates.json   the watchlist; `npm run discover` writes companies.json from it
//   data/                       seen list, runs, scores and tracker batches
//
// The profile is `--profile <name>` on the command line (`npm run radar -- --profile sam`), else $BREADLINE_PROFILE,
// else the name in profiles/active.txt.
import { readFileSync, existsSync } from 'node:fs';
import { root } from './workspace.js';

export { root, PKG } from './workspace.js';
const flag = process.argv.indexOf('--profile');
const activeFile = new URL('profiles/active.txt', root);
export const PROFILE_NAME = (
  (flag > -1 && process.argv[flag + 1]) ||
  process.env.BREADLINE_PROFILE ||
  (existsSync(activeFile) ? readFileSync(activeFile, 'utf8') : '')
).trim();
export const profileDir = new URL(`profiles/${PROFILE_NAME}/`, root);
if (!PROFILE_NAME || !existsSync(new URL('profile.json', profileDir))) {
  console.error(
    PROFILE_NAME
      ? `No profile at profiles/${PROFILE_NAME}/ in ${decodeURIComponent(root.pathname)}. Create one with: npm run profile:new -- ${PROFILE_NAME}`
      : 'No profile chosen. Pass --profile <name>, or put a profile name in profiles/active.txt.'
  );
  process.exit(1);
}
export const dataDir = new URL('data/', profileDir);
// The same folders relative to the workspace, for log lines and the file paths in tracker batches.
export const PROFILE_REL = `profiles/${PROFILE_NAME}/`;
export const DATA_REL = `${PROFILE_REL}data/`;

export const profile = JSON.parse(readFileSync(new URL('profile.json', profileDir), 'utf8'));
