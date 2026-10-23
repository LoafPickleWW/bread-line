// Start a new profile from profiles/_template: `npm run profile:new -- <name>`
// <name> is lowercase letters, digits and dashes. Refuses to touch a profile that already exists.
import { readdir, copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { root, PKG, positionals } from '../src/workspace.js';

const [name] = positionals();
if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(name ?? '')) {
  console.error('Usage: npm run profile:new -- <name>   (lowercase letters, digits and dashes)');
  process.exit(1);
}
// The workspace's own template if it has one (it may be customized), else the package's.
const local = new URL('profiles/_template/', root);
const template = existsSync(local) ? local : new URL('profiles/_template/', PKG);
const dest = new URL(`profiles/${name}/`, root);
if (existsSync(dest)) {
  console.error(`profiles/${name} already exists; edit it instead.`);
  process.exit(1);
}

await mkdir(new URL('data/', dest), { recursive: true });
const files = await readdir(template);
for (const f of files) await copyFile(new URL(f, template), new URL(f, dest));
console.log(`Created profiles/${name} (${files.join(', ')}). Run any script with --profile ${name}.`);
