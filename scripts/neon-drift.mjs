/** types.ts (Supabase ustidagi ishlab turgan DB snapshot) va jadvallardagi
 *  haqiqiy ustunlarni solishtiradi — drift (migratsiyada yo'q, DB da bor) ro'yxati. */
import postgres from "postgres";
import fs from "node:fs";

const url = fs.readFileSync(".env.local", "utf8").match(/NEON_DATABASE_URL="([^"]+)"/)?.[1];
const sql = postgres(url, { connect_timeout: 20, max: 1 });

const src = fs.readFileSync("scripts/legacy/supabase-types-snapshot.ts", "utf8");

/** `tables: { name: { Row: { col: type } } }` — qavslar balandligi bo'yicha kesib olamiz. */
function block(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start + 1, i);
    }
  }
  return "";
}

const tablesStart = src.indexOf("Tables: {");
const body = block(src, tablesStart + "Tables:".length);

const expected = new Map();
const re = /(\w+): \{\s*\n\s*Row: \{/g;
let m;
while ((m = re.exec(body))) {
  const rowStart = body.indexOf("{", m.index + m[0].length - 1);
  const row = block(body, rowStart);
  const cols = new Map();
  for (const line of row.split("\n")) {
    const c = line.match(/^\s*(?:"?([a-z0-9_]+)"?)\s*:\s*(.+?)\s*$/);
    if (c) cols.set(c[1], c[2]);
  }
  expected.set(m[1], cols);
  re.lastIndex = rowStart + row.length;
}

const actual = await sql`
  select table_name, column_name, is_nullable
    from information_schema.columns where table_schema='public'`;
const have = new Map();
for (const r of actual) {
  if (!have.has(r.table_name)) have.set(r.table_name, new Set());
  have.get(r.table_name).add(r.column_name);
}

const onlyTypes = [];
const onlyDb = [];
for (const [table, cols] of expected) {
  const set = have.get(table);
  if (!set) {
    onlyTypes.push(`${table}: JADVAL YO'Q (${cols.size} ustun)`);
    continue;
  }
  for (const c of cols.keys()) if (!set.has(c)) onlyTypes.push(`${table}.${c}`);
  for (const c of set) if (!cols.has(c)) onlyDb.push(`${table}.${c}`);
}
for (const [table] of have) if (!expected.has(table)) onlyDb.push(`${table}: JADVAL types.ts da yo'q`);

console.log(`types.ts jadvallari: ${expected.size}, DB jadvallari: ${have.size}`);
console.log(`\n== types.ts da bor, Neon'da yo'q (${onlyTypes.length}) ==`);
console.log(onlyTypes.join("\n") || "(farq yo'q)");
console.log(`\n== Neon'da bor, types.ts da yo'q (${onlyDb.length}) ==`);
console.log(onlyDb.join("\n") || "(farq yo'q)");

const fns = await sql`
  select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind='f' order by 1`;
const rpcNames = new Set([
  "apply_order_stock",
  "business_role",
  "current_business_id",
  "is_business_admin",
  "is_super_admin",
  "my_access_state",
  "platform_stats",
  "revert_order_stock",
]);
console.log(`\n== types.ts Functions (${rpcNames.size}) dan Neon'da yo'qlari ==`);
const dbFns = new Set(fns.map((f) => f.proname));
console.log([...rpcNames].filter((n) => !dbFns.has(n)).join("\n") || "(barchasi mavjud)");

await sql.end({ timeout: 2 });
