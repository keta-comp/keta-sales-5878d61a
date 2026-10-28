import postgres from "postgres";
import fs from "node:fs";

const url = fs.readFileSync(".env.local", "utf8").match(/NEON_DATABASE_URL="([^"]+)"/)?.[1];
const sql = postgres(url, { connect_timeout: 20, max: 1 });

const q = async (label, text) => {
  try {
    const rows = await sql.unsafe(text);
    console.log(`\n== ${label} ==`);
    console.log(rows.map((r) => JSON.stringify(r)).join("\n") || "(bo'sh)");
  } catch (e) {
    console.log(`\n== ${label} == xato: ${e.message}`);
  }
};

await q(
  "neon_auth jadvallari va ustunlari",
  `select table_name, ordinal_position, column_name, data_type
     from information_schema.columns where table_schema='neon_auth' order by table_name, ordinal_position`,
);
await q("public jadvallari", "select table_name from information_schema.tables where table_schema='public'");
await q(
  "nashriya va subscribe",
  `select p.pubname, p.puballtables, array_agg(c.relname) as tables
     from pg_publication p left join pg_publication_tables t on t.pubid=p.oid left join pg_class c on c.oid=t.relid
    group by 1,2`,
);
await q("barcha jadvallar (schema bo'yicha soni)", "select table_schema, count(*) from information_schema.tables group by 1 order by 2 desc");
await q("roles", "select rolname, rolsuper, rolbypassrls, rolcanlogin from pg_roles order by 1");
await q(
  "neon_auth funksiyalari",
  `select routine_name, data_type from information_schema.routines where routine_schema='neon_auth' order by 1`,
);
await sql.end({ timeout: 2 });
