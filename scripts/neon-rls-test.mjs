/** Tenant ajratilishini haqiqiy RLS ostida tekshiradi.
 *  Barcha qadamlar bitta tranzaksiyada, oxirida ataylab rollback — DB da iz qolmaydi. */
import postgres from "postgres";
import fs from "node:fs";

const url = fs.readFileSync(".env.local", "utf8").match(/NEON_DATABASE_URL="([^"]+)"/)?.[1];
const sql = postgres(url, { connect_timeout: 20, max: 1 });

let pass = 0;
let fail = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "OK  " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (ok) pass++;
  else fail++;
};

const ROLLBACK = "__ROLLBACK__";

try {
  await sql.begin(async (tx) => {
    // 1) Ikki foydalanuvchi — trigger ular uchun profil + biznes yaratadi.
    const [a] = await tx`insert into neon_auth."user" (name, email, "emailVerified")
      values ('Avaz Test', 'avaz.rls@test.uz', true) returning id`;
    const [b] = await tx`insert into neon_auth."user" (name, email, "emailVerified")
      values ('Bilol Test', 'bilol.rls@test.uz', true) returning id`;

    const profA = await tx`select count(*)::int n from public.profiles where id = ${a.id}`;
    check("on_auth_user_created → profiles", profA[0].n === 1);
    const bizRows = await tx`select count(*)::int n from public.businesses where owner_id in (${a.id}, ${b.id})`;
    check("trigger → businesses (2 ta)", bizRows[0].n === 2, `topildi=${bizRows[0].n}`);
    const memberRows = await tx`select count(*)::int n from public.business_members where user_id in (${a.id}, ${b.id})`;
    check("trigger → business_members owner", memberRows[0].n === 2);
    const settings = await tx`
      select count(*)::int n from public.business_settings bs
        join public.businesses bb on bb.id = bs.business_id
       where bb.owner_id in (${a.id}, ${b.id})`;
    check("trigger → business_settings", settings[0].n === 2);

    const [bizA] = await tx`select id from public.businesses where owner_id = ${a.id}`;
    const [bizB] = await tx`select id from public.businesses where owner_id = ${b.id}`;

    // 2) Har biznesga mijoz (owner sifatida — RLSdan tashqari urug'lantirish).
    await tx`insert into public.customers (business_id, full_name, phone) values
        (${bizA.id}, 'A mijoz', '+998900000001'), (${bizB.id}, 'B mijoz', '+998900000002')`;

    // 3) A foydalanuvchisi sifatida (RLS ostida).
    const asA = await tx.savepoint(async (t) => {
      await t`select set_config('app.user_id', ${a.id}::text, true)`;
      await t`set local role app_user`;
      const biz = await t`select id from public.businesses`;
      const cust = await t`select business_id from public.customers`;
      const state = await t`select public.my_access_state() as s`;
      let insertBlocked = null;
      try {
        await t.savepoint(async (s) => s`insert into public.customers (business_id, full_name, phone)
          values (${bizB.id}, 'Bostirib kirish', '+998900000003')`);
        insertBlocked = false;
      } catch (e) {
        insertBlocked = /row-level security|permission denied/.test(e.message);
      }
      await t`reset role`;
      await t`reset app.user_id`;
      return {
        bizSeen: biz.length,
        bizOwn: biz.every((r) => r.id === bizA.id),
        custSeen: cust.length,
        custOwn: cust.every((r) => r.business_id === bizA.id),
        stateRaw: JSON.stringify(state[0].s).slice(0, 140),
        insertBlocked,
      };
    });
    check("app_user: faqat o'z biznesini ko'radi", asA.bizSeen === 1 && asA.bizOwn, `count=${asA.bizSeen}`);
    check("app_user: faqat o'z mijozlarini ko'radi", asA.custSeen === 1 && asA.custOwn, `count=${asA.custSeen}`);
    check("app_user: begona tenantga INSERT rad etildi", asA.insertBlocked === true);
    check("my_access_state() app.user_id bilan ishlaydi", asA.stateRaw.includes("plan"), asA.stateRaw);

    // 4) Anon (tashqi) — hech narsa ko'rmaydi.
    let asAnon;
    try {
      asAnon = await tx.savepoint(async (t) => {
        await t`set local role app_anon`;
        const r = await t`select count(*)::int n from public.customers`;
        return { n: r[0].n };
      });
    } catch (e) {
      asAnon = { err: e.message.slice(0, 60) };
    }
    await tx`reset role`;
    check("app_anon: customers ga kira olmaydi", asAnon.n === 0 || Boolean(asAnon.err), JSON.stringify(asAnon));

    // 5) Service (app_service) — bypass, webhook/admin oqimi uchun.
    const asService = await tx.savepoint(async (t) => {
      await t`set local role app_service`;
      const r = await t`select count(*)::int n from public.customers`;
      const inv = await t`
        insert into public.billing_invoices (business_id, plan, amount, provider, created_by)
        values (${bizA.id}, 'pro', 99000, 'payme', ${a.id}) returning invoice_no, status`;
      return { n: r[0].n, inv: inv[0] };
    });
    check("app_service: barcha tenantlarni ko'radi (BYPASSRLS)", asService.n >= 2, `count=${asService.n}`);
    check("app_service: billing_invoices yozdi, invoice_no generatsiya bo'ldi", Number(asService.inv?.invoice_no) > 0, JSON.stringify(asService.inv));

    throw new Error(ROLLBACK);
  });
} catch (e) {
  if (e.message !== ROLLBACK) throw e;
}

console.log(`\nNatija: ${pass} OK, ${fail} FAIL (tranzaksiya rollback qilindi)`);
await sql.end({ timeout: 2 });
process.exit(fail ? 1 : 0);
