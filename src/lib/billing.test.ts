import { describe, expect, it } from "vitest";
import { computeAccess, extendSubscription, hasFeature, PLANS, TRIAL_DAYS } from "./billing";

const now = Date.parse("2026-10-09T12:00:00Z");
const day = 86_400_000;

describe("tariflar", () => {
  it("narxlar", () => {
    expect(PLANS.start.price).toBe(49_000);
    expect(PLANS.pro.price).toBe(99_000);
    expect(PLANS.max.price).toBe(149_000);
  });
  it("7 kun bepul", () => expect(TRIAL_DAYS).toBe(7));
  it("sinov tugagach bloklanadi", () => {
    expect(computeAccess({ trial_ends_at: new Date(now + day).toISOString() }, now)).toBe("trial");
    expect(computeAccess({ trial_ends_at: new Date(now - day).toISOString() }, now)).toBe("expired");
  });
  it("Start'da AI yo'q, Pro'da bor", () => {
    const sub = new Date(now + day).toISOString();
    expect(hasFeature({ plan: "start", subscription_ends_at: sub }, "ai_assistant", now)).toBe(false);
    expect(hasFeature({ plan: "pro", subscription_ends_at: sub }, "ai_assistant", now)).toBe(true);
  });
  it("to'lov 30 kun qo'shadi", () => {
    expect(Date.parse(extendSubscription(null, now))).toBe(now + 30 * day);
  });
});
