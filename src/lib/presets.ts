/**
 * Central industry-preset registry (KetaOne brief §7.1).
 * Client-safe. Depends on crm-config.ts — never the reverse.
 *
 * A preset describes the *business identity* (menu, enabled modules, booking
 * semantics, reports, defaults). The CRM field/module payloads stay in
 * crm-config.ts (INDUSTRY_PRESETS) and are selected through `industryKey`.
 */

import {
  GENERIC_PRESET,
  INDUSTRY_PRESETS,
  type CrmConfigData,
  type CrmField,
  type CrmModule,
  type CrmWidget,
  type IndustryOption,
} from "./crm-config";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "./booking";
import type { Permission } from "./roles";

/** What "booking" means for this industry (brief §4.3). */
export type BookingType =
  | "appointment"
  | "trial_lesson"
  | "order"
  | "viewing"
  | "home_visit"
  | "project_meeting";

export const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  appointment: "Qabul",
  trial_lesson: "Sinov darsi",
  order: "Buyurtma",
  viewing: "Obyektni ko‘rish",
  home_visit: "Manzilga chiqish",
  project_meeting: "Uchrashuv",
};

export type PresetSection = "core" | "industry" | "operations" | "money" | "team" | "admin";

/** Dashboard routes a preset menu can point at. Every value has a real page. */
export type CoreKey =
  | "pipeline"
  | "customers"
  | "leads"
  | "conversations"
  | "orders"
  | "products"
  | "inventory"
  | "appointments"
  | "tasks"
  | "payments"
  | "finance"
  | "employees"
  | "branches"
  | "payroll"
  | "team";

/** Legacy CRM entry points that stay reachable in every preset (AGENTS.md rule). */
const LEGACY_CORE_KEYS: CoreKey[] = ["customers", "leads", "conversations", "orders", "products"];

export interface PresetMenuItem {
  to: string;
  label: string;
  icon: string;
  section: PresetSection;
  /** Omitted = visible for every role. Filtering by role happens in the shell. */
  permission?: Permission;
}

export interface PresetDefaults {
  currency: string;
  timezone: string;
  workStart: string;
  workEnd: string;
  slotMinutes: number;
}

export type ReportKey =
  | "revenue"
  | "expenses"
  | "profit"
  | "customers"
  | "appointments"
  | "pipeline"
  | "staff"
  | "stock";

export interface IndustryPreset {
  id: string;
  /** Key into INDUSTRY_PRESETS; sub-presets reuse their parent's data shape. */
  industryKey: string;
  /** Set for sub-presets (Sartaroshxona → Beauty salon). */
  parentId?: string;
  emoji: string;
  name: string;
  /** Short label for sub-preset pickers (falls back to `name`). */
  shortName?: string;
  description: string;
  bookingType: BookingType;
  /** Preset-specific additions on top of LEGACY_CORE_KEYS. */
  extraCoreKeys: CoreKey[];
  /** Renames of legacy/extra core items ("Bemorlar" instead of "Mijozlar"). */
  labels?: Partial<Record<CoreKey, string>>;
  /** One entry per dynamic (non-linked) module of the industry config. */
  industryItems: PresetMenuItem[];
  /** Industry modules this preset does not use at all. */
  hiddenModuleKeys: string[];
  /**
   * Modules holding patient data. Kept in code (never in the stored config) so a tenant
   * cannot unlock medical records by editing its own CRM JSON; server-side checks use this.
   */
  medicalModuleKeys?: string[];
  reports: ReportKey[];
  defaults: PresetDefaults;
}

const CORE_ITEMS: Record<CoreKey, PresetMenuItem> = {
  pipeline: { to: "/dashboard/pipeline", label: "Pipeline", icon: "pipeline", section: "core" },
  customers: { to: "/dashboard/customers", label: "Mijozlar", icon: "users", section: "core" },
  leads: { to: "/dashboard/leads", label: "Murojaatlar", icon: "target", section: "core" },
  conversations: { to: "/dashboard/conversations", label: "Muloqotlar", icon: "messages", section: "core" },
  orders: { to: "/dashboard/orders", label: "Buyurtmalar", icon: "cart", section: "core" },
  products: { to: "/dashboard/products", label: "Xizmatlar va mahsulotlar", icon: "package", section: "core" },
  inventory: { to: "/dashboard/inventory", label: "Ombor", icon: "boxes", section: "core", permission: "catalog.manage" },
  appointments: { to: "/dashboard/appointments", label: "Qabul va bron", icon: "calendar", section: "operations" },
  tasks: { to: "/dashboard/tasks", label: "Vazifalar", icon: "tasks", section: "operations" },
  payments: { to: "/dashboard/payments", label: "To‘lovlar", icon: "wallet", section: "money", permission: "finance.view" },
  finance: { to: "/dashboard/finance", label: "Moliya", icon: "finance", section: "money", permission: "finance.view" },
  employees: { to: "/dashboard/employees", label: "Xodimlar", icon: "users", section: "team" },
  branches: { to: "/dashboard/branches", label: "Filiallar", icon: "building", section: "team" },
  payroll: { to: "/dashboard/payroll", label: "Oylik", icon: "payroll", section: "money", permission: "finance.view" },
  team: { to: "/dashboard/team", label: "Jamoa va rollar", icon: "team", section: "team", permission: "members.manage" },
};

const ADMIN_TAIL: PresetMenuItem[] = [
  { to: "/dashboard/analytics", label: "Hisobotlar", icon: "chart", section: "admin", permission: "reports.export" },
  { to: "/dashboard/assistant", label: "AI yordamchi", icon: "bot", section: "admin" },
  { to: "/dashboard/crm-builder", label: "AI CRM sozlash", icon: "sparkles", section: "admin", permission: "settings.manage" },
  { to: "/dashboard/telegram", label: "Telegram", icon: "send", section: "admin", permission: "settings.manage" },
  { to: "/dashboard/billing", label: "Tarif va to‘lov", icon: "wallet", section: "admin", permission: "settings.manage" },
  { to: "/dashboard/settings", label: "Sozlamalar", icon: "settings", section: "admin", permission: "settings.manage" },
];

const DEFAULTS: PresetDefaults = {
  currency: "UZS",
  timezone: "Asia/Tashkent",
  workStart: "09:00",
  workEnd: "18:00",
  slotMinutes: 30,
};

function dynamicItem(key: string, label: string, icon: string): PresetMenuItem {
  return { to: `/dashboard/crm/${key}`, label, icon, section: "industry" };
}

/** Payment module label differs per industry; the payload is shared. */
const paymentsItem = (label = "To‘lovlar") => dynamicItem("tolovlar", label, "wallet");

/** Patient-data modules: hidden from roles without `medical.view` (server enforces too). */
const medicalItem = (key: string, label: string, icon: string): PresetMenuItem => ({
  ...dynamicItem(key, label, icon),
  permission: "medical.view",
});

const PRESET_LIST: IndustryPreset[] = [
  {
    id: "stomatologiya",
    industryKey: "stomatologiya",
    emoji: "🦷",
    name: "Stomatologiya",
    description: "Bemorlar, qabul jadvali, davolash rejalari va shifokorlar ulushi.",
    bookingType: "appointment",
    extraCoreKeys: ["pipeline", "appointments", "tasks", "payments", "finance", "inventory", "employees", "payroll", "team"],
    labels: { customers: "Bemorlar", products: "Stomatologik xizmatlar" },
    industryItems: [
      dynamicItem("qabul", "Qabul", "calendar"),
      medicalItem("odontogramma", "Odontogramma", "activity"),
      medicalItem("bemor_kartasi", "Bemor kartasi", "clipboard"),
      dynamicItem("shifokorlar", "Shifokorlar", "stethoscope"),
      dynamicItem("davolash", "Davolash rejalari", "check"),
      medicalItem("rentgen", "Rentgen va hujjatlar", "file"),
      paymentsItem(),
    ],
    hiddenModuleKeys: [],
    medicalModuleKeys: ["odontogramma", "bemor_kartasi", "rentgen"],
    reports: ["revenue", "expenses", "profit", "customers", "appointments", "staff", "stock"],
    defaults: { ...DEFAULTS, slotMinutes: 60 },
  },
  {
    id: "klinika",
    industryKey: "klinika",
    emoji: "🏥",
    name: "Klinika / Tibbiyot",
    description: "Bemorlar, qabul va navbat, bo‘limlar, tahlillar va to‘lovlar.",
    bookingType: "appointment",
    extraCoreKeys: ["pipeline", "appointments", "tasks", "payments", "finance", "inventory", "employees", "payroll", "team"],
    labels: { customers: "Bemorlar", products: "Tibbiy xizmatlar" },
    industryItems: [
      dynamicItem("qabul", "Qabul va navbat", "calendar"),
      dynamicItem("bolimlar", "Bo‘limlar", "building"),
      dynamicItem("shifokorlar", "Shifokorlar", "stethoscope"),
      medicalItem("tibbiy_karta", "Tibbiy kartalar", "clipboard"),
      medicalItem("koriklar", "Ko‘rik va tashxis", "activity"),
      medicalItem("tahlillar", "Tahlillar", "flask"),
      dynamicItem("davolash_rejasi", "Davolash rejasi", "check"),
      medicalItem("hujjatlar", "Tibbiy hujjatlar", "file"),
      paymentsItem(),
    ],
    hiddenModuleKeys: [],
    medicalModuleKeys: ["tibbiy_karta", "koriklar", "tahlillar", "hujjatlar"],
    reports: ["revenue", "expenses", "profit", "customers", "appointments", "staff"],
    defaults: { ...DEFAULTS, slotMinutes: 30 },
  },
  {
    id: "oquv",
    industryKey: "oquv",
    emoji: "🎓",
    name: "O‘quv markazi",
    description: "Lidlar, o‘quvchilar, kurslar, guruhlar, davomat va oylik to‘lovlar.",
    bookingType: "trial_lesson",
    extraCoreKeys: ["pipeline", "appointments", "tasks", "payments", "finance", "employees", "payroll", "team"],
    labels: { customers: "O‘quvchilar", leads: "Leadlar", products: "Kurslar" },
    industryItems: [
      dynamicItem("kurslar", "Kurslar", "book"),
      dynamicItem("guruhlar", "Guruhlar", "layers"),
      dynamicItem("oqituvchilar", "O‘qituvchilar", "user"),
      dynamicItem("davomat", "Davomat", "check"),
      paymentsItem(),
    ],
    hiddenModuleKeys: [],
    reports: ["revenue", "expenses", "profit", "customers", "pipeline", "staff"],
    defaults: { ...DEFAULTS, slotMinutes: 90 },
  },
  {
    id: "ecommerce",
    industryKey: "ecommerce",
    emoji: "📦",
    name: "E-commerce",
    description: "Buyurtmalar, mahsulotlar, ombor qoldiqlari va yetkazib berish.",
    bookingType: "order",
    extraCoreKeys: ["inventory", "tasks", "payments", "finance", "team"],
    labels: { products: "Mahsulotlar" },
    industryItems: [paymentsItem()],
    hiddenModuleKeys: [],
    reports: ["revenue", "expenses", "profit", "customers", "stock"],
    defaults: DEFAULTS,
  },
  {
    id: "avtoservis",
    industryKey: "avtoservis",
    emoji: "🚗",
    name: "Avtoservis",
    description: "Avtomobillar, servis buyurtmalari, ustalar va ehtiyot qismlar.",
    bookingType: "appointment",
    extraCoreKeys: ["pipeline", "appointments", "tasks", "inventory", "payments", "finance", "employees", "payroll", "team"],
    labels: { orders: "Servis buyurtmalari", products: "Xizmatlar va qismlar" },
    industryItems: [
      dynamicItem("avtomobillar", "Avtomobillar", "car"),
      dynamicItem("servis", "Servis buyurtmalari", "wrench"),
      dynamicItem("ustalar", "Ustalar", "user"),
      paymentsItem(),
    ],
    hiddenModuleKeys: [],
    reports: ["revenue", "expenses", "profit", "customers", "appointments", "staff", "stock"],
    defaults: { ...DEFAULTS, slotMinutes: 60 },
  },
  {
    id: "kochmas_mulk",
    industryKey: "kochmas_mulk",
    emoji: "🏠",
    name: "Ko‘chmas mulk",
    description: "Obyektlar, ko‘rish jadvali, muzokaralar, bitimlar va komissiyalar.",
    bookingType: "viewing",
    extraCoreKeys: ["pipeline", "appointments", "tasks", "payments", "finance", "employees", "payroll", "team"],
    labels: { products: "Xizmatlar va komissiyalar", appointments: "Ko‘rish jadvali" },
    industryItems: [
      dynamicItem("obyekt", "Obyektlar", "home"),
      dynamicItem("korishlar", "Ko‘rishlar", "eye"),
      dynamicItem("bitimlar", "Bitimlar", "handshake"),
    ],
    hiddenModuleKeys: [],
    reports: ["revenue", "profit", "customers", "pipeline", "staff"],
    defaults: { ...DEFAULTS, slotMinutes: 60 },
  },
  {
    id: "beauty",
    industryKey: "beauty",
    emoji: "💇",
    name: "Beauty salon / Barbershop",
    shortName: "Beauty salon",
    description: "Ustalar, xizmatlar, onlayn qabul, kassa va abonementlar.",
    bookingType: "appointment",
    extraCoreKeys: ["pipeline", "appointments", "tasks", "inventory", "payments", "finance", "employees", "payroll", "team"],
    labels: { products: "Xizmatlar" },
    industryItems: [
      dynamicItem("qabul", "Qabul", "calendar"),
      dynamicItem("xizmatlar", "Xizmatlar", "package"),
      dynamicItem("ustalar", "Ustalar", "user"),
      paymentsItem(),
    ],
    hiddenModuleKeys: [],
    reports: ["revenue", "expenses", "profit", "customers", "appointments", "staff", "stock"],
    defaults: { ...DEFAULTS, slotMinutes: 60 },
  },
  {
    id: "barbershop",
    industryKey: "beauty",
    parentId: "beauty",
    emoji: "💈",
    name: "Sartaroshxona",
    description: "Tezkor qabul, sartaroshlar, xizmat narxlari va kunlik kassa.",
    bookingType: "appointment",
    extraCoreKeys: ["appointments", "payments"],
    labels: { products: "Xizmatlar va narxlar", appointments: "Onlayn qabul" },
    industryItems: [
      dynamicItem("qabul", "Qabul", "calendar"),
      dynamicItem("xizmatlar", "Xizmatlar va narxlar", "package"),
      dynamicItem("ustalar", "Sartaroshlar", "user"),
      paymentsItem("Kassa"),
    ],
    hiddenModuleKeys: [],
    reports: ["revenue", "profit", "appointments", "staff"],
    defaults: { ...DEFAULTS, slotMinutes: 30 },
  },
  {
    id: "qurilish",
    industryKey: "qurilish",
    emoji: "🏗",
    name: "Qurilish",
    description: "Loyihalar, smetalar, bajarilgan ishlar, materiallar va avanslar.",
    bookingType: "project_meeting",
    extraCoreKeys: ["pipeline", "appointments", "tasks", "inventory", "payments", "finance", "employees", "branches", "payroll", "team"],
    labels: { orders: "Bajarilgan ishlar", products: "Ishlar va materiallar" },
    industryItems: [
      dynamicItem("loyihalar", "Loyihalar", "building"),
      dynamicItem("pudratchilar", "Pudratchilar", "user"),
      paymentsItem("Avanslar va to‘lovlar"),
    ],
    hiddenModuleKeys: [],
    reports: ["revenue", "expenses", "profit", "customers", "staff", "stock"],
    defaults: DEFAULTS,
  },
  {
    id: "xizmat",
    industryKey: "xizmat",
    emoji: "💼",
    name: "Xizmat ko‘rsatish",
    description: "Buyurtmalar, manzillar, brigadalar jadvali va bajarilgan ishlar.",
    bookingType: "home_visit",
    extraCoreKeys: ["pipeline", "appointments", "tasks", "inventory", "payments", "finance", "employees", "branches", "team"],
    labels: { orders: "Buyurtmalar", products: "Xizmatlar", appointments: "Jadval va marshrut" },
    industryItems: [dynamicItem("xizmatlar", "Xizmatlar", "package"), paymentsItem()],
    hiddenModuleKeys: [],
    reports: ["revenue", "expenses", "profit", "customers", "appointments", "staff"],
    defaults: DEFAULTS,
  },
  {
    id: "smm",
    industryKey: "smm",
    emoji: "📱",
    name: "SMM / Marketing agentligi",
    description: "Mijozlar, loyihalar, kontent vazifalari va oylik to‘lovlar.",
    bookingType: "project_meeting",
    extraCoreKeys: ["pipeline", "tasks", "payments", "finance", "employees", "team"],
    labels: { products: "Xizmat paketlari" },
    industryItems: [dynamicItem("loyihalar", "Loyihalar", "building"), paymentsItem("Oylik to‘lovlar")],
    hiddenModuleKeys: [],
    reports: ["revenue", "expenses", "profit", "customers", "pipeline", "staff"],
    defaults: DEFAULTS,
  },
  {
    id: "universal",
    industryKey: "boshqa",
    emoji: "⚙️",
    name: "Boshqa",
    description: "Har qanday soha uchun universal CRM — modullarni o‘zingiz sozlaysiz.",
    bookingType: "appointment",
    extraCoreKeys: ["pipeline", "appointments", "tasks", "payments", "finance", "employees", "branches", "team"],
    labels: {},
    industryItems: [paymentsItem()],
    hiddenModuleKeys: [],
    reports: ["revenue", "expenses", "profit", "customers", "pipeline", "appointments"],
    defaults: DEFAULTS,
  },
];

export const PRESETS: Record<string, IndustryPreset> = Object.fromEntries(
  PRESET_LIST.map((preset) => [preset.id, preset]),
);

export const UNIVERSAL_PRESET_ID = "universal";

const PRESET_ID_BY_INDUSTRY: Record<string, string> = Object.fromEntries(
  PRESET_LIST.filter((p) => p.parentId === undefined).map((p) => [p.industryKey, p.id]),
);

/** Children of a parent preset, keyed by parent id (beauty → barbershop). */
export const SUB_PRESETS: Record<string, IndustryPreset[]> = (() => {
  const map: Record<string, IndustryPreset[]> = {};
  for (const preset of PRESET_LIST) {
    const parentId = preset.parentId;
    if (!parentId) continue;
    const siblings = map[parentId] ?? [];
    siblings.push(preset);
    map[parentId] = siblings;
  }
  return map;
})();

const UNIVERSAL_PRESET = PRESETS[UNIVERSAL_PRESET_ID] as IndustryPreset;

/** Industry picker options, derived from the registry (parents only). */
export const INDUSTRIES: IndustryOption[] = PRESET_LIST.filter(
  (preset) => preset.parentId === undefined,
).map((preset) => ({ key: preset.industryKey, emoji: preset.emoji, label: preset.name }));

export function presetForId(id: string | null | undefined): IndustryPreset | undefined {
  return id ? PRESETS[id] : undefined;
}

/** Explicit presetId wins; otherwise the stored industry label decides. */
export function resolvePresetId(industry: string | null | undefined, presetId?: string | null): string {
  if (presetId && PRESETS[presetId]) return presetId;
  return PRESET_ID_BY_INDUSTRY[industry ?? ""] ?? UNIVERSAL_PRESET_ID;
}

export function presetForConfig(
  industry: string | null | undefined,
  config: CrmConfigData | null | undefined,
): IndustryPreset {
  return PRESETS[resolvePresetId(industry, config?.presetId)] ?? UNIVERSAL_PRESET;
}

/** Module payload for a preset (the industry it is built on). */
export function crmConfigForPreset(id: string): CrmConfigData {
  const preset = PRESETS[id];
  if (!preset) return GENERIC_PRESET;
  return INDUSTRY_PRESETS[preset.industryKey] ?? GENERIC_PRESET;
}

/** Stored configs predate presetId — fill it in so the UI always has an identity. */
export function attachPresetId(
  industry: string | null | undefined,
  config: CrmConfigData,
): CrmConfigData {
  const presetId = resolvePresetId(industry, config.presetId);
  if (config.presetId === presetId) return config;
  return { ...config, presetId };
}

export function enabledModuleKeys(id: string): string[] {
  const preset = PRESETS[id];
  const hidden = new Set(preset?.hiddenModuleKeys ?? []);
  return crmConfigForPreset(id)
    .modules.map((m) => m.key)
    .filter((key) => !hidden.has(key));
}

export function isModuleEnabled(id: string, moduleKey: string): boolean {
  const preset = PRESETS[id];
  if (!preset) return true;
  return !preset.hiddenModuleKeys.includes(moduleKey);
}

/** Modules holding patient data (diagnoses, lab results, medical cards) for this preset. */
export function medicalModuleKeys(id: string): string[] {
  return PRESETS[id]?.medicalModuleKeys ?? [];
}

export function isMedicalModule(id: string, moduleKey: string): boolean {
  return medicalModuleKeys(id).includes(moduleKey);
}

/**
 * Modules a tenant has but a target preset no longer offers. Switching presets
 * never deletes rows — these keys become orphans and must be reported instead of
 * silently disappearing from the menu.
 */
export function droppedModulesForPreset(config: CrmConfigData, targetId: string): CrmModule[] {
  const offered = new Set(enabledModuleKeys(targetId));
  return config.modules.filter((module) => !offered.has(module.key));
}

/**
 * Registry parts a stored config predates (modules, widgets or fields shipped after the
 * tenant onboarded). Syncing appends these; existing modules, fields and records are never
 * touched, so an admin who removed something keeps it removed until they ask for the sync.
 */
export function missingPresetParts(config: CrmConfigData, presetId: string): {
  modules: CrmModule[];
  widgets: CrmWidget[];
  fields: { moduleKey: string; fields: CrmField[] }[];
} {
  const preset = PRESETS[presetId];
  if (!preset) return { modules: [], widgets: [], fields: [] };
  const registry = crmConfigForPreset(presetId);
  const storedByKey = new Map(config.modules.map((m) => [m.key, m]));
  const hasWidget = new Set(config.dashboardWidgets.map((w) => w.key));
  const fields = registry.modules
    .map((module) => {
      const stored = storedByKey.get(module.key);
      if (!stored || !module.fields?.length) return null;
      const known = new Set((stored.fields ?? []).map((f) => f.key));
      const missingFields = module.fields.filter((f) => !known.has(f.key));
      return missingFields.length ? { moduleKey: module.key, fields: missingFields } : null;
    })
    .filter((entry): entry is { moduleKey: string; fields: CrmField[] } => entry !== null);
  return {
    modules: registry.modules.filter(
      (m) => !storedByKey.has(m.key) && isModuleEnabled(presetId, m.key),
    ),
    widgets: registry.dashboardWidgets.filter((w) => !hasWidget.has(w.key)),
    fields,
  };
}

/**
 * Append everything `missingPresetParts` found to a stored config. Existing modules keep
 * their order and their fields; new fields are appended at the end of that module's form,
 * so stored `crm_records.data` never needs a rewrite.
 */
export function applyMissingParts(
  config: CrmConfigData,
  presetId: string,
): { config: CrmConfigData; missing: ReturnType<typeof missingPresetParts> } {
  const missing = missingPresetParts(config, presetId);
  const fieldsByModule = new Map(missing.fields.map((entry) => [entry.moduleKey, entry.fields]));
  const next: CrmConfigData = {
    ...config,
    presetId,
    modules: [
      ...config.modules.map((module) => {
        const added = fieldsByModule.get(module.key);
        return added ? { ...module, fields: [...(module.fields ?? []), ...added] } : module;
      }),
      ...missing.modules,
    ],
    dashboardWidgets: [...config.dashboardWidgets, ...missing.widgets],
  };
  return { config: next, missing };
}

export function menuForPreset(id: string): PresetMenuItem[] {
  const preset = PRESETS[id];
  if (!preset) return [];
  const label = (key: CoreKey) => preset.labels?.[key] ?? CORE_ITEMS[key].label;
  const withLabel = (key: CoreKey): PresetMenuItem => ({ ...CORE_ITEMS[key], label: label(key) });
  const extras = preset.extraCoreKeys.filter((key) => key !== "pipeline");
  const menu: PresetMenuItem[] = [
    { to: "/dashboard", label: "Umumiy ko‘rinish", icon: "dashboard", section: "core" },
  ];
  if (preset.extraCoreKeys.includes("pipeline")) menu.push(withLabel("pipeline"));
  for (const key of LEGACY_CORE_KEYS) menu.push(withLabel(key));
  for (const key of extras) menu.push(withLabel(key));
  menu.push(...preset.industryItems);
  menu.push(...ADMIN_TAIL);
  return menu;
}

/** Workflow sets a preset runs on — pipeline stages plus booking statuses. */
export function workflowForPreset(id: string): {
  bookingType: BookingType;
  bookingLabel: string;
  pipelineStages: string[];
  appointmentStatuses: readonly AppointmentStatus[];
} {
  const preset = presetForId(id) ?? UNIVERSAL_PRESET;
  return {
    bookingType: preset.bookingType,
    bookingLabel: BOOKING_TYPE_LABELS[preset.bookingType],
    pipelineStages: crmConfigForPreset(preset.id).pipelineStages,
    appointmentStatuses: APPOINTMENT_STATUSES,
  };
}
