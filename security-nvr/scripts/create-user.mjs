// Create or update an NVR user. No credentials are ever committed.
// Usage (from security-nvr/):
//   npm run user:create -- --username admin --role ADMIN --password <secret>
// Run from WSL/Git Bash on ghis. Password may also come from NVR_PASSWORD env.
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
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

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

loadDotEnvLocal();

const username = arg("username");
const password = arg("password") || process.env.NVR_PASSWORD;
const role = (arg("role") || "OPERATOR").toUpperCase();

if (!username || !password) {
  console.error(
    "Usage: npm run user:create -- --username <name> --role ADMIN|OPERATOR --password <secret>"
  );
  process.exit(1);
}
if (role !== "ADMIN" && role !== "OPERATOR") {
  console.error("Role must be ADMIN or OPERATOR.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (env or .env.local).");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto
  .scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
  .toString("hex");
const passwordHash = `scrypt$16384$8$1$${salt}$${hash}`;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(
  `
    INSERT INTO users (username, password_hash, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (username)
    DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
  `,
  [username.trim(), passwordHash, role]
);
await pool.end();
console.log(`ok: user '${username.trim()}' (${role})`);
