// Applies db/*.sql in order (once each) and bootstraps the first administrator.
// Runs before the server starts: `npm start` locally, and in the Docker CMD on Railway.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[migrate] DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

const dir = path.join(process.cwd(), "db");

async function main() {
  await client.connect();
  // Serialize concurrent starts (e.g. more than one replica).
  await client.query("select pg_advisory_lock(727001)");
  try {
    await client.query(
      "create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())"
    );
    const applied = new Set((await client.query("select version from schema_migrations")).rows.map((r) => r.version));
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (version) values ($1)", [file]);
        await client.query("commit");
        console.log(`[migrate] applied ${file}`);
      } catch (error) {
        await client.query("rollback");
        throw new Error(`${file}: ${error.message}`);
      }
    }

    await bootstrapAdmin();
  } finally {
    await client.query("select pg_advisory_unlock(727001)");
    await client.end();
  }
}

async function bootstrapAdmin() {
  const { rows } = await client.query("select count(*)::int as n from users");
  if (rows[0].n > 0) return;

  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 8) {
    console.warn("[migrate] No users yet. Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) to create the first administrator.");
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  await client.query(
    "insert into users (email, name, password_hash, role) values ($1, $2, $3, 'admin')",
    [email, process.env.ADMIN_NAME || "Administrator", hash]
  );
  console.log(`[migrate] created administrator ${email}`);
}

main().catch((error) => {
  console.error("[migrate] failed:", error.message);
  process.exit(1);
});
