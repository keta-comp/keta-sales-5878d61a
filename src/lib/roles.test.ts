// @ts-nocheck
import { describe, expect, test } from "bun:test";

import { ASSIGNABLE_ROLES, can, isAdminRole, isDemotionBelow, MEMBER_ROLES, ROLE_LABELS } from "./roles";

describe("role permissions", () => {
  test("owner and admin hold every permission", () => {
    for (const role of ["owner", "admin"] as const) {
      expect(can(role, "members.manage")).toBe(true);
      expect(can(role, "settings.manage")).toBe(true);
      expect(can(role, "finance.view")).toBe(true);
      expect(can(role, "customers.delete")).toBe(true);
      expect(can(role, "sales.manage")).toBe(true);
    }
  });

  test("manager runs operations but cannot manage members or settings", () => {
    expect(can("manager", "members.manage")).toBe(false);
    expect(can("manager", "settings.manage")).toBe(false);
    expect(can("manager", "finance.view")).toBe(true);
    expect(can("manager", "reports.export")).toBe(true);
    expect(can("manager", "catalog.manage")).toBe(true);
    expect(can("manager", "appointments.manage")).toBe(true);
  });

  test("receptionist handles appointments but not finances", () => {
    expect(can("receptionist", "appointments.manage")).toBe(true);
    expect(can("receptionist", "finance.view")).toBe(false);
    expect(can("receptionist", "members.manage")).toBe(false);
  });

  test("cashier is a sales-only role", () => {
    expect(can("cashier", "sales.manage")).toBe(true);
    expect(can("cashier", "finance.view")).toBe(false);
    expect(can("cashier", "catalog.manage")).toBe(false);
    expect(can("cashier", "appointments.manage")).toBe(false);
  });

  test("patient data belongs to clinical roles only", () => {
    for (const role of ["owner", "admin", "manager"] as const) expect(can(role, "medical.view")).toBe(true);
    for (const role of ["receptionist", "cashier", null, undefined] as const) {
      expect(can(role, "medical.view")).toBe(false);
    }
  });

  test("the retired sales-agent role is gone from the model", () => {
    expect(MEMBER_ROLES).not.toContain("operator");
    expect(ASSIGNABLE_ROLES).not.toContain("operator");
    expect(can("operator" as MemberRole, "sales.manage")).toBe(false);
  });

  test("unknown or missing roles get nothing", () => {
    expect(can(null, "sales.manage")).toBe(false);
    expect(can(undefined, "sales.manage")).toBe(false);
  });
});

describe("role administration rules", () => {
  test("isAdminRole matches owner and admin only", () => {
    expect(isAdminRole("owner")).toBe(true);
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("manager")).toBe(false);
    expect(isAdminRole("cashier")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });

  test("losing admin access counts as a demotion", () => {
    expect(isDemotionBelow("admin", "cashier")).toBe(true);
    expect(isDemotionBelow("owner", "manager")).toBe(true);
    expect(isDemotionBelow("admin", "owner")).toBe(false);
    expect(isDemotionBelow("cashier", "manager")).toBe(false);
  });

  test("owner is granted, never assigned through the team UI", () => {
    expect(ASSIGNABLE_ROLES).not.toContain("owner");
    for (const role of ASSIGNABLE_ROLES) expect(MEMBER_ROLES).toContain(role);
  });

  test("every role has an Uzbek label", () => {
    for (const role of MEMBER_ROLES) expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
  });
});
