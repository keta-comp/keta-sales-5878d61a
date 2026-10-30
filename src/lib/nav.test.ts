// @ts-nocheck
import { describe, expect, test } from "bun:test";

import { buildNavItems } from "@/lib/nav";
import { enabledModuleKeys, menuForPreset } from "@/lib/presets";

function crm(overrides = {}) {
  return {
    industry: "stomatologiya",
    role: "owner",
    branchCount: 0,
    config: { presetId: "stomatologiya", modules: [] },
    ...overrides,
  };
}

describe("sidebar navigation", () => {
  test("without config only the dashboard is offered", () => {
    expect(buildNavItems(undefined)).toEqual([
      { to: "/dashboard", label: "Umumiy ko‘rinish", icon: "dashboard", section: "core" },
    ]);
  });

  test("every preset menu entry is present for the owner", () => {
    const items = buildNavItems(crm());
    for (const entry of menuForPreset("stomatologiya")) expect(items.some((i) => i.to === entry.to)).toBe(true);
    expect(new Set(items.map((i) => i.to)).size).toBe(items.length);
  });

  test("restricted roles lose admin and finance entries but keep daily work", () => {
    const cashier = buildNavItems(crm({ role: "cashier" }));
    const paths = cashier.map((i) => i.to);
    expect(paths).toContain("/dashboard/customers");
    expect(paths).not.toContain("/dashboard/settings");
    expect(paths).not.toContain("/dashboard/finance");

    const receptionist = buildNavItems(crm({ role: "receptionist" }));
    expect(receptionist.map((i) => i.to)).toContain("/dashboard/appointments");
    expect(receptionist.map((i) => i.to)).not.toContain("/dashboard/payroll");
  });

  test("tenant modules join the menu without duplicating built-ins", () => {
    const items = buildNavItems(
      crm({
        config: {
          presetId: "stomatologiya",
          modules: [
            { key: "davolash_rejalari", label: "Davolash rejalari" },
            { key: "mijozlar", label: "Mijozlar", link: "/dashboard/customers" },
          ],
        },
      }),
    );
    const dynamic = items.find((i) => i.to === "/dashboard/crm/davolash_rejalari");
    expect(dynamic?.section).toBe("industry");
    // A configured module that points at a built-in page never duplicates or relabels it:
    // the preset's own terminology wins.
    expect(items.filter((i) => i.to === "/dashboard/customers").length).toBe(1);
    expect(items.find((i) => i.to === "/dashboard/customers")?.label).toBe("Bemorlar");

    const customOnly = buildNavItems(
      crm({ config: { presetId: "universal", modules: [{ key: "yetakchi", label: "Yetakchilar" }] } }),
    );
    expect(customOnly.some((i) => i.to === "/dashboard/crm/yetakchi")).toBe(true);
  });

  test("a module linked to a switched-off section never reaches the menu", () => {
    for (const [presetId, to] of [
      ["stomatologiya", "/dashboard/orders"],
      ["oquv", "/dashboard/inventory"],
      ["universal", "/dashboard/leads"],
    ]) {
      const items = buildNavItems(
        crm({ industry: presetId, config: { presetId, modules: [{ key: "maxsus", label: "Maxsus", link: to }] } }),
      );
      expect(items.some((i) => i.to === to)).toBe(false);
    }
  });

  test("existing branches keep the entry even when the preset omits it", () => {
    const barbershop = { industry: "beauty", role: "owner", branchCount: 0, config: { presetId: "barbershop", modules: [] } };
    expect(buildNavItems(barbershop).some((i) => i.to === "/dashboard/branches")).toBe(false);
    expect(buildNavItems({ ...barbershop, branchCount: 2 }).some((i) => i.to === "/dashboard/branches")).toBe(true);
  });

  test("a CRM module sharing a built-in name is suffixed, not hidden", () => {
    const items = buildNavItems(
      crm({
        industry: "ecommerce",
        config: { presetId: "ecommerce", modules: [{ key: "tolovlar", label: "To‘lovlar" }] },
      }),
    );
    const payments = items.filter((i) => i.label.startsWith("To‘lovlar"));
    expect(payments.map((i) => i.to)).toContain("/dashboard/payments");
    expect(payments.map((i) => i.to)).toContain("/dashboard/crm/tolovlar");
    expect(payments.find((i) => i.to === "/dashboard/crm/tolovlar")?.label).toBe("To‘lovlar (CRM)");
  });
});
