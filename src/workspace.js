// Two folders matter. PKG is where the engine lives: this repo when developing, or node_modules/bread-line once
// installed from npm. The workspace (`root`) is the person's own folder, the one holding profiles/. It's
// $BREADLINE_HOME, else the nearest folder at or above the current one that has a profiles/ folder, else the
// current folder (for `init` and first runs).
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

export const PKG = new URL('../', import.meta.url);

function findWorkspace() {
  if (process.env.BREADLINE_HOME) return resolve(process.env.BREADLINE_HOME);
  let dir = process.cwd();
  for (;;) {
    if (existsSync(resolve(dir, 'profiles'))) return dir;
    const up = dirname(dir);
    if (up === dir) return process.cwd();
    dir = up;
  }
}
export const root = pathToFileURL(findWorkspace() + '/');

// Positional arguments, skipping flags and the values of flags that take one:
// `save-scores --profile sam pass.json` and `save-scores pass.json --profile sam` both give ['pass.json'].
const VALUED = new Set(['--profile', '--meta-version']);
export function positionals() {
  const out = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (VALUED.has(args[i])) i++;
    else if (!args[i].startsWith('--')) out.push(args[i]);
  }
  return out;
}
