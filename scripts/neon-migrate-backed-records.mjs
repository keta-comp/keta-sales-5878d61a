// Eski `crm_records` to'lov/qabul yozuvlarini yadro jadvallariga ko'chiradi.
// Modullar endi `payments`/`appointments`dan o'qiydi, shuning uchun migratsiyasiz
// eski yozuvlar bo'limda ko'rinmay qoladi.
//
// Ishlatish:  node scripts/neon-migrate-backed-records.mjs          # faqat hisobot
//             node scripts/neon-migrate-backed-records.mjs --apply  # yozuvlarni qo'shish
//
// Qayta ishlatish xavfsiz: har bir yangi qator `data._crm_record_id`da manba id'sini
// saqlaydi va mavjud bo'lsa o'tkazib yuboriladi. Eski crm_records o'chirilmaydi —
// tekshiruv tugagach ularni tozalash alohida qaror.
import fs from "node:fs";
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const url = fs.readFileSync(".env.local", "utf8").match(/NEON_DATABASE_URL="([^"]+)"/)?.[1];
if (!url) throw new Error("NEON_DATABASE_URL .env.local'da yo'q");

const sql = postgres(url, { connect_timeout: 25, max: 1 });

const MODULE_TABLE = { tolovlar: "payments", qabul: "appointments", korishlar: "appointments" };

const CUSTOMER_KEYS = ["kim", "mijoz", "bemor", "mijoz_ismi", "bemor_ismi", "oquvchi", "buyurtchi"];
const DATE_KEYS = ["sana", "qabul_sanasi", "kun", "muddat"];
const TIME_KEYS = ["vaqt", "vaqti", "boshlanish", "soat"];
const DURATION_KEYS = ["davomiylik", "davomiyligi", "duration"];
const EMPLOYEE_KEYS = ["shifokor", "usta", "xodim", "mutaxassis", "briga"];
const SERVICE_KEYS = ["xizmat", "bolim", "hizmat", "service", "protsedura", "obyekt", "obyekti", "uy"];
const PRICE_KEYS = ["tolov", "narx", "summa", "qiymat", "baho"];
const STATUS_KEYS = ["holat", "status", "vaziyat"];
const METHOD_KEYS = ["tur", "tolov_turi", "usuli", "method"];
const NOTE_KEYS = ["izoh", "note", "izohlar", "koment"];

const PAYMENT_STATUS = {
  "To‘landi": "paid", Tolandi: "paid", "To'langan": "paid", Qisman: "partial",
  "To‘lanmagan": "pending", "To'lanmagan": "pending", Kutilmoqda: "pending", Qaytarildi: "refunded",
};
const PAYMENT_METHOD = {
  Naqd: "cash", Karta: "card", "Pul o‘tkazma": "transfer", "Pul o'tkazma": "transfer",
  "O'tkazma": "transfer", Otkazma: "transfer", Boshqa: "other",
};
const APPOINTMENT_STATUS = {
  Yangi: "new", Navbatda: "new", Rejalashtirildi: "confirmed", Tasdiqlangan: "confirmed",
  Tasdiqlanmagan: "new", Qabulda: "arrived", Keldi: "arrived", Boshlandi: "arrived",
  Yakunlandi: "completed", "Bo‘lib o‘tdi": "completed", "Bo'lib o'tdi": "completed",
  Tayyor: "completed", "Olib ketildi": "completed", "Bekor qilindi": "cancelled", Bekor: "cancelled", Kelmadi: "no_show",
};

const txt = (v) => (v === null || v === undefined ? "" : String(v).trim());
const pick = (data, keys) => {
  for (const key of keys) {
    const value = txt(data[key]);
    if (value) return value;
  }
  return "";
};
const num = (v) => {
  const raw = txt(v).replace(/[\s_]/g, "");
  if (raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const relationId = (data, keys) => {
  for (const key of keys) {
    const value = txt(data[`${key}_id`] ?? data[key]);
    if (UUID_RE.test(value)) return value;
  }
  return null;
};
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;

// CRM relation maydonidagi UUID `crm_records` yozuviga ham ishora qilishi mumkin —
// noto'g'ri foreign key yozilmasligi uchun id faqat shu jadvalda topilganda ishlatiladi.
async function resolveId(table, businessId, uuid, name) {
  const from = sql(`public.${table}`);
  if (uuid) {
    const rows = await sql`select id from ${from} where id = ${uuid} and business_id = ${businessId} limit 1`;
    if (rows.length > 0) return uuid;
  }
  if (!name) return null;
  const rows = await sql`select id from ${from}
    where business_id = ${businessId} and lower(full_name) = lower(${name}) limit 1`;
  return rows[0]?.id ?? null;
}

function paymentRow(data) {
  const status = PAYMENT_STATUS[pick(data, STATUS_KEYS)] ?? "pending";
  const paid = status === "paid" || status === "partial";
  const rawDay = pick(data, DATE_KEYS);
  const day = DAY_RE.test(rawDay) ? rawDay : txt(new Date().toISOString()).slice(0, 10);
  return {
    amount: num(data["summa"] ?? pick(data, PRICE_KEYS)) ?? 0,
    method: PAYMENT_METHOD[pick(data, METHOD_KEYS)] ?? "cash",
    status,
    paid_at: paid ? `${day}T12:00:00+05:00` : null,
    due_date: paid ? null : day,
    note: pick(data, NOTE_KEYS),
    customer_name: pick(data, CUSTOMER_KEYS),
    customer_id: relationId(data, CUSTOMER_KEYS),
  };
}

function appointmentRow(data) {
  const rawDay = pick(data, DATE_KEYS);
  const day = DAY_RE.test(rawDay) ? rawDay : txt(new Date().toISOString()).slice(0, 10);
  const match = TIME_RE.exec(pick(data, TIME_KEYS));
  const time = match ? `${pad(Number(match[1]))}:${pad(Number(match[2]))}` : "09:00";
  const duration = num(pick(data, DURATION_KEYS)) ?? 30;
  return {
    duration_minutes: duration,
    starts_at: `${day}T${time}:00+05:00`,
    ends_at: new Date(new Date(`${day}T${time}:00+05:00`).getTime() + duration * 60_000).toISOString(),
    status: APPOINTMENT_STATUS[pick(data, STATUS_KEYS)] ?? "confirmed",
    service_name: pick(data, SERVICE_KEYS) || null,
    price: num(pick(data, PRICE_KEYS)),
    note: pick(data, NOTE_KEYS),
    customer_name: pick(data, CUSTOMER_KEYS),
    customer_id: relationId(data, CUSTOMER_KEYS),
    employee_name: pick(data, EMPLOYEE_KEYS),
    employee_id: relationId(data, EMPLOYEE_KEYS),
  };
}

const pad = (n) => String(n).padStart(2, "0");

const records = await sql`
  select id, business_id, module_key, title, data, created_at
  from public.crm_records
  where module_key in ('tolovlar', 'qabul', 'korishlar')
  order by created_at`;

const migrated = new Set(
  (await sql`
     select data->>'_crm_record_id' as src from public.payments where data ? '_crm_record_id'
     union all
     select data->>'_crm_record_id' as src from public.appointments where data ? '_crm_record_id'`).map((r) => r.src),
);

const summary = { payments: 0, appointments: 0, skipped: 0, failed: [] };
for (const record of records) {
  const table = MODULE_TABLE[record.module_key];
  if (migrated.has(record.id)) {
    summary.skipped += 1;
    continue;
  }
  const data = record.data ?? {};
  const built = table === "payments" ? paymentRow(data) : appointmentRow(data);
  const customerId = await resolveId("customers", record.business_id, built.customer_id, built.customer_name);
  const employeeId = table === "appointments"
    ? await resolveId("employees", record.business_id, built.employee_id, built.employee_name)
    : null;
  const note = built.note || (!customerId ? built.customer_name : "");

  if (!APPLY) {
    summary[table] += 1;
    continue;
  }
  try {
    if (table === "payments") {
      await sql`insert into public.payments (business_id, customer_id, amount, method, status, paid_at, due_date,
        note, created_at, data)
        values (${record.business_id}, ${customerId}, ${built.amount}, ${built.method}, ${built.status},
        ${built.paid_at}, ${built.due_date}, ${note}, ${record.created_at},
        ${sql.json({ ...data, _crm_record_id: record.id })})`;
    } else {
      await sql`insert into public.appointments (business_id, customer_id, employee_id, service_name, price,
        duration_minutes, starts_at, ends_at, status, note, created_at, data)
        values (${record.business_id}, ${customerId}, ${employeeId}, ${built.service_name}, ${built.price},
        ${built.duration_minutes}, ${built.starts_at}, ${built.ends_at}, ${built.status}, ${note},
        ${record.created_at}, ${sql.json({ ...data, _crm_record_id: record.id })})`;
    }
    summary[table] += 1;
  } catch (error) {
    summary.failed.push(`${record.id} (${record.module_key}): ${error.message}`);
  }
}

console.log(APPLY ? "KO'CHIRISH BAJARILDI" : "DRY-RUN (hech narsa yozilmadi)");
console.table([
  { payments: summary.payments, appointments: summary.appointments, skipped: summary.skipped, failed: summary.failed.length },
]);
for (const line of summary.failed) console.log("  x", line);

await sql.end();
