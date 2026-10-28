import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { can, type MemberRole } from "./roles";
import { requireBusinessId } from "./tenant.server";

type Client = SupabaseClient<Database>;

/** Branch CRUD belongs to owner/admin (same gate as member management). */
async function requireBranchAdmin(supabase: Client): Promise<string> {
  const businessId = await requireBusinessId(supabase);
  const { data: role, error } = await supabase.rpc("business_role", { _business_id: businessId });
  if (error) throw new Error(error.message);
  if (!can(role as MemberRole | null, "members.manage")) {
    throw new Error("Filiallarni faqat egasi yoki admin boshqaradi.");
  }
  return businessId;
}

export const listBranches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ includeInactive: z.boolean().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireBusinessId(context.supabase);
    let query = context.supabase.from("branches").select("*").order("name", { ascending: true });
    if (!data.includeInactive) query = query.eq("is_active", true);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().optional(),
        name: z.string().trim().min(1).max(120),
        address: z.string().max(300).optional(),
        phone: z.string().max(40).optional(),
        is_active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireBranchAdmin(context.supabase);
    const row = {
      name: data.name,
      address: data.address ?? "",
      phone: data.phone ?? "",
    };
    if (data.id) {
      const patch = data.is_active === undefined ? row : { ...row, is_active: data.is_active };
      const { error } = await context.supabase.from("branches").update(patch).eq("id", data.id);
      if (error) {
        if (error.code === "23505") throw new Error("Bu nomda filial allaqachon mavjud.");
        throw new Error(error.message);
      }
    } else {
      const { error } = await context.supabase.from("branches").insert({
        ...row,
        is_active: data.is_active ?? true,
        business_id: businessId,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Bu nomda filial allaqachon mavjud.");
        throw new Error(error.message);
      }
    }
    return { ok: true };
  });

export const deleteBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireBranchAdmin(context.supabase);
    const { error } = await context.supabase.from("branches").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
