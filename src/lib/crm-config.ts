/**
 * Universal dynamic CRM engine — client-safe types + industry presets.
 * CRM UI is rendered from CrmConfigData; industries only seed the initial
 * configuration. One exception: lib/dental.ts gives the odontogramma module a
 * dedicated chart view on top of the same record storage.
 */

import { TOOTH_CONDITIONS } from "./dental";

export type CrmFieldType =
  | "text"
  | "phone"
  | "number"
  | "money"
  | "date"
  | "select"
  | "textarea"
  | "relation"
  | "file";

/** Relation target: "customers" (core customers table) or a dynamic module key. */
export interface CrmField {
  key: string;
  label: string;
  type: CrmFieldType;
  required?: boolean;
  options?: string[];
  targetModule?: string;
}

/** Relation values are stored as data[key] = display name, data[key + "_id"] = record id. */
export function relationIdKey(fieldKey: string): string {
  return `${fieldKey}_id`;
}

/** Legacy dashboard routes a module can map onto (existing functionality, kept). */
export type CrmModuleLink =
  | "/dashboard/leads"
  | "/dashboard/customers"
  | "/dashboard/conversations"
  | "/dashboard/orders"
  | "/dashboard/inventory"
  | "/dashboard/products";

export interface CrmModule {
  key: string;
  label: string;
  icon?: string;
  /** Universal module rendered from crm_records when true/absent. */
  link?: CrmModuleLink;
  /** Marks modules whose records live on the pipeline board. */
  pipeline?: boolean;
  fields?: CrmField[];
}

export interface CrmWidget {
  key: string;
  label: string;
  kind:
    | "module_count"
    | "module_count_today"
    | "field_sum"
    | "legacy_today_revenue"
    | "legacy_today_orders"
    | "legacy_today_leads"
    | "legacy_hot_leads"
    | "legacy_handoffs";
  moduleKey?: string;
  fieldKey?: string;
  where?: { field: string; value: string };
}

export interface CrmConfigData {
  modules: CrmModule[];
  pipelineStages: string[];
  terminology: Record<string, string>;
  dashboardWidgets: CrmWidget[];
  automations: string[];
  /** Registry id from lib/presets.ts. Absent in configs saved before the registry existed. */
  presetId?: string;
}

export interface CrmConfig {
  industry: string;
  businessDescription: string | null;
  config: CrmConfigData;
}

export interface IndustryOption {
  key: string;
  emoji: string;
  label: string;
}

/** Industry options live in lib/presets.ts (INDUSTRIES) — the registry owns preset identity. */

function moneyField(key: string, label: string, required = false): CrmField {
  return { key, label, type: "money", required };
}
function textField(key: string, label: string, required = true): CrmField {
  return { key, label, type: "text", required };
}
function phoneField(): CrmField {
  return { key: "telefon", label: "Telefon", type: "phone" };
}
function dateField(key: string, label: string): CrmField {
  return { key, label, type: "date" };
}
function selectField(key: string, label: string, options: string[], required = false): CrmField {
  return { key, label, type: "select", options, required };
}
function noteField(): CrmField {
  return { key: "izoh", label: "Izoh", type: "textarea" };
}
/** Files live in the private `crm_attachments` bucket; the stored value is the object path. */
function fileField(key: string, label: string): CrmField {
  return { key, label, type: "file" };
}
function paymentModule(label = "To‘lovlar"): CrmModule {
  return {
    key: "tolovlar",
    label,
    fields: [
      textField("kim", "Kim uchun"),
      moneyField("summa", "Summa", true),
      dateField("sana", "Sana"),
      selectField("holat", "Holat", ["To‘landi", "To‘lanmagan", "Qisman"]),
      noteField(),
    ],
  };
}

interface PresetInput {
  modules: CrmModule[];
  pipelineStages: string[];
  terminology: Record<string, string>;
  dashboardWidgets: CrmWidget[];
  automations?: string[];
}

const W_TODAY_REVENUE: CrmWidget = { key: "tushum", label: "Bugungi tushum", kind: "legacy_today_revenue" };
const W_TODAY_LEADS: CrmWidget = { key: "murojaatlar", label: "Bugungi murojaatlar", kind: "legacy_today_leads" };
const W_TODAY_ORDERS: CrmWidget = { key: "buyurtmalar", label: "Bugungi buyurtmalar", kind: "legacy_today_orders" };
const W_HANDOFFS: CrmWidget = { key: "attention", label: "E'tibor kutilmoqda", kind: "legacy_handoffs" };

function defaultWidgets(extra: CrmWidget[]): CrmWidget[] {
  return [...extra, W_TODAY_REVENUE, W_TODAY_LEADS, W_HANDOFFS];
}

function preset(p: PresetInput): CrmConfigData {
  return {
    modules: p.modules,
    pipelineStages: p.pipelineStages,
    terminology: p.terminology,
    dashboardWidgets: defaultWidgets(p.dashboardWidgets),
    automations: p.automations ?? [],
  };
}

export const GENERIC_PIPELINE = [
  "Yangi murojaat",
  "Muzokara",
  "Kelishildi",
  "To‘lov",
  "Bajarilmoqda",
  "Yakunlandi",
];

const GENERIC_MODULES: CrmModule[] = [
  { key: "murojaatlar", label: "Murojaatlar", icon: "target", link: "/dashboard/leads", pipeline: true },
  { key: "mijozlar", label: "Mijozlar", icon: "users", link: "/dashboard/customers" },
  { key: "suhbatlar", label: "Suhbatlar", icon: "messages", link: "/dashboard/conversations" },
  { key: "buyurtmalar", label: "Buyurtmalar", icon: "cart", link: "/dashboard/orders" },
  { key: "mahsulotlar", label: "Mahsulotlar / Xizmatlar", icon: "package", link: "/dashboard/products" },
  paymentModule(),
];

export const GENERIC_PRESET: CrmConfigData = preset({
  modules: GENERIC_MODULES,
  pipelineStages: GENERIC_PIPELINE,
  terminology: { customer: "Mijoz", lead: "Murojaat", order: "Buyurtma" },
  dashboardWidgets: [W_TODAY_ORDERS],
});

const BASE_PRESETS: Record<string, CrmConfigData> = {
  stomatologiya: preset({
    modules: [
      { key: "murojaatlar", label: "Murojaatlar", icon: "target", link: "/dashboard/leads", pipeline: true },
      { key: "bemorlar", label: "Bemorlar", icon: "users", link: "/dashboard/customers" },
      {
        key: "qabul",
        label: "Qabul",
        icon: "calendar",
        pipeline: true,
        fields: [
          textField("bemor", "Bemor ismi"),
          phoneField(),
          { key: "xizmat", label: "Xizmat", type: "select", options: ["Konsultatsiya", "Davolash", "Protezlash", "Implantatsiya", "Gigiyena"], required: true },
          textField("shifokor", "Shifokor"),
          dateField("qabul_sanasi", "Qabul sanasi"),
          { key: "tashxis", label: "Tashxis", type: "textarea" },
          moneyField("tolov", "To‘lov"),
          noteField(),
        ],
      },
      {
        key: "shifokorlar",
        label: "Shifokorlar",
        icon: "stethoscope",
        fields: [
          textField("ism", "Ism"),
          phoneField(),
          textField("mutaxassislik", "Mutaxassislik"),
          selectField("holat", "Holat", ["Faol", "Ta'tilda"]),
          noteField(),
        ],
      },
      {
        key: "odontogramma",
        label: "Odontogramma",
        icon: "activity",
        fields: [
          textField("bemor", "Bemor"),
          { key: "tish", label: "Tish raqami (FDI)", type: "number", required: true },
          selectField("holat", "Holat", [...TOOTH_CONDITIONS], true),
          textField("tavsiya", "Tavsiya etilgan muolaja", false),
          dateField("sana", "Sana"),
          textField("shifokor", "Shifokor"),
          moneyField("narx", "Narx"),
          noteField(),
        ],
      },
      {
        key: "bemor_kartasi",
        label: "Bemor kartasi",
        icon: "clipboard",
        fields: [
          textField("bemor", "Bemor"),
          dateField("tugilgan_kun", "Tug‘ilgan kun"),
          selectField("qon_guruhi", "Qon guruhi", ["I (0)", "II (A)", "III (B)", "IV (AB)", "Aniqlanmagan"]),
          textField("allergiya", "Allergiya", false),
          { key: "anamnez", label: "Anamnez (surunkali kasalliklar)", type: "textarea" },
          { key: "dorilar", label: "Qabul qilinadigan dorilar", type: "textarea" },
          { key: "ko_rsatilgan", label: "Qo‘shimcha ko‘rsatmalar", type: "textarea" },
          dateField("yangilangan", "Oxirgi yangilanish"),
        ],
      },
      {
        key: "davolash",
        label: "Davolash",
        icon: "activity",
        fields: [
          textField("bemor", "Bemor"),
          textField("xizmat", "Xizmat"),
          textField("tish", "Tish raqami", false),
          dateField("boshlanish", "Boshlanish sanasi"),
          dateField("muddat", "Rejalashtirilgan tugash"),
          selectField("bosqich", "Bosqich", ["Rejalashtirildi", "Davom etmoqda", "Tugadi"], true),
          textField("shifokor", "Shifokor"),
          moneyField("narx", "Narx"),
          moneyField("tolangan", "To‘langan"),
          noteField(),
        ],
      },
      {
        key: "rentgen",
        label: "Rentgen va hujjatlar",
        icon: "file",
        fields: [
          textField("bemor", "Bemor"),
          selectField("turi", "Hujjat turi", ["Rentgen", "KT", "Panorama", "Rasmiy hujjat", "Boshqa"]),
          dateField("sana", "Sana"),
          textField("tashxis", "Izoh / tavsif", false),
          fileField("fayl", "Fayl"),
          textField("shifokor", "Shifokor", false),
          noteField(),
        ],
      },
      paymentModule(),
    ],
    pipelineStages: ["Yangi murojaat", "Konsultatsiya", "Qabul belgilandi", "Davolash", "To‘lov", "Yakunlandi"],
    terminology: { customer: "Bemor", lead: "Murojaat", order: "Qabul" },
    dashboardWidgets: [
      { key: "qabul_bugun", label: "Bugungi qabul", kind: "module_count_today", moduleKey: "qabul" },
      { key: "bemorlar", label: "Bemorlar", kind: "module_count", moduleKey: "bemorlar" },
      { key: "kutilayotgan_tolov", label: "Kutilayotgan to‘lovlar", kind: "module_count", moduleKey: "tolovlar", where: { field: "holat", value: "To‘lanmagan" } },
      { key: "davolash_rejada", label: "Rejadagi davolashlar", kind: "module_count", moduleKey: "davolash", where: { field: "bosqich", value: "Rejalashtirildi" } },
      { key: "davolash_davom", label: "Davom etayotgan davolashlar", kind: "module_count", moduleKey: "davolash", where: { field: "bosqich", value: "Davom etmoqda" } },
    ],
  }),

  oquv: preset({
    modules: [
      { key: "leadlar", label: "Leadlar", icon: "target", link: "/dashboard/leads", pipeline: true },
      { key: "oquvchilar", label: "O‘quvchilar", icon: "users", link: "/dashboard/customers" },
      {
        key: "kurslar",
        label: "Kurslar",
        icon: "book",
        fields: [
          textField("nomi", "Kurs nomi"),
          moneyField("narxi", "Narxi"),
          textField("davomiyligi", "Davomiyligi"),
          textField("oqituvchi", "O‘qituvchi"),
          noteField(),
        ],
      },
      {
        key: "guruhlar",
        label: "Guruhlar",
        icon: "layers",
        fields: [
          textField("nomi", "Guruh nomi"),
          textField("kurs", "Kurs"),
          textField("oqituvchi", "O‘qituvchi"),
          dateField("boshlanish", "Boshlanish sanasi"),
          selectField("holat", "Holat", ["To‘planyapti", "Faol", "Tugadi"], true),
        ],
      },
      {
        key: "oqituvchilar",
        label: "O‘qituvchilar",
        icon: "user",
        fields: [textField("ism", "Ism"), phoneField(), textField("fan", "Fan"), noteField()],
      },
      paymentModule(),
      {
        key: "davomat",
        label: "Davomat",
        icon: "check",
        fields: [
          textField("oquvchi", "O‘quvchi"),
          textField("guruh", "Guruh"),
          dateField("sana", "Sana"),
          selectField("holat", "Holat", ["Keldi", "Kelmadi", "Sababli"], true),
        ],
      },
    ],
    pipelineStages: ["Yangi lead", "Aloqa qilindi", "Sinov darsi", "Ro‘yxatdan o‘tdi", "O‘qishni boshladi", "Faol", "Tugatdi"],
    terminology: { customer: "O‘quvchi", lead: "Lead", order: "Ro‘yxatdan o‘tish" },
    dashboardWidgets: [
      { key: "oquvchilar", label: "Faol o‘quvchilar", kind: "module_count", moduleKey: "oquvchilar" },
      { key: "guruhlar", label: "Guruhlar", kind: "module_count", moduleKey: "guruhlar" },
      { key: "tolanmagan", label: "To‘lanmagan to‘lovlar", kind: "field_sum", moduleKey: "tolovlar", fieldKey: "summa", where: { field: "holat", value: "To‘lanmagan" } },
      { key: "davomat_bugun", label: "Bugungi davomat", kind: "module_count_today", moduleKey: "davomat" },
    ],
  }),

  ecommerce: preset({
    modules: [
      { key: "buyurtmalar", label: "Buyurtmalar", icon: "cart", link: "/dashboard/orders", pipeline: true },
      { key: "mijozlar", label: "Mijozlar", icon: "users", link: "/dashboard/customers" },
      { key: "mahsulotlar", label: "Mahsulotlar", icon: "package", link: "/dashboard/products" },
      { key: "ombor", label: "Ombor", icon: "boxes", link: "/dashboard/inventory" },
      { key: "suhbatlar", label: "Suhbatlar", icon: "messages", link: "/dashboard/conversations" },
      paymentModule(),
    ],
    pipelineStages: ["Yangi buyurtma", "Tasdiqlandi", "Tayyorlanmoqda", "Yetkazilmoqda", "Yetkazildi", "Yakunlandi"],
    terminology: { customer: "Mijoz", lead: "Buyurtma", order: "Buyurtma" },
    dashboardWidgets: [W_TODAY_ORDERS],
  }),

  avtoservis: preset({
    modules: [
      { key: "murojaatlar", label: "Murojaatlar", icon: "target", link: "/dashboard/leads", pipeline: true },
      { key: "mijozlar", label: "Mijozlar", icon: "users", link: "/dashboard/customers" },
      {
        key: "avtomobillar",
        label: "Avtomobillar",
        icon: "car",
        fields: [
          textField("mijoz", "Mijoz"),
          textField("marka", "Marka / model"),
          textField("raqami", "Davlat raqami"),
          { key: "yil", label: "Yil", type: "number" },
          noteField(),
        ],
      },
      {
        key: "servis",
        label: "Servis buyurtmalari",
        icon: "wrench",
        pipeline: true,
        fields: [
          textField("mijoz", "Mijoz"),
          textField("avtomobil", "Avtomobil"),
          { key: "muammo", label: "Muammo", type: "textarea" },
          textField("usta", "Usta"),
          moneyField("narx", "Narx"),
          selectField("holat", "Holat", ["Qabul qilindi", "Ishlanmoqda", "Tayyor", "Olib ketildi"], true),
        ],
      },
      {
        key: "ustalar",
        label: "Ustalar",
        icon: "user",
        fields: [textField("ism", "Ism"), phoneField(), textField("mutaxassislik", "Mutaxassislik"), noteField()],
      },
      paymentModule(),
    ],
    pipelineStages: ["Yangi murojaat", "Diagnostika", "Ta'mirlash", "Tayyor", "To‘lov", "Yakunlandi"],
    terminology: { customer: "Mijoz", lead: "Murojaat", order: "Servis buyurtmasi" },
    dashboardWidgets: [
      { key: "servis", label: "Servis buyurtmalari", kind: "module_count", moduleKey: "servis" },
      { key: "avtomobillar", label: "Avtomobillar", kind: "module_count", moduleKey: "avtomobillar" },
    ],
  }),

  kochmas_mulk: preset({
    modules: [
      { key: "leadlar", label: "Leadlar", icon: "target", link: "/dashboard/leads", pipeline: true },
      { key: "mijozlar", label: "Mijozlar", icon: "users", link: "/dashboard/customers" },
      {
        key: "obyekt",
        label: "Ko‘chmas mulklar",
        icon: "home",
        fields: [
          textField("nomi", "Nomi"),
          selectField("turi", "Turi", ["Kvartira", "Uy", "Yer", "Tijorat"], true),
          textField("manzil", "Manzil"),
          moneyField("narx", "Narx"),
          { key: "maydon", label: "Maydon (m²)", type: "number" },
          noteField(),
        ],
      },
      {
        key: "korishlar",
        label: "Ko‘rishlar",
        icon: "eye",
        fields: [
          textField("mijoz", "Mijoz"),
          textField("obyekt", "Ob'ekt"),
          dateField("sana", "Sana"),
          selectField("holat", "Holat", ["Rejalashtirildi", "Bo‘lib o‘tdi", "Bekor qilindi"], true),
        ],
      },
      {
        key: "bitimlar",
        label: "Bitimlar",
        icon: "handshake",
        fields: [
          textField("mijoz", "Mijoz"),
          textField("obyekt", "Ob'ekt"),
          moneyField("summa", "Summa"),
          selectField("holat", "Holat", ["Muzokarada", "Imzolandi", "Bekor"], true),
          noteField(),
        ],
      },
    ],
    pipelineStages: ["Yangi lead", "Aloqa", "Talab aniqlash", "Ob'ekt ko‘rsatildi", "Muzokara", "Bitim", "Yakunlandi"],
    terminology: { customer: "Mijoz", lead: "Lead", order: "Bitim" },
    dashboardWidgets: [
      { key: "obyekt", label: "Ko‘chmas mulklar", kind: "module_count", moduleKey: "obyekt" },
      { key: "korishlar", label: "Ko‘rishlar", kind: "module_count", moduleKey: "korishlar" },
      { key: "bitimlar", label: "Bitimlar", kind: "module_count", moduleKey: "bitimlar" },
    ],
  }),

  beauty: preset({
    modules: [
      { key: "murojaatlar", label: "Murojaatlar", icon: "target", link: "/dashboard/leads", pipeline: true },
      { key: "mijozlar", label: "Mijozlar", icon: "users", link: "/dashboard/customers" },
      {
        key: "qabul",
        label: "Qabul",
        icon: "calendar",
        pipeline: true,
        fields: [
          textField("mijoz", "Mijoz ismi"),
          phoneField(),
          textField("xizmat", "Xizmat"),
          textField("usta", "Usta"),
          dateField("sana", "Qabul sanasi"),
          moneyField("tolov", "To‘lov"),
          noteField(),
        ],
      },
      {
        key: "xizmatlar",
        label: "Xizmatlar",
        icon: "package",
        fields: [
          textField("nomi", "Xizmat nomi"),
          moneyField("narxi", "Narxi"),
          { key: "davomiylik", label: "Davomiyligi (daqiqa)", type: "number" },
        ],
      },
      {
        key: "ustalar",
        label: "Ustalar",
        icon: "user",
        fields: [textField("ism", "Ism"), phoneField(), textField("mutaxassislik", "Mutaxassislik"), noteField()],
      },
      paymentModule(),
    ],
    pipelineStages: ["Yangi murojaat", "Qabul belgilandi", "Xizmat ko‘rsatildi", "To‘lov", "Yakunlandi"],
    terminology: { customer: "Mijoz", lead: "Murojaat", order: "Qabul" },
    dashboardWidgets: [
      { key: "qabul_bugun", label: "Bugungi qabul", kind: "module_count_today", moduleKey: "qabul" },
      { key: "xizmatlar", label: "Xizmatlar", kind: "module_count", moduleKey: "xizmatlar" },
    ],
  }),

  qurilish: preset({
    modules: [
      { key: "murojaatlar", label: "Murojaatlar", icon: "target", link: "/dashboard/leads", pipeline: true },
      { key: "mijozlar", label: "Mijozlar", icon: "users", link: "/dashboard/customers" },
      {
        key: "loyihalar",
        label: "Loyihalar",
        icon: "building",
        pipeline: true,
        fields: [
          textField("nomi", "Loyiha nomi"),
          textField("mijoz", "Mijoz"),
          moneyField("byudjet", "Byudjet"),
          dateField("boshlanish", "Boshlanish sanasi"),
          selectField("bosqich", "Bosqich", ["Rejalashtirildi", "Ishlanmoqda", "Tugadi"], true),
          noteField(),
        ],
      },
      {
        key: "pudratchilar",
        label: "Pudratchilar",
        icon: "user",
        fields: [textField("ism", "Ism"), phoneField(), textField("mutaxassislik", "Mutaxassislik"), noteField()],
      },
      paymentModule(),
    ],
    pipelineStages: ["Yangi murojaat", "Smeta", "Shartnoma", "Ishlanmoqda", "To‘lov", "Yakunlandi"],
    terminology: { customer: "Mijoz", lead: "Murojaat", order: "Loyiha" },
    dashboardWidgets: [
      { key: "loyihalar", label: "Loyihalar", kind: "module_count", moduleKey: "loyihalar" },
    ],
  }),

  xizmat: preset({
    modules: [
      { key: "murojaatlar", label: "Murojaatlar", icon: "target", link: "/dashboard/leads", pipeline: true },
      { key: "mijozlar", label: "Mijozlar", icon: "users", link: "/dashboard/customers" },
      {
        key: "xizmatlar",
        label: "Xizmatlar",
        icon: "package",
        fields: [
          textField("nomi", "Xizmat nomi"),
          moneyField("narxi", "Narxi"),
          { key: "davomiylik", label: "Davomiyligi", type: "text" },
          noteField(),
        ],
      },
      paymentModule(),
    ],
    pipelineStages: GENERIC_PIPELINE,
    terminology: { customer: "Mijoz", lead: "Murojaat", order: "Buyurtma" },
    dashboardWidgets: [{ key: "xizmatlar", label: "Xizmatlar", kind: "module_count", moduleKey: "xizmatlar" }],
  }),

  smm: preset({
    modules: [
      { key: "murojaatlar", label: "Murojaatlar", icon: "target", link: "/dashboard/leads", pipeline: true },
      { key: "mijozlar", label: "Mijozlar", icon: "users", link: "/dashboard/customers" },
      {
        key: "loyihalar",
        label: "Proyektlar",
        icon: "building",
        pipeline: true,
        fields: [
          textField("nomi", "Proyekt nomi"),
          textField("mijoz", "Mijoz"),
          moneyField("narx", "Narx (oylik)"),
          selectField("paket", "Paket", ["SMM", "Targeting", "Kontent", "To‘liq paket"], true),
          selectField("holat", "Holat", ["Boshlanmagan", "Ishlanmoqda", "Tugadi"], true),
          noteField(),
        ],
      },
      paymentModule(),
    ],
    pipelineStages: ["Yangi murojaat", "Prezentatsiya", "Shartnoma", "Ishlanmoqda", "To‘lov", "Yakunlandi"],
    terminology: { customer: "Mijoz", lead: "Murojaat", order: "Proyekt" },
    dashboardWidgets: [{ key: "loyihalar", label: "Proyektlar", kind: "module_count", moduleKey: "loyihalar" }],
  }),

  klinika: preset({
    modules: [
      { key: "murojaatlar", label: "Murojaatlar", icon: "target", link: "/dashboard/leads", pipeline: true },
      { key: "bemorlar", label: "Bemorlar", icon: "users", link: "/dashboard/customers" },
      {
        key: "qabul",
        label: "Qabul",
        icon: "calendar",
        pipeline: true,
        fields: [
          textField("bemor", "Bemor ismi"),
          phoneField(),
          textField("bolim", "Bo‘lim"),
          textField("shifokor", "Shifokor"),
          dateField("sana", "Qabul sanasi"),
          selectField("holat", "Holat", ["Navbatda", "Qabulda", "Yakunlandi", "Kelmadi"], true),
          textField("xona", "Xona / kabinet", false),
          moneyField("tolov", "To‘lov"),
          noteField(),
        ],
      },
      {
        key: "bolimlar",
        label: "Bo‘limlar",
        icon: "building",
        fields: [
          textField("nomi", "Bo‘lim nomi"),
          textField("mudir", "Bo‘lim mudiri"),
          textField("xonalar", "Kabinetlar soni", false),
          selectField("holat", "Holat", ["Faol", "Vaqtinchalik yopiq"]),
          noteField(),
        ],
      },
      {
        key: "shifokorlar",
        label: "Shifokorlar",
        icon: "stethoscope",
        fields: [
          textField("ism", "Ism"),
          phoneField(),
          textField("mutaxassislik", "Mutaxassislik"),
          textField("bolim", "Bo‘lim"),
          selectField("malaka", "Malaka toifasi", ["Yuqori", "Birinchi", "Ikkinchi", "Toifasiz"]),
          selectField("holat", "Holat", ["Faol", "Ta'tilda"]),
          noteField(),
        ],
      },
      {
        key: "tibbiy_karta",
        label: "Tibbiy karta",
        icon: "clipboard",
        fields: [
          textField("bemor", "Bemor"),
          dateField("tugilgan_kun", "Tug‘ilgan kun"),
          selectField("jinsi", "Jinsi", ["Ayol", "Erkak", "Ko‘rsatilmagan"]),
          selectField("qon_guruhi", "Qon guruhi", ["I (0)", "II (A)", "III (B)", "IV (AB)", "Aniqlanmagan"]),
          textField("allergiya", "Allergiya", false),
          { key: "anamnez", label: "Anamnez (surunkali kasalliklar)", type: "textarea" },
          { key: "dorilar", label: "Qabul qilinadigan dorilar", type: "textarea" },
          { key: "operatsiyalar", label: "O‘tkazilgan operatsiyalar", type: "textarea" },
          dateField("yangilangan", "Oxirgi yangilanish"),
          noteField(),
        ],
      },
      {
        key: "koriklar",
        label: "Ko‘rik va tashxis",
        icon: "stethoscope",
        fields: [
          textField("bemor", "Bemor"),
          textField("shifokor", "Shifokor"),
          dateField("sana", "Ko‘rik sanasi"),
          { key: "shikoyat", label: "Shikoyat", type: "textarea" },
          { key: "tekshiruv", label: "Obyektiv tekshiruv", type: "textarea" },
          textField("tashxis", "Tashxis"),
          textField("mkx_kodi", "MKX kodi", false),
          { key: "tavsiya", label: "Davolash tavsiyasi", type: "textarea" },
          dateField("qayta_korik", "Qayta ko‘rik sanasi"),
          textField("yollanma", "Yo‘llanma (boshqa mutaxassis)", false),
          moneyField("narx", "Ko‘rik narxi"),
          noteField(),
        ],
      },
      {
        key: "tahlillar",
        label: "Tahlillar",
        icon: "flask",
        fields: [
          textField("bemor", "Bemor"),
          textField("turi", "Tahlil nomi"),
          selectField("holat", "Holat", ["Topshirildi", "Natija keldi", "Bekor qilindi"], true),
          dateField("sana", "Topshirilgan sana"),
          dateField("natija_sana", "Natija sanasi"),
          { key: "natija", label: "Natija (ko‘rsatkichlar)", type: "textarea" },
          textField("yo_nalgan", "Yo‘naltirgan shifokor"),
          moneyField("narx", "Narx"),
          fileField("fayl", "Natija fayli"),
          noteField(),
        ],
      },
      {
        key: "davolash_rejasi",
        label: "Davolash rejasi",
        icon: "check",
        fields: [
          textField("bemor", "Bemor"),
          textField("shifokor", "Shifokor"),
          textField("maqsad", "Davolash maqsadi"),
          selectField("bosqich", "Bosqich", ["Rejalashtirildi", "Davom etmoqda", "Yakunlandi"], true),
          dateField("boshlanish", "Boshlanish sanasi"),
          dateField("muddat", "Rejalashtirilgan tugash"),
          { key: "protseduralar", label: "Protseduralar ro‘yxati", type: "textarea" },
          moneyField("narx", "Reja narxi"),
          moneyField("tolangan", "To‘langan"),
          noteField(),
        ],
      },
      {
        key: "hujjatlar",
        label: "Tibbiy hujjatlar",
        icon: "file",
        fields: [
          textField("bemor", "Bemor"),
          selectField("turi", "Hujjat turi", ["Yo‘llanma", "Ma'lumotnoma", "Rozilik", "Rentgen", "Tahlil natijasi", "Boshqa"], true),
          dateField("sana", "Sana"),
          textField("tavsif", "Izoh / tavsif", false),
          fileField("fayl", "Fayl"),
          textField("shifokor", "Shifokor", false),
          noteField(),
        ],
      },
      paymentModule(),
    ],
    pipelineStages: ["Yangi murojaat", "Qabul belgilandi", "Ko‘rik", "Davolash", "To‘lov", "Yakunlandi"],
    terminology: { customer: "Bemor", lead: "Murojaat", order: "Qabul" },
    dashboardWidgets: [
      { key: "qabul_bugun", label: "Bugungi qabul", kind: "module_count_today", moduleKey: "qabul" },
      {
        key: "qabul_navbat",
        label: "Navbatda kutayotganlar",
        kind: "module_count",
        moduleKey: "qabul",
        where: { field: "holat", value: "Navbatda" },
      },
      {
        key: "tahlillar_kutilmoqda",
        label: "Natijasi kutilayotgan tahlillar",
        kind: "module_count",
        moduleKey: "tahlillar",
        where: { field: "holat", value: "Topshirildi" },
      },
      { key: "bemorlar", label: "Bemorlar", kind: "module_count", moduleKey: "bemorlar" },
    ],
  }),
};

/** Which preset fields link to other modules, per industry → module → field → target. */
export const RELATION_MAP: Record<string, Record<string, Record<string, string>>> = {
  stomatologiya: {
    qabul: { bemor: "customers", shifokor: "shifokorlar" },
    davolash: { bemor: "customers", shifokor: "shifokorlar" },
    odontogramma: { bemor: "customers", shifokor: "shifokorlar" },
    bemor_kartasi: { bemor: "customers" },
    rentgen: { bemor: "customers", shifokor: "shifokorlar" },
    tolovlar: { kim: "customers" },
  },
  klinika: {
    qabul: { bemor: "customers", shifokor: "shifokorlar", bolim: "bolimlar" },
    bolimlar: { mudir: "shifokorlar" },
    shifokorlar: { bolim: "bolimlar" },
    tibbiy_karta: { bemor: "customers" },
    koriklar: { bemor: "customers", shifokor: "shifokorlar" },
    tahlillar: { bemor: "customers", yo_nalgan: "shifokorlar" },
    davolash_rejasi: { bemor: "customers", shifokor: "shifokorlar" },
    hujjatlar: { bemor: "customers", shifokor: "shifokorlar" },
    tolovlar: { kim: "customers" },
  },
  oquv: {
    kurslar: { oqituvchi: "oqituvchilar" },
    guruhlar: { kurs: "kurslar", oqituvchi: "oqituvchilar" },
    davomat: { oquvchi: "customers", guruh: "guruhlar" },
    tolovlar: { kim: "customers" },
  },
  avtoservis: {
    avtomobillar: { mijoz: "customers" },
    servis: { mijoz: "customers", avtomobil: "avtomobillar", usta: "ustalar" },
    tolovlar: { kim: "customers" },
  },
  kochmas_mulk: {
    korishlar: { mijoz: "customers", obyekt: "obyekt" },
    bitimlar: { mijoz: "customers", obyekt: "obyekt" },
  },
  beauty: { qabul: { mijoz: "customers", xizmat: "xizmatlar", usta: "ustalar" }, tolovlar: { kim: "customers" } },
  qurilish: { loyihalar: { mijoz: "customers" }, tolovlar: { kim: "customers" } },
  smm: { loyihalar: { mijoz: "customers" }, tolovlar: { kim: "customers" } },
  xizmat: { tolovlar: { kim: "customers" } },
};

/** Turns mapped text fields into relation fields; also upgrades saved configs. */
export function applyRelations(industry: string | null | undefined, config: CrmConfigData): CrmConfigData {
  // Saved configs predate the retire of the sales-agent "operator" wording.
  const dashboardWidgets = config.dashboardWidgets.map((widget) =>
    widget.key === "operator" ? { ...widget, key: "attention", label: "E'tibor kutilmoqda" } : widget,
  );

  const map = RELATION_MAP[industry ?? ""];
  if (!map) return { ...config, dashboardWidgets };
  const keys = new Set(config.modules.map((m) => m.key));
  return {
    ...config,
    dashboardWidgets,
    modules: config.modules.map((m) => {
      const fm = map[m.key];
      if (!fm || !m.fields) return m;
      return {
        ...m,
        fields: m.fields.map((f) => {
          const target = fm[f.key];
          if (!target || f.type === "relation") return f;
          if (target !== "customers" && !keys.has(target)) return f;
          return { ...f, type: "relation" as const, targetModule: target };
        }),
      };
    }),
  };
}

export const INDUSTRY_PRESETS: Record<string, CrmConfigData> = Object.fromEntries(
  Object.entries(BASE_PRESETS).map(([k, v]) => [k, applyRelations(k, v)]),
);

/** Preset for a chosen industry ("boshqa" → generic, refined by AI). */
export function presetForIndustry(industryKey: string): CrmConfigData {
  return INDUSTRY_PRESETS[industryKey] ?? GENERIC_PRESET;
}
