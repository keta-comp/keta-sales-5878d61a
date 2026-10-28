/**
 * Audience rules for platform announcements, kept out of the data layer so they can be
 * tested and stay in step with the system_notifications RLS policy: a person is reached
 * only when their profile is not suspended and their workspace is not suspended.
 */

export interface NotificationAudiences {
  all: number;
  byBusiness: Map<string, number>;
  byPlan: Map<string, number>;
  byIndustry: Map<string, number>;
}

export interface AudienceInput {
  members: { business_id: string; user_id: string }[];
  businesses: { id: string; plan: string; status: string }[];
  configs: { business_id: string; industry: string | null }[];
  profiles: { id: string; status: string }[];
}

export function countAudiences({ members, businesses, configs, profiles }: AudienceInput): NotificationAudiences {
  const activeProfiles = new Set(profiles.filter((p) => p.status !== "suspended").map((p) => p.id));
  const openBusinesses = new Map(
    businesses.filter((b) => b.status !== "suspended").map((b) => [b.id, b.plan]),
  );
  const industryBy = new Map(configs.map((c) => [c.business_id, c.industry]));

  const byBusiness = new Map<string, number>();
  const byPlan = new Map<string, number>();
  const byIndustry = new Map<string, number>();
  // One person can belong to several workspaces; "all" counts people, not memberships.
  const everyone = new Set<string>();

  for (const m of members) {
    if (!activeProfiles.has(m.user_id)) continue;
    const plan = openBusinesses.get(m.business_id);
    if (!plan) continue;
    everyone.add(m.user_id);
    byBusiness.set(m.business_id, (byBusiness.get(m.business_id) ?? 0) + 1);
    byPlan.set(plan, (byPlan.get(plan) ?? 0) + 1);
    const industry = industryBy.get(m.business_id);
    if (industry) byIndustry.set(industry, (byIndustry.get(industry) ?? 0) + 1);
  }

  return { all: everyone.size, byBusiness, byPlan, byIndustry };
}

export function audienceCount(
  audiences: NotificationAudiences,
  targetKind: string,
  targetValue: string | null,
): number {
  if (targetKind === "all") return audiences.all;
  if (!targetValue) return 0;
  if (targetKind === "organization") return audiences.byBusiness.get(targetValue) ?? 0;
  if (targetKind === "plan") return audiences.byPlan.get(targetValue) ?? 0;
  if (targetKind === "industry") return audiences.byIndustry.get(targetValue) ?? 0;
  return 0;
}
