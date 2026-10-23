#!/usr/bin/env node
// `npm create bread-line@latest [folder]` lands here. All the work is the engine's own `init`, so this just finds the
// installed @loafpickleww/bread-line and runs `bread-line init` with the same arguments.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const engine = dirname(require.resolve('@loafpickleww/bread-line/package.json'));
const r = spawnSync(process.execPath, [resolve(engine, 'bin/bread-line.js'), 'init', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
