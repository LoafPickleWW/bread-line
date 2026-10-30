#!/usr/bin/env node
// `npm create bread-line@latest [folder]` lands here. All the work is the engine's own `init`, so this just finds the
// installed @loafpickleww/bread-line and runs its `bread-line` command with `init` and the same arguments. The
// command's path comes from the engine's own package.json, so the engine can move its files without breaking this.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const manifest = require.resolve('@loafpickleww/bread-line/package.json');
const bin = JSON.parse(readFileSync(manifest, 'utf8')).bin;
const cli = resolve(dirname(manifest), typeof bin === 'string' ? bin : bin['bread-line']);
const r = spawnSync(process.execPath, [cli, 'init', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
