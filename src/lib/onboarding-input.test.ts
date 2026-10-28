// @ts-nocheck
import { describe, expect, test } from "bun:test";

import { generateInput } from "@/lib/crm-config.functions";

describe("onboarding input", () => {
  test("only the industry is mandatory", () => {
    const parsed = generateInput.parse({ industryKey: "stomatologiya", presetId: "stomatologiya" });
    expect(parsed.businessDescription).toBeUndefined();
    expect(parsed.currency).toBeUndefined();
    expect(parsed.workingHours).toBeUndefined();
  });

  test("an empty description is accepted, a missing industry is not", () => {
    expect(() => generateInput.parse({ industryKey: "stomatologiya", businessDescription: "" })).not.toThrow();
    expect(() => generateInput.parse({ businessDescription: "Klinikamiz" })).toThrow();
  });

  test("currency, working hours and description stay bounded", () => {
    expect(() => generateInput.parse({ industryKey: "beauty", currency: "UZS" })).not.toThrow();
    expect(() => generateInput.parse({ industryKey: "beauty", currency: "too-long-currency" })).toThrow();
    expect(() =>
      generateInput.parse({ industryKey: "beauty", workingHours: "09:00–18:00" }),
    ).not.toThrow();
    expect(() =>
      generateInput.parse({ industryKey: "beauty", businessDescription: "x".repeat(5000) }),
    ).toThrow();
  });
});
