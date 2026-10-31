import type { DbClient } from "./pg-rest.server";
import { requireBusinessId } from "./tenant.server";
import { can, type MemberRole, type Permission } from "./roles";

/**
 * Server tomonidagi rol tekshiruvi. UI tugmani yashirishi mumkin, lekin
 * server funksiyani chaqirishni to'xtatmaydi — shuning uchun har yozuv
 * amali shu yerdan o'tadi.
 */
export async function requirePermission(
  supabase: DbClient,
  permission: Permission,
  deniedMessage: string,
): Promise<string> {
  const businessId = await requireBusinessId(supabase);
  const { data: role, error } = await supabase.rpc("business_role", { _business_id: businessId });
  if (error) throw new Error(error.message);
  if (!can(role as MemberRole | null, permission)) throw new Error(deniedMessage);
  return businessId;
}
