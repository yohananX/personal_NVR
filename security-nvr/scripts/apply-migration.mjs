// Apply a SQL migration file. Idempotent files only.
// Usage (from security-nvr/):
//   npm run migrate -- db/migrations/003_auth.sql
import { readFileSync } from "node:fs";
import { Pool } from "pg";

function loadDotEnvLocal() {
  try {
    const text = readFileSync(".env.local", "utf8");
    for (const line of text.split("\n")) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // No .env.local - rely on exported env vars.
  }
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run migrate -- <migration-file.sql>");
  process.exit(1);
}
loadDotEnvLocal();
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (env or .env.local).");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(sql);
  console.log(`ok: applied ${file}`);
} finally {
  await pool.end();
}
