import postgres from "postgres";
import fs from "node:fs";

const url = fs
  .readFileSync(".env.local", "utf8")
  .match(/NEON_DATABASE_URL="([^"]+)"/)?.[1];
const sql = postgres(url, { connect_timeout: 20, max: 1 });

const q = async (label, text) => {
  const rows = await sql.unsafe(text);
  console.log(`\n== ${label} ==`);
  console.log(rows.map((r) => JSON.stringify(r)).join("\n") || "(bo'sh)");
};

await q(
  "jay",
  `select count(*) filter (where table_schema='public') as public_tables,
          count(*) filter (where table_schema='neon_auth') as auth_tables,
          count(*) filter (where table_schema='app') as app_objects
     from information_schema.tables where table_type='BASE TABLE'`,
);
await q(
  "rls",
  `select count(*) filter (where relrowsecurity) as rls_on,
          count(*) filter (where relforcerowsecurity) as rls_forced,
          count(*) as total
     from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'`,
);
await q(
  "policies",
  `select count(distinct polname) as policies, count(distinct polrelid) as tables_with_policies
     from pg_policy`,
);
await q(
  "policy roll",
  `select r.rolname, count(*) from pg_policy p
     left join pg_roles r on r.oid = any(p.polroles)
    group by 1 order by 2 desc`,
);
await q(
  "rls yo'q jadvallar",
  `select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and not c.relrowsecurity order by 1`,
);
await q(
  "roles",
  "select rolname, rolcanlogin, rolbypassrls from pg_roles where rolname like 'app%' or rolname='neondb_owner' order by 1",
);
await q("app.user_id()", "select app.user_id() as uid");
await q(
  "functions",
  `select count(*) as public_functions from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'`,
);
await q(
  "triggers neon_auth",
  `select tgname, tgrelid::regclass as table, tgfoid::regclass as fn from pg_trigger where not tgisinternal and tgrelid::regclass::text like 'neon_auth%'`,
);
await sql.end({ timeout: 2 });
