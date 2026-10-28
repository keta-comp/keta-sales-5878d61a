/** src/lib/db.ts ni haqiqiy Neon ustida tekshiradi: tenant ajratishi, Drizzle
 *  so'rovlari, RPC, rollback va roll almashtirish. Test ma'lumotlari oxirida o'chiriladi. */
import postgres from "postgres";
import fs from "node:fs";
import { sql as ds } from "drizzle-orm";

import * as schema from "../src/db/schema.ts";
import { asAnon, asService, asUser } from "../src/lib/db.ts";

const env = fs.readFileSync(".env.local", "utf8");
process.env.NEON_DATABASE_URL = env.match(/NEON_DATABASE_URL="([^"]+)"/)?.[1];

const raw = postgres(process.env.NEON_DATABASE_URL!, { max: 1, connect_timeout: 20, ssl: "require" });

let pass = 0;
let fail = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "OK  " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (ok) pass++;
  else fail++;
};

// Urug'lik: owner ulanish orqali (RLSdan tashqari), trigger bizneslarni yaratadi.
const seed = await raw.begin(async (tx) => {
  const [a] = await tx`insert into neon_auth."user" (name, email, "emailVerified")
    values ('Db A', 'db.a@test.uz', true) returning id`;
  const [b] = await tx`insert into neon_auth."user" (name, email, "emailVerified")
    values ('Db B', 'db.b@test.uz', true) returning id`;
  const biz = await tx`select id from public.businesses where owner_id in (${a.id}, ${b.id})`;
  const c = await tx`insert into public.customers (business_id, full_name, phone) values
    (${biz[0].id}, 'DBTEST A', '+998900000011'), (${biz[0].id}, 'DBTEST A2', '+998900000012'),
    (${biz[1].id}, 'DBTEST B', '+998900000013') returning id`;
  return { a: a.id, b: b.id, bizA: biz[0].id, bizB: biz[1].id, custA: c[0].id };
});

try {
  const userA = await asUser(seed.a, async (db) => {
    const rows = await db
      .select({ id: schema.customers.id, businessId: schema.customers.businessId })
      .from(schema.customers);
    const biz = await db.select({ id: schema.businesses.id }).from(schema.businesses);
    const state = await db.execute(ds`select public.my_access_state() as s`);
    return { rows, biz, state: state[0]?.s };
  });
  check("asUser: Drizzle orqali faqat o'z mijozlari", userA.rows.length === 2 && userA.rows.every((r) => r.businessId === seed.bizA), `n=${userA.rows.length}`);
  check("asUser: businesses tenantga qisqargan", userA.biz.length === 1);
  check("asUser: my_access_state() plan qaytardi", Boolean(userA.state?.plan), JSON.stringify(userA.state)?.slice(0, 70));

  const cross = await asUser(seed.b, (db) =>
    db.select().from(schema.customers).where(ds`id = ${seed.custA}`),
  );
  check("asUser: begona tenant qatori ID bo'yicha ham yo'q", cross.length === 0, `topildi=${cross.length}`);

  await asUser(seed.a, (db) =>
    db.insert(schema.customers).values({ businessId: seed.bizA, fullName: "DBTEST yangi", phone: "+998900000099" }),
  );
  const after = await asService((db) => db.select({ id: schema.customers.id }).from(schema.customers));
  check("asUser INSERT + asService HISOB: 4 ta qator", after.length === 4, `n=${after.length}`);

  let anonBlocked = false;
  try {
    await asAnon((db) => db.select().from(schema.customers));
  } catch (e) {
    anonBlocked = /permission denied/.test(String(e.message));
  }
  check("asAnon: customers rad etildi", anonBlocked);

  let threw = false;
  try {
    await asUser(seed.a, async (db) => {
      await db.insert(schema.customers).values({ businessId: seed.bizA, fullName: "DBTEST bekor", phone: "+998900000000" });
      throw new Error("ataylab");
    });
  } catch {
    threw = true;
  }
  const afterRollback = await asService((db) => db.select({ id: schema.customers.id }).from(schema.customers));
  check("xatoda tranzaksiya rollback bo'ldi", threw && afterRollback.length === 4, `n=${afterRollback.length}`);
} finally {
  await raw`delete from neon_auth."user" where id in (${seed.a}, ${seed.b})`;
}
const left = await raw`select count(*)::int n from public.customers where full_name like 'DBTEST%'`;
check("tozalash: test qatorlari qolmadi", left[0].n === 0, `qoldi=${left[0].n}`);

console.log(`\nNatija: ${pass} OK, ${fail} FAIL`);
await raw.end({ timeout: 2 });
process.exit(fail ? 1 : 0);
