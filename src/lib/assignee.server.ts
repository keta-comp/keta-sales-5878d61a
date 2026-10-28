import type { DbClient } from "./pg-rest.server";

import { requireBusinessId } from "./tenant.server";

type Client = DbClient;

export type AssigneeRow = { assigned_member_id: string | null };

/**
 * Membership id -> display name for one business. Names live on profiles, so the two
 * tables are joined here; service-role reads are scoped by business_id.
 * Pass `memberIds` to narrow the read, or omit it for the whole team.
 */
export async function assigneeNameMap(businessId: string, memberIds?: (string | null)[]) {
  const wanted = memberIds ? new Set(memberIds.filter((id): id is string => Boolean(id))) : null;
  if (wanted?.size === 0) return new Map<string, string>();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: members } = await supabaseAdmin
    .from("business_members")
    .select("id, user_id")
    .eq("business_id", businessId);

  const rows = (members ?? []).filter((member) => !wanted || wanted.has(member.id));
  const userIds = rows.map((member) => member.user_id);
  const { data: profiles } = userIds.length
    ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const nameBy = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email || "A'zo"]));

  return new Map(rows.map((member) => [member.id, nameBy.get(member.user_id) ?? "A'zo"]));
}

/** Adds `assignee_name` to rows that carry assigned_member_id, in one extra read. */
export async function withAssigneeNames<T extends AssigneeRow>(supabase: Client, rows: T[]) {
  const names = await assigneeNameMap(
    await requireBusinessId(supabase),
    rows.map((row) => row.assigned_member_id),
  );
  return rows.map((row) => withName(row, names));
}

/** Same enrichment for a single row, keeping the result non-optional. */
export async function withAssigneeName<T extends AssigneeRow>(supabase: Client, row: T) {
  const names = await assigneeNameMap(
    await requireBusinessId(supabase),
    [row.assigned_member_id],
  );
  return withName(row, names);
}

function withName<T extends AssigneeRow>(row: T, names: Map<string, string>) {
  return {
    ...row,
    assignee_name: row.assigned_member_id ? (names.get(row.assigned_member_id) ?? null) : null,
  };
}

/** The membership row of a user inside the current business (one row per business + user). */
export async function currentMembershipId(supabase: Client, userId: string) {
  const businessId = await requireBusinessId(supabase);
  const { data } = await supabase
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}
