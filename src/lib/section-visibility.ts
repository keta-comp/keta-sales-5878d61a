/**
 * Client-side view of "which core sections may this tenant see at all".
 * The preset is the only source of truth (see presets.ts); this hook just caches the
 * tenant's crm-config and turns it into the set of routes that must not be linked,
 * rendered or opened.
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMyCrmConfig } from "./crm-config.functions";
import { hiddenRoutesForPreset, menuForPreset, resolvePresetId } from "./presets";

export type SectionVisibility = {
  loading: boolean;
  presetId: string;
  hidden: Set<string>;
  isHidden: (to: string) => boolean;
  /** Preset menusida bu yo‘nalish bormi — maxsus sahifalar (Kurslar, Guruhlar) shu bilan qo‘riqlanadi. */
  offers: (to: string) => boolean;
};

export function useSectionVisibility(): SectionVisibility {
  const fetchConfig = useServerFn(getMyCrmConfig);
  const config = useQuery({ queryKey: ["crm-config"], queryFn: () => fetchConfig() });
  const presetId = resolvePresetId(config.data?.industry, config.data?.config?.presetId);
  const hidden = hiddenRoutesForPreset(presetId);
  const offered = new Set(menuForPreset(presetId).map((item) => item.to));
  return {
    loading: config.isPending,
    presetId,
    hidden,
    isHidden: (to) => hidden.has(to),
    offers: (to) => offered.has(to),
  };
}

/** True once the config has arrived and this section is switched off for the tenant. */
export function useHiddenSection(to: string): boolean {
  const { loading, hidden } = useSectionVisibility();
  return !loading && hidden.has(to);
}
