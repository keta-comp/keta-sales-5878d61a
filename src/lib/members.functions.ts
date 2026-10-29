import { createServerFn } from "@tanstack/react-start";
import type { DbClient } from "./pg-rest.server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/lib/auth-middleware";
import { requireBusinessId } from "./tenant.server";
import { ASSIGNABLE_ROLES, isAdminRole, isDemotionBelow, ROLE_LABELS, type MemberRole } from "./roles";

type AuthedContext = { supabase: DbClient; userId: string };

export type TeamMember = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: MemberRole;
  branch_id: string | null;
  branch_name: string | null;
  created_at: string;
  isSelf: boolean;
};

async function loadTeam(context: AuthedContext) {
  const businessId = await requireBusinessId(context.supabase);
  const { supabaseAdmin } = await import("@/lib/platform.server");

  const [{ data: myRole }, { data: rows, error }] = await Promise.all([
    context.supabase.rpc("business_role", { _business_id: businessId }),
    supabaseAdmin
      .from("business_members")
      .select("id, user_id, role, branch_id, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true }),
  ]);
  if (error) throw new Error(error.message);

  const userIds = (rows ?? []).map((row) => row.user_id);
  const { data: profiles } = userIds.length
    ? await supabaseAdmin.from("profiles").select("id, email, full_name").in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: branches } = await supabaseAdmin
    .from("branches")
    .select("id, name")
    .eq("business_id", businessId);
  const branchById = new Map((branches ?? []).map((b) => [b.id, b.name]));

  const members: TeamMember[] = (rows ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    email: profileById.get(row.user_id)?.email ?? null,
    full_name: profileById.get(row.user_id)?.full_name ?? null,
    role: row.role as MemberRole,
    branch_id: row.branch_id ?? null,
    branch_name: row.branch_id ? (branchById.get(row.branch_id) ?? null) : null,
    created_at: row.created_at,
    isSelf: row.user_id === context.userId,
  }));

  return {
    businessId,
    myRole: (myRole as MemberRole | null) ?? null,
    isAdmin: isAdminRole(myRole as MemberRole | null),
    members,
  };
}

export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadTeam(context));

/** People a lead, order, task or conversation can be assigned to — the business team. */
export const listAssignees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const team = await loadTeam(context);
    return team.members.map((member) => ({
      id: member.id,
      full_name: member.full_name || member.email || "A'zo",
    }));
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        memberId: z.string().uuid(),
        role: z.enum(["owner", "admin", "manager", "receptionist", "cashier"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const team = await loadTeam(context);
    if (!team.isAdmin) throw new Error("Faqat egasi yoki admin rollarni o'zgartira oladi.");

    const target = team.members.find((member) => member.id === data.memberId);
    if (!target) throw new Error("A'zo topilmadi.");
    if (target.isSelf) throw new Error("O'z rolingizni o'zgartira olmaysiz.");
    if (target.role === "owner" && team.myRole !== "owner") {
      throw new Error("Ega rolini faqat egasining o'zi boshqaradi.");
    }
    if (data.role === "owner" && team.myRole !== "owner") {
      throw new Error("Ega rolini faqat egasining o'zi bera oladi.");
    }
    if (isDemotionBelow(target.role, data.role)) {
      const admins = team.members.filter((member) => isAdminRole(member.role));
      if (admins.length <= 1) throw new Error("Biznesda kamida bitta egasi yoki admin qolishi kerak.");
    }

    const { error } = await context.supabase
      .from("business_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("business_id", team.businessId);
    if (error) throw new Error(error.message);

    const { logActivity } = await import("./activity.server");
    await logActivity(context.supabase, {
      entityType: "member",
      entityId: target.user_id,
      action: "role_changed",
      detail: `${ROLE_LABELS[target.role]} → ${ROLE_LABELS[data.role]}`,
      actorUserId: context.userId,
    });
    return { ok: true };
  });

export const setMemberBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        memberId: z.string().uuid(),
        branchId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const team = await loadTeam(context);
    if (!team.isAdmin) throw new Error("Faqat egasi yoki admin a'zolarni filialga biriktira oladi.");

    const target = team.members.find((member) => member.id === data.memberId);
    if (!target) throw new Error("A'zo topilmadi.");

    if (data.branchId) {
      const { supabaseAdmin } = await import("@/lib/platform.server");
      const { data: branch } = await supabaseAdmin
        .from("branches")
        .select("id")
        .eq("id", data.branchId)
        .eq("business_id", team.businessId)
        .maybeSingle();
      if (!branch) throw new Error("Filial topilmadi.");
    }

    const { error } = await context.supabase
      .from("business_members")
      .update({ branch_id: data.branchId })
      .eq("id", data.memberId)
      .eq("business_id", team.businessId);
    if (error) throw new Error(error.message);

    const { logActivity } = await import("./activity.server");
    await logActivity(context.supabase, {
      entityType: "member",
      entityId: target.user_id,
      action: "branch_changed",
      detail: data.branchId ?? "markazlashtirilmagan",
      actorUserId: context.userId,
    });
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ memberId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const team = await loadTeam(context);
    if (!team.isAdmin) throw new Error("Faqat egasi yoki admin a'zolarni o'chira oladi.");

    const target = team.members.find((member) => member.id === data.memberId);
    if (!target) throw new Error("A'zo topilmadi.");
    if (target.isSelf) throw new Error("O'zingizni ro'yxatdan o'chira olmaysiz.");
    if (target.role === "owner" && team.myRole !== "owner") {
      throw new Error("Egani faqat egasining o'zi o'chira oladi.");
    }
    if (isAdminRole(target.role)) {
      const admins = team.members.filter((member) => isAdminRole(member.role));
      if (admins.length <= 1) throw new Error("Biznesda kamida bitta egasi yoki admin qolishi kerak.");
    }

    const { error } = await context.supabase
      .from("business_members")
      .delete()
      .eq("id", data.memberId)
      .eq("business_id", team.businessId);
    if (error) throw new Error(error.message);

    const { logActivity } = await import("./activity.server");
    await logActivity(context.supabase, {
      entityType: "member",
      entityId: target.user_id,
      action: "member_removed",
      detail: target.email,
      actorUserId: context.userId,
    });
    return { ok: true };
  });
