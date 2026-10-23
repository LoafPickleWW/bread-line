// Build the shareable kit from the engine: `npm run kit`
// Writes site/bread-line.zip (for hosting next to the landing page anywhere) and site/bread-line-kit.json
// (the same files as { files: { path: text } }, which the claude.ai landing page zips in the browser).
// Only the shared parts go in: never a profile other than _template.
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';

const root = new URL('../', import.meta.url);
const INCLUDE = ['bin', 'src', 'scripts', 'tracker', 'profiles/_template', '.claude/skills', '.agents/skills',
  'README.md', 'RUNBOOK.md', 'AGENTS.md', 'package.json', '.gitignore', 'LICENSE'];

async function walk(rel) {
  const url = new URL(rel, root);
  try {
    const entries = await readdir(url, { withFileTypes: true });
    return (await Promise.all(entries.map((e) => walk(`${rel}/${e.name}`)))).flat();
  } catch (e) {
    if (e.code === 'ENOTDIR') return [rel];
    throw e;
  }
}
const paths = (await Promise.all(INCLUDE.map(walk))).flat().sort();
const files = {};
for (const p of paths) files[`bread-line/${p}`] = await readFile(new URL(p, root), 'utf8');

// A minimal zip writer: one deflated entry per file, UTF-8 names, forward slashes.
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const local = [];
const central = [];
let offset = 0;
for (const [name, text] of Object.entries(files)) {
  const raw = Buffer.from(text, 'utf8');
  const data = deflateRawSync(raw);
  const nameBuf = Buffer.from(name, 'utf8');
  const crc = crc32(raw);
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8);
  head.writeUInt32LE(crc, 14); head.writeUInt32LE(data.length, 18); head.writeUInt32LE(raw.length, 22); head.writeUInt16LE(nameBuf.length, 26);
  local.push(head, nameBuf, data);
  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8); dir.writeUInt16LE(8, 10);
  dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(data.length, 20); dir.writeUInt32LE(raw.length, 24); dir.writeUInt16LE(nameBuf.length, 28);
  dir.writeUInt32LE(offset, 42);
  central.push(dir, nameBuf);
  offset += head.length + nameBuf.length + data.length;
}
const dirSize = central.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(paths.length, 8); end.writeUInt16LE(paths.length, 10);
end.writeUInt32LE(dirSize, 12); end.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...local, ...central, end]);

await mkdir(new URL('site/', root), { recursive: true });
await writeFile(new URL('site/bread-line.zip', root), zip);
const version = JSON.parse(files['bread-line/package.json']).version;
await writeFile(new URL('site/bread-line-kit.json', root), JSON.stringify({ version, files }));
console.log(`${paths.length} files -> site/bread-line.zip (${Math.round(zip.length / 1024)} KB) and site/bread-line-kit.json`);
