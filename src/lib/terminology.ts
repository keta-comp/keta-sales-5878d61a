/**
 * Client-side wording for the tenant's industry: page titles, "Yangi …" buttons, toasts.
 * `coreTerm` (presets.ts) is the single source, so a section can never be called one thing
 * in the menu and another on its own page.
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMyCrmConfig } from "./crm-config.functions";
import { type CoreKey, resolvePresetId, termsForPreset } from "./presets";

export type Term = { one: string; many: string };

export type Terminology = {
  loading: boolean;
  presetId: string;
  term: (key: CoreKey) => Term;
};

export function useTerminology(): Terminology {
  const fetchConfig = useServerFn(getMyCrmConfig);
  const config = useQuery({ queryKey: ["crm-config"], queryFn: () => fetchConfig() });
  const presetId = resolvePresetId(config.data?.industry, config.data?.config?.presetId);
  const terms = termsForPreset(presetId);
  return { loading: config.isPending, presetId, term: (key) => terms[key] };
}
