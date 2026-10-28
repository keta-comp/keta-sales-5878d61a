// @ts-nocheck
import { describe, expect, test } from "bun:test";

import { hasFeature, PLAN_IDS, PLAN_KEYS, PLANS, TRIAL_DAYS } from "./billing";

describe("plan vocabulary", () => {
  test("the stored plan list is free plus every sellable plan", () => {
    expect(PLAN_IDS[0]).toBe("free");
    expect([...PLAN_IDS].slice(1).sort()).toEqual([...PLAN_KEYS].sort());
  });

  test("no plan name outside the vocabulary survives", () => {
    for (const legacy of ["starter", "business", "enterprise"]) {
      expect(PLAN_IDS).not.toContain(legacy);
      expect(PLANS[legacy]).toBeUndefined();
    }
  });

  test("features only ever grow with the price", () => {
    const start = new Set(PLANS.start.features);
    const pro = new Set(PLANS.pro.features);
    const max = new Set(PLANS.max.features);
    for (const f of start) expect(pro.has(f)).toBe(true);
    for (const f of pro) expect(max.has(f)).toBe(true);
    expect(PLANS.start.price < PLANS.pro.price).toBe(true);
    expect(PLANS.pro.price < PLANS.max.price).toBe(true);
    expect(TRIAL_DAYS).toBeGreaterThan(0);
  });
});

describe("feature flags over plans", () => {
  const state = { plan: "max", subscription_ends_at: null, trial_ends_at: null };

  test("a Control Center flag switched off hides the feature even on the top plan", () => {
    expect(
      hasFeature({ ...state, features: { ai_assistant: false } }, "ai_assistant"),
    ).toBe(false);
  });

  test("a flag that does not address this workspace is absent, not false", () => {
    expect(hasFeature({ ...state, features: {} }, "ai_assistant")).toBe(
      hasFeature({ ...state, features: null }, "ai_assistant"),
    );
  });

  test("an enabled flag opens the feature for a paying workspace on a plan that lacks it", () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const free = { plan: "free", subscription_ends_at: future, trial_ends_at: null };
    expect(hasFeature({ ...free, features: { telegram_reports: true } }, "telegram_reports")).toBe(true);
  });
});
