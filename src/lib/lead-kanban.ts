import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Yangi",
  needs_operator: "Operator kerak",
  assigned: "Biriktirilgan",
  contacted: "Bog'lanildi",
  negotiating: "Muzokara",
  won: "Yutildi",
  lost: "Yo'qotildi",
};

export function groupLeads<T extends { status: LeadStatus }>(rows: T[]) {
  return LEAD_STATUSES.map((status) => ({ status, rows: rows.filter((row) => row.status === status) }));
}

export function leadStatusChange(current: LeadStatus, target: string): LeadStatus | null {
  const status = LEAD_STATUSES.find((value) => value === target);
  return status && status !== current ? status : null;
}