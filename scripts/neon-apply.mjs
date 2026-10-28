// neon/0001_neon_schema.sql ni Neon'ga qo'llaydi.
// node scripts/neon-apply.mjs [--reset] [--one]
//   --reset : avval public sxemasini tozalaydi
//   --one   : hammasini bitta tranzaktsiyada (atomic); aks holda har bir operator alohida va xatolarni yig'adi
import fs from "node:fs";
import postgres from "postgres";
import { splitStatements } from "./sql-split.mjs";

const url = fs.readFileSync(".env.local", "utf8").match(/NEON_DATABASE_URL="([^"]+)"/)?.[1];
if (!url) throw new Error("NEON_DATABASE_URL .env.local'da yo'q");

const argv = process.argv.slice(2);
const reset = argv.includes("--reset");
const atomic = argv.includes("--one");
const FILE = "neon/0001_neon_schema.sql";


// Migratsiya fayllarining o'z BEGIN/COMMIT'lari tashlanadi: butun sxema bitta
// tranzaktsiyada qo'llanadi, shunda uzilish yarim qo'llangan bazani qoldirmaydi.
const TX_CONTROL = /^(begin|commit|rollback|start\s+transaction)$/i;
const stmts = splitStatements(fs.readFileSync(FILE, "utf8")).filter((s) => {
  const bare = s.replace(/--[^\n]*\n/g, "").trim().replace(/;$/, "").trim();
  return !TX_CONTROL.test(bare);
});
const sql = postgres(url, { connect_timeout: 25, max: 1, idle_timeout: 20 });

if (reset) {
  await sql.unsafe('drop schema if exists public cascade; create schema public;');
  console.log("public sxemasi tozalandi");
}

const errors = [];
const label = (s) => s.replace(/\s+/g, " ").replace(/^--[^\n]*\n/, "").slice(0, 150);

if (atomic) {
  await sql.begin(async (tx) => {
    for (const s of stmts) await tx.unsafe(s);
  });
  console.log(`OK — ${stmts.length} operator bitta tranzaktsiyada qo'llandi`);
} else {
  let done = 0;
  for (const s of stmts) {
    try {
      await sql.unsafe(s);
      done++;
    } catch (e) {
      errors.push({ stmt: label(s), msg: String(e.message).split("\n")[0] });
    }
  }
  console.log(`Qo'llandi: ${done}/${stmts.length}, xato: ${errors.length}`);
  for (const err of errors.slice(0, 60)) console.log(`\n✗ ${err.msg}\n  ${err.stmt}`);
}

const counts = await sql`
  select
    (select count(*) from information_schema.tables where table_schema='public') as tables,
    (select count(*) from information_schema.routines where routine_schema='public') as functions,
    (select count(*) from pg_policies where schemaname='public') as policies,
    (select count(*) from information_schema.columns where table_schema='public') as columns`;
console.log("\nNatija:", JSON.stringify(counts[0]));
await sql.end({ timeout: 2 });
