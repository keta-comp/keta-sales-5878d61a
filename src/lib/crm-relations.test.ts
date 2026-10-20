// @ts-nocheck
import { describe, expect, test } from "bun:test";
import { applyRelations, INDUSTRY_PRESETS } from "@/lib/crm-config";

const field = (ind: string, mod: string, key: string) =>
  INDUSTRY_PRESETS[ind]?.modules.find((m) => m.key === mod)?.fields?.find((f) => f.key === key);

describe("CRM relations", () => {
  test("dental appointment links patient to customers and doctor to doctors", () => {
    expect(field("stomatologiya", "qabul", "bemor")?.targetModule).toBe("customers");
    expect(field("stomatologiya", "qabul", "shifokor")?.targetModule).toBe("shifokorlar");
  });
  test("education group links course and teacher", () => {
    expect(field("oquv", "guruhlar", "kurs")?.targetModule).toBe("kurslar");
    expect(field("oquv", "guruhlar", "oqituvchi")?.targetModule).toBe("oqituvchilar");
  });
  test("saved configs with text fields get upgraded", () => {
    const old = { modules: [{ key: "qabul", label: "Qabul", fields: [{ key: "bemor", label: "Bemor", type: "text" }] }], pipelineStages: [], terminology: {}, dashboardWidgets: [], automations: [] };
    expect(applyRelations("klinika", old).modules[0]?.fields?.[0]?.type).toBe("relation");
  });
});
