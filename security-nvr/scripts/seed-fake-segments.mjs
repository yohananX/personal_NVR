// Dev-only fixture: creates fake MediaMTX segment files with correct naming
// so recording discovery can be tested on a dev PC with no cameras.
// Usage: node scripts/seed-fake-segments.mjs [dir]  (default: ./recordings.dev)
// Never runs on ghis - MediaMTX owns the real directory there.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dir = process.argv[2] || "./recordings.dev";
const paths = ["stairs1", "corridor2"];

function pad(n, len = 2) {
  return String(n).padStart(len, "0");
}

function segmentName(d) {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_` +
    `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}-000000.mp4`
  );
}

const now = Date.now();
for (const p of paths) {
  for (const hoursAgo of [3, 2, 1]) {
    const start = new Date(now - hoursAgo * 3600 * 1000);
    const full = path.join(dir, p, segmentName(start));
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, "fake fmp4 fixture - discovery only checks name + mtime\n");
    console.log("created", full);
  }
}
console.log(`done. Point RECORDINGS_DIR at ${dir} and POST /api/sync`);
