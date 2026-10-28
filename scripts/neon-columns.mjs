/** neon_auth."user" ustunlari va unga ulangan triggerlarni ko'rsatadi. */
import postgres from "postgres";
import fs from "node:fs";

const url = fs.readFileSync(".env.local", "utf8").match(/NEON_DATABASE_URL="([^"]+)"/)?.[1];
const sql = postgres(url, { connect_timeout: 20, max: 1 });

const cols = await sql`
  select column_name, data_type, is_nullable, column_default
    from information_schema.columns
   where table_schema='neon_auth' and table_name='user' order by ordinal_position`;
for (const c of cols) {
  console.log(`${c.column_name}\t${c.data_type}\tnull=${c.is_nullable}\tdef=${c.column_default ?? "-"}`);
}

const trg = await sql`
  select tgname, tgfoid::regclass::text as fn from pg_trigger
   where not tgisinternal and tgrelid = 'neon_auth."user"'::regclass`;
console.log("\ntriggers:", JSON.stringify(trg));

await sql.end({ timeout: 2 });
