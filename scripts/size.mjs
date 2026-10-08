// Gzip budgets for the client build (spec §8). Exits 1 on any breach; never raise a budget to pass.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = 'dist/client';
const KB = 1024;
// Raised once, deliberately (2026-10-08): Design v2's flags, planner and Lucide icons took the entry to
// ~46.4 KB, and the owner-requested Inter + JetBrains Mono fonts add ~6 KB to the total.
const BUDGETS = { entry: 47 * KB, css: 12 * KB, total: 168 * KB };

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length;

const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const src = /<script[^>]*type="module"[^>]*src="\/?([^"]+)"/.exec(html)?.[1];
if (!src) {
  console.error('size: no module entry script in dist/client/index.html');
  process.exit(1);
}
const files = walk(ROOT);
const sum = (re) => files.filter((f) => re.test(f)).reduce((n, f) => n + gz(f), 0);
const rows = [
  ['JS entry', gz(join(ROOT, src)), BUDGETS.entry, relative(ROOT, join(ROOT, src))],
  ['All CSS', sum(/\.css$/), BUDGETS.css, ''],
  ['JS + CSS + HTML + fonts', sum(/\.(js|css|html|woff2)$/), BUDGETS.total, ''],
];

let breached = false;
console.log('Budget (gzip -9)              actual      budget');
for (const [name, actual, budget, note] of rows) {
  const over = actual > budget;
  breached ||= over;
  console.log(
    `${over ? '✗' : '✓'} ${name.padEnd(26)} ${(actual / KB).toFixed(1).padStart(7)} KB ${(budget / KB).toFixed(0).padStart(6)} KB ${note}`,
  );
}
process.exit(breached ? 1 : 0);
