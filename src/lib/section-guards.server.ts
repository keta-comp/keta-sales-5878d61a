/**
 * Server-side half of the preset section switch. The menu, the dashboard tiles and the
 * pages all hide themselves, and a write to a section the tenant does not offer is
 * refused here — so the hiding is not only cosmetic.
 */

import type { DbClient } from "./pg-rest.server";
import { hiddenRoutesForPreset, resolvePresetId } from "./presets";
import { requireBusinessId } from "./tenant.server";

export async function hiddenRoutesForTenant(supabase: DbClient): Promise<Set<string>> {
  const businessId = await requireBusinessId(supabase);
  const { data } = await supabase
    .from("crm_configs")
    .select("industry, config")
    .eq("business_id", businessId)
    .maybeSingle();
  const config = data?.config as { presetId?: string } | null;
  const presetId = resolvePresetId(data?.industry ?? null, config?.presetId);
  return hiddenRoutesForPreset(presetId);
}

/** Throws when this core section is switched off for the tenant's preset. */
export async function requireSection(supabase: DbClient, to: string): Promise<void> {
  if ((await hiddenRoutesForTenant(supabase)).has(to)) {
    throw new Error(`Bu soha uchun bo'lim o'chirilgan: ${to}`);
  }
}
