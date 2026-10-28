import postgres from "postgres";
import fs from "node:fs";

const url = fs.readFileSync(".env.local", "utf8").match(/NEON_DATABASE_URL="([^"]+)"/)?.[1];
const sql = postgres(url, { connect_timeout: 20, max: 1 });

const tryIt = async (label, text) => {
  try {
    const r = await sql.unsafe(text);
    console.log(`OK   ${label}`);
    if (r?.length) console.log("     " + JSON.stringify(r).slice(0, 200));
  } catch (e) {
    console.log(`FAIL ${label}: ${String(e.message).split("\n")[0]}`);
  }
};

const membership = await sql`
  select g.rolname as granted_to, r.rolname as member_of
    from pg_auth_members m join pg_roles r on r.oid = roleid join pg_roles g on g.oid = member
   where r.rolname in ('neondb_owner','neon_auth','token_roles') or g.rolname in ('neon_auth','token_roles')
   order by 1,2`;
console.log("== a'zoliklar ==");
console.log(membership.map((m) => JSON.stringify(m)).join("\n"));

const owners = await sql`
  select schemaname, tableowner, count(*) from pg_tables where schemaname in ('neon_auth','public') group by 1,2`;
console.log("\n== jadvallar egasi ==");
console.log(owners.map((o) => JSON.stringify(o)).join("\n"));

console.log("\n== sinovlar (ROLLBACK bilan) ==");
await sql.begin(async (tx) => {
  const t = (label, text) => tx.unsafe(text).then(() => console.log(`OK   ${label}`)).catch((e) => console.log(`FAIL ${label}: ${String(e.message).split("\n")[0]}`));
  await t("CREATE SCHEMA app", "create schema if not exists app");
  await t("app.user_id() funksiyasi", "create or replace function app.user_id() returns uuid language sql stable as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$");
  await t("CREATE ROLE app_user NOLOGIN", "create role app_user nologin");
  await t("CREATE ROLE app_service BYPASSRLS", "create role app_service nologin bypassrls");
  await t("GRANT app_user TO neondb_owner", "grant app_user to neondb_owner");
  await t("REFERENCES huquqini berish (neon_auth.user)", "grant references on neon_auth.\"user\" to app_user");
  await t("FK: neon_auth.user'ga", "create table public.fk_probe (id uuid primary key references neon_auth.\"user\" on delete cascade)");
  await t("TRIGGER neon_auth.user'da", 'create or replace function public.trig_probe() returns trigger language plpgsql as $$ begin return new; end; $$; create trigger probe after insert on neon_auth."user" for each row execute function public.trig_probe()');
  await t("SET LOCAL ROLE app_user", "set local role app_user");
  await t("SET LOCAL app.user_id", "set local app.user_id = '11111111-1111-1111-1111-111111111111'");
  throw new Error("rollback");
});

await sql.end({ timeout: 2 });
