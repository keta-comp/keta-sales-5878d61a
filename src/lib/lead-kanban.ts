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
export type LeadTaskState = "overdue" | "today" | "planned" | "none" | "closed";
type TaskLite = { lead_id: string | null; status: string; due_date: string | null };

/** amoCRM "golden rule": every open lead needs a next open task. */
export function leadTaskState(leadStatus: LeadStatus, tasks: TaskLite[], now = new Date()): LeadTaskState {
  if (leadStatus === "won" || leadStatus === "lost") return "closed";
  const open = tasks.filter((task) => task.status !== "completed");
  if (open.length === 0) return "none";
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const dues = open.map((task) => (task.due_date ? new Date(task.due_date).getTime() : null));
  if (dues.some((due) => due !== null && due < now.getTime())) return "overdue";
  if (dues.some((due) => due !== null && due <= endOfToday.getTime())) return "today";
  return "planned";
}

export function leadTaskStates<T extends { id: string; status: LeadStatus }>(leads: T[], tasks: TaskLite[], now = new Date()) {
  const byLead = new Map<string, TaskLite[]>();
  for (const task of tasks) {
    if (!task.lead_id) continue;
    byLead.set(task.lead_id, [...(byLead.get(task.lead_id) ?? []), task]);
  }
  return Object.fromEntries(leads.map((lead) => [lead.id, leadTaskState(lead.status, byLead.get(lead.id) ?? [], now)])) as Record<string, LeadTaskState>;
}
