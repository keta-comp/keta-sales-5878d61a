// Ilova kodida ishlatiladigan har bir shim yo'lini haqiqiy Neon bazasida
// bajaradi: jadvallar, rpc, ichma-ich select'lar, filtr amallari.
// Ishlatish: npx -y bun --env=.env.local scripts/neon-path-check.ts
import { userClient, serviceClient, anonClient } from "@/lib/pg-rest.server";
import { ownerSql, closePool } from "@/lib/db";

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, extra?: unknown) {
  if (ok) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`  FAIL ${name}`, extra === undefined ? "" : JSON.stringify(extra).slice(0, 220));
  }
}

const TABLES = [
  "activities",
  "ai_settings",
  "ai_usage_events",
  "appointments",
  "audit_logs",
  "billing_invoices",
  "booking_requests",
  "branches",
  "business_members",
  "business_settings",
  "businesses",
  "cash_sessions",
  "categories",
  "conversations",
  "crm_configs",
  "crm_records",
  "customers",
  "employee_services",
  "employees",
  "error_events",
  "expenses",
  "feature_flags",
  "instagram_events",
  "inventory_movements",
  "lead_assignments",
  "lead_events",
  "leads",
  "messages",
  "notification_reads",
  "order_items",
  "orders",
  "payments",
  "payroll_rules",
  "payroll_statements",
  "platform_admins",
  "products",
  "profiles",
  "services",
  "system_notifications",
  "system_settings",
  "tasks",
  "telegram_link_requests",
  "telegram_links",
  "time_off",
  "user_roles",
  "work_schedules",
];

// Kodda uchraydigan ichma-ich select'lar (jadval → select).
const EMBEDS: [string, string][] = [
  ["conversations", "*, customers(full_name, telegram_username, phone, location)"],
  ["products", "*, categories(id, name)"],
  ["inventory_movements", "*, products(name, sku)"],
  ["leads", "*, customers(*), conversations(id)"],
  ["leads", "*, customers(id, full_name, telegram_username)"],
  ["payments", "id, amount, method, status, paid_at, due_date, note, created_at, order_id, orders(order_number)"],
  ["employees", "*, branches(id, name)"],
  ["payroll_statements", "*, employees(id, full_name)"],
  ["payroll_statements", "id, status, employees(id, full_name)"],
  ["payroll_statements", "status, total_computed, period_start, period_end, expense_id, employees(id, full_name)"],
  ["employee_services", "service_id, commission_percent, services(id, name)"],
  ["business_members", "business_id, businesses(name)"],
  ["tasks", "*, customers(id, full_name), orders(id, order_number)"],
  ["workspace", "requested_product, status, last_contact_at, customers(full_name, phone)"],
  ["leads", "id, requested_product, status, customers(full_name)"],
];

async function main() {
  const sql = ownerSql();
  const [owner] = await sql<{ id: string; b: string }[]>`
    select b.owner_id as id, b.id as b
    from public.businesses b
    order by b.created_at desc limit 1
  `;
  if (!owner) throw new Error("Tekshirish uchun biznes topilmadi.");
  const userId = owner.id;
  const businessId = owner.b;
  const db = userClient(userId);
  const svc = serviceClient();
  console.log(`Aktyor: ${userId}\n`);

  // 1) Har bir jadval: sxema mavjud va so'rov SQL xatosiga bermaydi.
  for (const table of TABLES) {
    const r = await svc.from(table).select("*").limit(1);
    check(`jadval ${table}`, !r.error, r.error?.message ?? r);
  }

  // 2) Kodda ishlatilgan rpc'lar.
  const rpcs: [string, Record<string, unknown> | undefined][] = [
    ["business_role", { _business_id: businessId }],
    ["is_business_admin", { _business_id: businessId }],
    ["current_business_id", undefined],
    ["is_super_admin", undefined],
    ["my_access_state", undefined],
    ["platform_stats", undefined],
    ["apply_order_stock", undefined],
    ["revert_order_stock", undefined],
  ];
  for (const [fn, args] of rpcs) {
    const r = await db.rpc(fn, args);
    // Argument yetishmaydiganlari Postgres xatosi beradi — bu ham "yo'l ochiq"
    // degan belgi; faqat shim ichidagi tuzilish xatosi (TypeError) muammo.
    const msg = r.error?.message ?? "";
    check(
      `rpc ${fn}`,
      !/Qo'llanmaydigan|not a function|Cannot read|is not defined|Noto'g'ri/.test(msg),
      msg,
    );
  }

  // 3) Ichma-ich select'lar.
  for (const [table, columns] of EMBEDS) {
    if (table === "workspace") continue; // leads bilan bir xil shakl
    const r = await svc.from(table).select(columns).limit(1);
    check(`embed ${table}: ${columns.slice(0, 46)}`, !r.error, r.error?.message ?? r);
  }

  // 4) Filtr amallari — kodda uchraydigan barcha shakllar.
  const filters: [string, () => Promise<{ error: { message: string } | null }>][] = [
    ["eq", () => db.from("leads").select("id").eq("status", "new")],
    ["neq", () => db.from("orders").select("total").neq("status", "cancelled")],
    ["gt/gte/lt/lte", () => db.from("leads").select("id").gte("created_at", "2026-01-01").lte("created_at", "2026-12-31").gt("id", "00000000-0000-0000-0000-000000000000").lt("id", "ffffffff-ffff-ffff-ffff-ffffffffffff")],
    ["like/ilike", () => db.from("customers").select("id").like("full_name", "%a%").ilike("phone", "%9%")],
    ["in", () => db.from("leads").select("id").in("status", ["new", "contacted"])],
    ["is null", () => db.from("customers").select("id").is("last_contact_at", null)],
    ["not", () => db.from("orders").select("id").not("status", "eq", "cancelled")],
    ["or ilike", () => db.from("customers").select("id").or("full_name.ilike.%ali%,phone.ilike.%998%")],
    ["or is.null", () => db.from("customers").select("id").or("last_contact_at.is.null,last_contact_at.lt.2026-01-01")],
    ["filter()", () => db.from("leads").select("id").filter("status", "in", "(new,contacted)")],
    ["contains jsonb", () => db.from("crm_records").select("id").contains("data", { status: "new" })],
    ["count head", () => db.from("leads").select("id", { count: "exact", head: true })],
    ["order desc", () => db.from("leads").select("id").order("created_at", { ascending: false })],
    ["range", () => db.from("leads").select("id").range(0, 10)],
    ["jsonb path filtr", () => db.from("crm_records").select("id").eq("data->>status", "new")],
    ["limit+single", () => db.from("businesses").select("id").eq("id", businessId).single()],
    ["maybeSingle", () => db.from("businesses").select("id").eq("id", "00000000-0000-0000-0000-000000000000").maybeSingle()],
  ];
  for (const [name, run] of filters) {
    let result: { error: { message: string } | null } | undefined;
    try {
      result = await run();
    } catch (error) {
      check(`filtr ${name}`, false, String((error as Error).message).slice(0, 160));
      continue;
    }
    check(`filtr ${name}`, !result.error, result.error?.message);
  }

  // 5) Jsonb yo'li filtri ma'lumotni topadi (dashboard widgetlari shu yo'l bilan
  //    hisoblaydi: crm_records.data->>mezon).
  const marker = `shim-path-${Date.now()}`;
  const inserted = await svc
    .from("crm_records")
    .insert({
      business_id: businessId,
      module_key: marker,
      title: "Shim testi",
      data: { status: "new", price: 5000 },
    })
    .select("id")
    .single();
  check("crm_records insert (jsonb)", !inserted.error, inserted.error?.message);
  if (!inserted.error) {
    const byPath = await svc
      .from("crm_records")
      .select("id")
      .eq("business_id", businessId)
      .eq("module_key", marker)
      .eq("data->>status", "new");
    check("jsonb yo'l filtri qiymatni topdi", !byPath.error && (byPath.data?.length ?? 0) === 1, byPath.error?.message ?? byPath.data?.length);
    const byFilter = await svc
      .from("crm_records")
      .select("id")
      .eq("module_key", marker)
      .filter("data->>status", "eq", "new");
    check("jsonb yo'l + filter()", !byFilter.error && (byFilter.data?.length ?? 0) === 1, byFilter.error?.message ?? byFilter.data?.length);
    const noMatch = await svc
      .from("crm_records")
      .select("id")
      .eq("module_key", marker)
      .eq("data->>status", "boshqa");
    check("jsonb yo'l mos kelmasa 0 qator", !noMatch.error && (noMatch.data?.length ?? 1) === 0, noMatch.error?.message ?? noMatch.data?.length);
    await svc.from("crm_records").delete().eq("id", inserted.data.id);
  }

  // 6) Kiruvchi satr SQL'ga sizib kira olmaydi: noto'g'ri jsonb yo'li rad etiladi.
  const malicious = await svc.from("crm_records").select("id").eq("data->>x' OR 1=1--", "v");
  check("zararli jsonb yo'l rad etildi", !!malicious.error, malicious.error?.message);

  // 7) Anon roli tenant jadvaliga kira olmaydi (RLS chegarasi).
  const anon = await anonClient().from("customers").select("id");
  check("anon tenant'ga kira olmaydi", !!anon.error || (anon.data?.length ?? 0) === 0, anon.error?.message);

  console.log(`\nYo'l tekshiruvi: ${pass} OK, ${fail} FAIL`);
  await closePool();
  if (fail) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
