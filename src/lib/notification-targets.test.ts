// @ts-nocheck
import { describe, expect, test } from "bun:test";

import { audienceCount, countAudiences } from "./notification-targets";

const U = (n) => `user-${n}`;
const B = (n) => `biz-${n}`;

function fixture() {
  return {
    members: [
      { business_id: B("1"), user_id: U("1") },
      { business_id: B("1"), user_id: U("2") },
      { business_id: B("2"), user_id: U("2") },
      { business_id: B("2"), user_id: U("3") },
      { business_id: B("3"), user_id: U("4") },
      { business_id: B("4"), user_id: U("1") },
    ],
    businesses: [
      { id: B("1"), plan: "pro", status: "active" },
      { id: B("2"), plan: "start", status: "active" },
      { id: B("3"), plan: "free", status: "suspended" },
      { id: B("4"), plan: "pro", status: "active" },
    ],
    configs: [
      { business_id: B("1"), industry: "Stomatologiya" },
      { business_id: B("2"), industry: "Klinika" },
      { business_id: B("3"), industry: "Stomatologiya" },
      { business_id: B("4"), industry: "Stomatologiya" },
    ],
    profiles: [
      { id: U("1"), status: "active" },
      { id: U("2"), status: "active" },
      { id: U("3"), status: "suspended" },
      { id: U("4"), status: "active" },
    ],
  };
}

describe("announcement audiences", () => {
  test("skips suspended members and suspended workspaces", () => {
    const a = countAudiences(fixture());
    // user-3 is suspended and user-4 only belongs to a suspended workspace.
    expect(a.all).toBe(2);
    expect(a.byBusiness.get(B("2"))).toBe(1);
    expect(a.byBusiness.get(B("3"))).toBeUndefined();
  });

  test("counts people once even when they belong to several workspaces", () => {
    const a = countAudiences(fixture());
    expect(a.byBusiness.get(B("1"))).toBe(2);
    expect(a.byBusiness.get(B("4"))).toBe(1);
    expect(a.all).toBe(2);
  });

  test("buckets memberships by plan and by industry", () => {
    const a = countAudiences(fixture());
    // Per-bucket numbers count memberships, the same rows the RLS policy matches on;
    // only "all" is deduplicated to distinct people.
    expect(a.byPlan.get("pro")).toBe(3);
    expect(a.byPlan.get("start")).toBe(1);
    expect(a.byIndustry.get("Stomatologiya")).toBe(3);
    expect(a.byIndustry.get("Klinika")).toBe(1);
  });

  test("audienceCount resolves every target kind", () => {
    const a = countAudiences(fixture());
    expect(audienceCount(a, "all", null)).toBe(2);
    expect(audienceCount(a, "organization", B("1"))).toBe(2);
    expect(audienceCount(a, "plan", "pro")).toBe(3);
    expect(audienceCount(a, "industry", "Klinika")).toBe(1);
  });

  test("an unknown or empty target reaches nobody, so a send to it is refused", () => {
    const a = countAudiences(fixture());
    expect(audienceCount(a, "organization", B("9"))).toBe(0);
    expect(audienceCount(a, "plan", "enterprise")).toBe(0);
    expect(audienceCount(a, "industry", null)).toBe(0);
    expect(audienceCount(a, "nonsense", "Stomatologiya")).toBe(0);
  });

  test("an industry without a crm_config row is not reachable", () => {
    const a = countAudiences({ ...fixture(), configs: [] });
    expect(a.byIndustry.size).toBe(0);
    expect(audienceCount(a, "industry", "Stomatologiya")).toBe(0);
    expect(a.all).toBe(2);
  });
});
