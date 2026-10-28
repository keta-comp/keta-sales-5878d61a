import postgres from "postgres";
import fs from "node:fs";
const line = fs.readFileSync(".env.local", "utf8").match(/NEON_DATABASE_URL="([^"]+)"/);
if (!line) { console.log("NO_URL"); process.exit(1); }
const sql = postgres(line[1], { connect_timeout: 20, max: 1 });
try {
  const r = await sql`select version() as v, current_database() as db, current_user as usr, (select count(*) from pg_tables where schemaname='public') as tables`;
  console.log("OK", JSON.stringify(r[0]));
} catch (e) { console.log("FAIL", e.name, String(e.message).slice(0, 200)); }
finally { await sql.end({ timeout: 2 }); }
