/**
 * Dental chart model for the stomatology preset.
 *
 * Findings are stored as ordinary `crm_records` rows of the "odontogramma" module, so
 * tenancy, module enablement and the CRM editor keep working without a dedicated table.
 * This file owns the FDI numbering, the condition vocabulary and the aggregation the
 * chart renders — all pure, so it can be tested without React or Supabase.
 */

export const ODONTOGRAMMA_MODULE = "odontogramma";

/** Field keys inside crm_records.data — must match the module definition in crm-config.ts. */
export const TOOTH_FIELD_KEYS = {
  patient: "bemor",
  patientId: "bemor_id",
  tooth: "tish",
  condition: "holat",
  recommendation: "tavsiya",
  date: "sana",
  doctor: "shifokor",
  doctorId: "shifokor_id",
  price: "narx",
  note: "izoh",
} as const;

/** Upper arch, read left to right as the dentist faces the patient (patient's right side first). */
export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];

/** Lower arch, same viewer orientation. */
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const ADULT_TEETH = [...UPPER_TEETH, ...LOWER_TEETH];

const TOOTH_POSITION_NAMES: Record<number, string> = {
  1: "Markaziy kesuvchi",
  2: "Yon kesuvchi",
  3: "Jilqim",
  4: "Birinchi o‘ri",
  5: "Ikkinchi o‘ri",
  6: "Birinchi chiynak",
  7: "Ikkinchi chiynak",
  8: "Aql tishi",
};

const QUADRANT_NAMES: Record<number, string> = {
  1: "Yuqori o‘ng",
  2: "Yuqori chap",
  3: "Pastki chap",
  4: "Pastki o‘ng",
};

/** Adult dentition only — primary teeth (FDI 51–85) are out of scope for this chart. */
export function isValidTooth(value: number): boolean {
  return Number.isInteger(value) && ADULT_TEETH.includes(value);
}

export function parseTooth(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(parsed)) return null;
  return isValidTooth(parsed) ? parsed : null;
}

export function toothQuadrant(tooth: number): number {
  return Math.floor(tooth / 10);
}

export function toothName(tooth: number): string {
  const position = tooth % 10;
  return TOOTH_POSITION_NAMES[position] ?? "";
}

export function quadrantName(tooth: number): string {
  return QUADRANT_NAMES[toothQuadrant(tooth)] ?? "";
}

/** Treated/healthy states never count as "needs attention". */
export const TOOTH_CONDITIONS = [
  "Sog‘lom",
  "Plomba",
  "Kanallar davolangan",
  "Koronka",
  "Ko‘prik",
  "Implant",
  "Olindi",
  "Karies",
  "Pulpit",
  "Periodontit",
  "Davolash kerak",
] as const;

const ATTENTION_CONDITIONS = new Set(["Karies", "Pulpit", "Periodontit", "Davolash kerak"]);
const MISSING_CONDITIONS = new Set(["Olindi"]);

export function needsAttention(condition: string): boolean {
  return ATTENTION_CONDITIONS.has(condition);
}

export function isMissingTooth(condition: string): boolean {
  return MISSING_CONDITIONS.has(condition);
}

/** Chart cell colours; unknown conditions fall back to a neutral chip. */
export function conditionStyle(condition: string): string {
  if (!condition) return "border-border bg-muted text-muted-foreground";
  if (condition === "Sog‘lom") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (isMissingTooth(condition)) return "border-slate-400 bg-slate-200 text-slate-700";
  if (ATTENTION_CONDITIONS.has(condition)) return "border-rose-300 bg-rose-50 text-rose-800";
  return "border-sky-300 bg-sky-50 text-sky-800";
}

export interface ToothFinding {
  id: string;
  tooth: number | null;
  patientId: string | null;
  condition: string;
  recommendation: string;
  date: string;
  doctor: string;
  doctorId: string | null;
  price: number;
  note: string;
  createdAt: string;
}

type FindingRow = {
  id: string;
  created_at: string;
  data: Record<string, unknown> | null;
};

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export function toToothFinding(row: FindingRow): ToothFinding {
  const data = row.data ?? {};
  return {
    id: row.id,
    tooth: parseTooth(data[TOOTH_FIELD_KEYS.tooth]),
    patientId: text(data[TOOTH_FIELD_KEYS.patientId]) || null,
    condition: text(data[TOOTH_FIELD_KEYS.condition]),
    recommendation: text(data[TOOTH_FIELD_KEYS.recommendation]),
    date: text(data[TOOTH_FIELD_KEYS.date]),
    doctor: text(data[TOOTH_FIELD_KEYS.doctor]),
    doctorId: text(data[TOOTH_FIELD_KEYS.doctorId]) || null,
    price: Number.parseFloat(text(data[TOOTH_FIELD_KEYS.price])) || 0,
    note: text(data[TOOTH_FIELD_KEYS.note]),
    createdAt: row.created_at,
  };
}

/** Newest first: the record date the clinician entered wins over the insertion time. */
export function sortFindings(findings: ToothFinding[]): ToothFinding[] {
  return [...findings].sort((a, b) => {
    const byDate = (b.date || "").localeCompare(a.date || "");
    if (byDate !== 0) return byDate;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}

/** Findings grouped by tooth number; unnumbered rows are dropped from the chart. */
export function findingsByTooth(findings: ToothFinding[]): Map<number, ToothFinding[]> {
  const grouped = new Map<number, ToothFinding[]>();
  for (const finding of sortFindings(findings)) {
    if (finding.tooth === null) continue;
    const bucket = grouped.get(finding.tooth);
    if (bucket) bucket.push(finding);
    else grouped.set(finding.tooth, [finding]);
  }
  return grouped;
}

export interface DentalSummary {
  recorded: number;
  attention: number;
  missing: number;
  planned: number;
  plannedCost: number;
}

/** Every number is derived from stored findings — the chart shows no invented statistics. */
export function dentalSummary(findings: ToothFinding[]): DentalSummary {
  const latest = findingsByTooth(findings);
  let attention = 0;
  let missing = 0;
  let planned = 0;
  let plannedCost = 0;
  for (const list of latest.values()) {
    const current = list[0];
    if (!current) continue;
    if (needsAttention(current.condition)) attention += 1;
    if (isMissingTooth(current.condition)) missing += 1;
    if (current.recommendation.trim() !== "") {
      planned += 1;
      plannedCost += current.price;
    }
  }
  return { recorded: latest.size, attention, missing, planned, plannedCost };
}

export function odontogramTitle(finding: { tooth: number | null; condition: string }): string {
  const tooth = finding.tooth === null ? "Tish" : `Tish ${finding.tooth}`;
  return finding.condition ? `${tooth} — ${finding.condition}` : tooth;
}

export interface ToothFindingDraft {
  patient: string;
  patientId: string;
  tooth: number;
  condition: string;
  recommendation: string;
  date: string;
  doctor: string;
  doctorId: string | null;
  price: string;
  note: string;
}

/** Payload for crm_records.data, built from the chart dialog form. */
export function toFindingData(input: ToothFindingDraft): Record<string, unknown> {
  return {
    [TOOTH_FIELD_KEYS.patient]: input.patient,
    [TOOTH_FIELD_KEYS.patientId]: input.patientId,
    [TOOTH_FIELD_KEYS.tooth]: String(input.tooth),
    [TOOTH_FIELD_KEYS.condition]: input.condition,
    [TOOTH_FIELD_KEYS.recommendation]: input.recommendation,
    [TOOTH_FIELD_KEYS.date]: input.date,
    [TOOTH_FIELD_KEYS.doctor]: input.doctor,
    [TOOTH_FIELD_KEYS.doctorId]: input.doctorId || null,
    [TOOTH_FIELD_KEYS.price]: input.price,
    [TOOTH_FIELD_KEYS.note]: input.note,
  };
}

/** Form defaults for the dialog, filled from an existing finding when editing. */
export function toFindingDraft(finding: ToothFinding | null): ToothFindingDraft {
  return {
    patient: "",
    patientId: "",
    tooth: 0,
    condition: finding?.condition ?? "",
    recommendation: finding?.recommendation ?? "",
    date: finding?.date ?? new Date().toISOString().slice(0, 10),
    doctor: finding?.doctor ?? "",
    doctorId: finding?.doctorId ?? "",
    price: finding?.price ? String(finding.price) : "",
    note: finding?.note ?? "",
  };
}
