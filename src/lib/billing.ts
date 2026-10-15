// Shared, browser-safe tariff definitions and access rules.
export type PlanKey = "start" | "pro" | "max";
export type Feature = "ai_assistant" | "excel_export" | "telegram_reports";

export const TRIAL_DAYS = 7;
export const PERIOD_DAYS = 30;

export const PLANS: Record<PlanKey, { name: string; price: number; maxUsers: number | null; features: Feature[] }> = {
  start: { name: "Start", price: 49_000, maxUsers: 2, features: [] },
  pro: { name: "Pro", price: 99_000, maxUsers: 5, features: ["ai_assistant", "excel_export", "telegram_reports"] },
  max: { name: "Max", price: 149_000, maxUsers: null, features: ["ai_assistant", "excel_export", "telegram_reports"] },
};
export const PLAN_KEYS: PlanKey[] = ["start", "pro", "max"];

export type AccessInput = {
  plan?: string | null;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
  is_super_admin?: boolean | null;
};
export type AccessState = "active" | "trial" | "expired";

/** Temporary: every registered user gets unlimited access until billing is switched on. */
export const UNLIMITED_ACCESS = true;

export function computeAccess(s: AccessInput, now = Date.now()): AccessState {
  if (UNLIMITED_ACCESS || s.is_super_admin) return "active";
  if (s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() > now) return "active";
  if (s.trial_ends_at && new Date(s.trial_ends_at).getTime() > now) return "trial";
  return "expired";
}

export function hasFeature(s: AccessInput, feature: Feature, now = Date.now()): boolean {
  const access = computeAccess(s, now);
  if (access === "expired") return false;
  if (UNLIMITED_ACCESS || access === "trial" || s.is_super_admin) return true;
  const plan = PLANS[s.plan as PlanKey];
  return plan ? plan.features.includes(feature) : false;
}

/** New subscription end: extends from the later of now and the current end. */
export function extendSubscription(currentEnd: string | null | undefined, now = Date.now()): string {
  const base = Math.max(now, currentEnd ? new Date(currentEnd).getTime() : 0);
  return new Date(base + PERIOD_DAYS * 86_400_000).toISOString();
}

export function daysLeft(until: string | null | undefined, now = Date.now()): number {
  if (!until) return 0;
  return Math.max(0, Math.ceil((new Date(until).getTime() - now) / 86_400_000));
}
