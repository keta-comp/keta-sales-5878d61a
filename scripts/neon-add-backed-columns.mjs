// payments/appointments uchun `data jsonb` ustunini qo'shadi (neon/0001 ichidagi
// 20261029093000 migratsiyasi). Qayta ishlatish xavfsiz: ADD COLUMN IF NOT EXISTS.
import fs from "node:fs";
import postgres from "postgres";

const url = fs.readFileSync(".env.local", "utf8").match(/NEON_DATABASE_URL="([^"]+)"/)?.[1];
if (!url) throw new Error("NEON_DATABASE_URL .env.local'da yo'q");

const sql = postgres(url, { connect_timeout: 25, max: 1 });

for (const table of ["payments", "appointments"]) {
  await sql.unsafe(`ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb`);
}

const rows = await sql`
  select table_name, column_name, data_type, column_default
  from information_schema.columns
  where table_schema = 'public' and column_name = 'data' and table_name in ('payments','appointments')
  order by table_name`;
console.table(rows);
await sql.end();
