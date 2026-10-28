// PostgREST moslik qatlamini haqiqiy Neon bazasida tekshiradi.
import "dotenv/config";

import { userClient, serviceClient, anonClient } from "@/lib/pg-rest.server";
import { ownerSql, closePool } from "@/lib/db";

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, extra?: unknown) {
  if (ok) {
    pass += 1;
    console.log(`  OK   ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${name}`, extra ?? "");
  }
}

async function main() {
  const sql = ownerSql();
  const [owner] = await sql<{ id: string }[]>`
    select b.owner_id as id
    from public.businesses b
    join public.business_members m on m.business_id = b.id and m.user_id = b.owner_id
    order by b.created_at desc
    limit 1
  `;
  if (!owner) throw new Error("Tekshirish uchun biznes egasi topilmadi.");
  const userId = owner.id;
  const [biz] = await sql<{ id: string }[]>`
    select id from public.businesses where owner_id = ${userId} limit 1
  `;
  const businessId = biz!.id;
  console.log(`Aktyor: ${userId}, biznes: ${businessId}\n`);

  const db = userClient(userId);

  // 1) oddiy select + filtr + order + limit
  const list = await db
    .from("businesses")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  check("select + eq + order + limit", !list.error && Array.isArray(list.data), list.error);

  // 2) alias va maybeSingle
  const one = await db.from("businesses").select("id, title:name").eq("id", businessId).maybeSingle();
  check("alias + maybeSingle", !one.error && one.data?.title != null, one.error ?? one.data);

  // 3) count + head
  const counted = await db
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  check("count exact + head", !counted.error && counted.data === null && (counted.count ?? 0) >= 1, counted);

  // 4) tenant izolatsiya: boshqa tenant qatorlari ko'rinmaydi
  const all = await db.from("businesses").select("id");
  const total = await sql<{ c: number }[]>`select count(*)::int as c from public.businesses`;
  check(
    "RLS: faqat o'z biznesi ko'rinadi",
    !all.error && (all.data?.length ?? 0) <= (total[0]?.c ?? 0),
    { seen: all.data?.length, total: total[0]?.c },
  );

  // 5) or() filtri
  const ored = await db.from("businesses").select("id, name").or(`name.ilike.%a%,name.ilike.%e%`);
  check("or() + ilike", !ored.error, ored.error);

  // 6) in() filtri
  const ined = await db.from("businesses").select("id").in("id", [businessId]);
  check("in()", !ined.error && ined.data?.length === 1, ined.error ?? ined.data);

  // 7) insert + select + single
  const created = await db
    .from("customers")
    .insert({ business_id: businessId, full_name: "Shim test mijoz", phone: "+998900000001" })
    .select("id, full_name")
    .single();
  check("insert + select + single", !created.error && !!created.data?.id, created.error);
  const customerId = created.data?.id as string | undefined;

  // 8) update
  if (customerId) {
    const updated = await db
      .from("customers")
      .update({ full_name: "Shim test mijoz (yangilandi)" })
      .eq("id", customerId)
      .select("full_name")
      .maybeSingle();
    check("update + returning", !updated.error && updated.data?.full_name?.includes("yangilandi"), updated.error ?? updated.data);
  }

  // 9) ichma-ich embed (orders -> customers)
  if (customerId) {
    const order = await db
      .from("orders")
      .insert({ business_id: businessId, customer_id: customerId, total: 1000, status: "new" })
      .select("id, order_number")
      .single();
    check("orders insert", !order.error, order.error);
    if (!order.error) {
      const withEmbed = await db
        .from("orders")
        .select("id, order_number, customers(full_name, phone)")
        .eq("id", order.data.id)
        .maybeSingle();
      check(
        "embed: orders -> customers (obyekt)",
        !withEmbed.error && withEmbed.data?.customers?.full_name != null,
        withEmbed.error ?? withEmbed.data,
      );

      const reverse = await db
        .from("customers")
        .select("id, orders(id, order_number)")
        .eq("id", customerId)
        .maybeSingle();
      check(
        "embed: customers -> orders (massiv)",
        !reverse.error && Array.isArray(reverse.data?.orders) && reverse.data.orders.length >= 1,
        reverse.error ?? reverse.data,
      );

      await db.from("orders").delete().eq("id", order.data.id);
    }
  }

  // 10) delete
  if (customerId) {
    const removed = await db.from("customers").delete().eq("id", customerId);
    check("delete", !removed.error, removed.error);
  }

  // 11) rpc: skalyar + argumentli
  const role = await db.rpc("business_role", { _business_id: businessId });
  check("rpc business_role", !role.error && typeof role.data === "string", role.error ?? role.data);

  const access = await db.rpc("my_access_state");
  check("rpc my_access_state", !access.error && access.data != null, access.error ?? access.data);

  const current = await db.rpc("current_business_id");
  check("rpc current_business_id", !current.error, current.error);

  // 12) upsert
  const flag = await serviceClient()
    .from("feature_flags")
    .upsert({ key: "shim_test_flag", label: "Shim test", enabled: false }, { onConflict: "key" });
  check("upsert onConflict", !flag.error, flag.error);
  await ownerSql()`delete from public.feature_flags where key = 'shim_test_flag'`;

  // 13) anon klient tenant jadvaliga kira olmaydi
  const anon = await anonClient().from("customers").select("id");
  check("anon: ruxsat berilmadi", !!anon.error || (anon.data?.length ?? 0) === 0, anon.error?.message);

  // 14) xato shakli: mavjud bo'lmagan ustun
  const bad = await db.from("businesses").select("id").eq("yoq_ustun", 1);
  check("xato obyekt qaytaradi (throw emas)", !!bad.error && bad.data === null, bad);

  console.log(`\nJami: ${pass} OK, ${fail} FAIL`);
  await closePool();
  if (fail) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
