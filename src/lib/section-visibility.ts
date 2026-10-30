/**
 * Client-side view of "which core sections may this tenant see at all".
 * The preset is the only source of truth (see presets.ts); this hook just caches the
 * tenant's crm-config and turns it into the set of routes that must not be linked,
 * rendered or opened.
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMyCrmConfig } from "./crm-config.functions";
import { hiddenRoutesForPreset, resolvePresetId } from "./presets";

export type SectionVisibility = {
  loading: boolean;
  hidden: Set<string>;
  isHidden: (to: string) => boolean;
};

export function useSectionVisibility(): SectionVisibility {
  const fetchConfig = useServerFn(getMyCrmConfig);
  const config = useQuery({ queryKey: ["crm-config"], queryFn: () => fetchConfig() });
  const hidden = hiddenRoutesForPreset(
    resolvePresetId(config.data?.industry, config.data?.config?.presetId),
  );
  return { loading: config.isPending, hidden, isHidden: (to) => hidden.has(to) };
}

/** True once the config has arrived and this section is switched off for the tenant. */
export function useHiddenSection(to: string): boolean {
  const { loading, hidden } = useSectionVisibility();
  return !loading && hidden.has(to);
}
