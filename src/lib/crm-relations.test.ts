// @ts-nocheck
import { describe, expect, test } from "bun:test";
import { applyRelations, INDUSTRY_PRESETS } from "@/lib/crm-config";

const field = (ind: string, mod: string, key: string) =>
  INDUSTRY_PRESETS[ind]?.modules.find((m) => m.key === mod)?.fields?.find((f) => f.key === key);

describe("CRM relations", () => {
  test("dental appointment links patient to customers and doctor to the employees table", () => {
    expect(field("stomatologiya", "qabul", "bemor")?.targetModule).toBe("customers");
    expect(field("stomatologiya", "qabul", "shifokor")?.targetModule).toBe("employees");
  });
  test("a saved dental text field is re-pointed at the employees table", () => {
    const old = {
      modules: [
        {
          key: "davolash",
          label: "Davolash",
          fields: [{ key: "shifokor", label: "Shifokor", type: "text" }],
        },
      ],
      pipelineStages: [],
      terminology: {},
      dashboardWidgets: [],
      automations: [],
    };
    const upgraded = applyRelations("stomatologiya", old).modules[0]?.fields?.[0];
    expect(upgraded?.type).toBe("relation");
    expect(upgraded?.targetModule).toBe("employees");
  });
  test("education group links course and teacher", () => {
    expect(field("oquv", "guruhlar", "kurs")?.targetModule).toBe("kurslar");
    expect(field("oquv", "guruhlar", "oqituvchi")?.targetModule).toBe("oqituvchilar");
  });
  test("saved configs with text fields get upgraded", () => {
    const old = { modules: [{ key: "qabul", label: "Qabul", fields: [{ key: "bemor", label: "Bemor", type: "text" }] }], pipelineStages: [], terminology: {}, dashboardWidgets: [], automations: [] };
    expect(applyRelations("klinika", old).modules[0]?.fields?.[0]?.type).toBe("relation");
  });
  test("a stored davomat module is re-pointed at the attendance page", () => {
    const stale = {
      modules: [{ key: "davomat", label: "Davomat", fields: [{ key: "sana", label: "Sana", type: "date" }] }],
      pipelineStages: [],
      terminology: {},
      dashboardWidgets: [],
      automations: [],
    };
    expect(applyRelations("oquv", stale).modules[0]?.link).toBe("/dashboard/attendance");
    // The shipped preset already carries the link, so the upgrade changes nothing.
    expect(applyRelations("oquv", { ...stale, modules: [{ ...stale.modules[0], link: "/dashboard/attendance" }] }).modules[0]?.link).toBe("/dashboard/attendance");
  });
});
