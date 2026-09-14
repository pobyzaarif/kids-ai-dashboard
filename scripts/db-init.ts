/**
 * Applies SQL files from sql/ to the database in DATABASE_URL.
 * Idempotent — every file is safe to re-run.
 *
 *   npm run db:init        -> sql/0001_schema.sql + sql/0002_seed.sql
 *   npm run db:seed        -> sql/0002_seed.sql only
 *   tsx scripts/db-init.ts <file...>  -> the given files, in order
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const files = process.argv.slice(2);
const targets =
  files.length > 0 ? files : ["sql/0001_schema.sql", "sql/0002_seed.sql"];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required (copy .env.example to .env)");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const file of targets) {
      const path = join(process.cwd(), file);
      const sql = readFileSync(path, "utf8");
      console.log(`Applying ${file} (${sql.length} bytes)...`);
      await client.query(sql);
      console.log(`  ✓ applied ${file}`);
    }
    console.log("Done.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
