// @ts-nocheck
import { describe, expect, test } from "bun:test";

import en from "@/lib/i18n/en";
import kaa from "@/lib/i18n/kaa";
import ru from "@/lib/i18n/ru";

import {
  ADULT_TEETH,
  LOWER_TEETH,
  TOOTH_CONDITIONS,
  UPPER_TEETH,
  conditionStyle,
  dentalSummary,
  findingsByTooth,
  isMissingTooth,
  needsAttention,
  odontogramTitle,
  parseTooth,
  quadrantName,
  toFindingData,
  toFindingDraft,
  toToothFinding,
  toothName,
} from "@/lib/dental";

function row(id: string, data: Record<string, unknown>, created_at = "2026-01-01T00:00:00Z") {
  return { id, created_at, data };
}

describe("dental chart model", () => {
  test("FDI numbering covers 32 adult teeth in two arches", () => {
    expect(UPPER_TEETH).toHaveLength(16);
    expect(LOWER_TEETH).toHaveLength(16);
    expect(ADULT_TEETH).toHaveLength(32);
    expect(new Set(ADULT_TEETH).size).toBe(32);
    // Viewer order: the patient's right side is drawn first in each arch.
    expect(UPPER_TEETH[0]).toBe(18);
    expect(UPPER_TEETH[8]).toBe(21);
    expect(LOWER_TEETH[0]).toBe(48);
    expect(LOWER_TEETH[8]).toBe(31);
  });

  test("only adult FDI numbers parse", () => {
    expect(parseTooth("11")).toBe(11);
    expect(parseTooth(48)).toBe(48);
    expect(parseTooth("19")).toBeNull();
    expect(parseTooth("51")).toBeNull();
    expect(parseTooth("")).toBeNull();
    expect(parseTooth(null)).toBeNull();
    expect(parseTooth("11.5")).toBeNull();
  });

  test("tooth names come from the FDI position digit", () => {
    expect(toothName(11)).toBe("Markaziy kesuvchi");
    expect(toothName(26)).toBe("Birinchi chiynak");
    expect(toothName(38)).toBe("Aql tishi");
    expect(quadrantName(14)).toBe("Yuqori o‘ng");
    expect(quadrantName(34)).toBe("Pastki chap");
  });

  test("conditions split into healthy, attention and missing", () => {
    expect(needsAttention("Karies")).toBe(true);
    expect(needsAttention("Plomba")).toBe(false);
    expect(isMissingTooth("Olindi")).toBe(true);
    expect(conditionStyle("Karies")).not.toBe(conditionStyle("Sog‘lom"));
    expect(conditionStyle("")).toContain("border-border");
    for (const condition of TOOTH_CONDITIONS) expect(conditionStyle(condition).length).toBeGreaterThan(0);
  });

  test("findings group by tooth, newest first, unnumbered rows dropped", () => {
    const grouped = findingsByTooth([
      toToothFinding(row("a", { tish: "11", holat: "Karies", sana: "2026-02-01" })),
      toToothFinding(row("b", { tish: "11", holat: "Plomba", sana: "2026-03-05" })),
      toToothFinding(row("c", { tish: "26", holat: "Olindi" })),
      toToothFinding(row("d", { tish: "kuchi", holat: "Karies" })),
    ]);
    expect(grouped.size).toBe(2);
    expect(grouped.get(11).map((f) => f.id)).toEqual(["b", "a"]);
    expect(grouped.get(26)).toHaveLength(1);
  });

  test("summary counts real records only", () => {
    const summary = dentalSummary([
      toToothFinding(row("a", { tish: "11", holat: "Karies", tavsiya: "Plomba", narx: "250000" })),
      toToothFinding(row("b", { tish: "12", holat: "Sog‘lom" })),
      toToothFinding(row("c", { tish: "11", holat: "Plomba", sana: "2026-05-01" })),
      toToothFinding(row("d", { tish: "46", holat: "Olindi", tavsiya: "Implant", narx: "4500000" })),
    ]);
    expect(summary.recorded).toBe(3);
    // 11 is treated in the latest record, so it no longer counts as needing attention.
    expect(summary.attention).toBe(0);
    expect(summary.missing).toBe(1);
    expect(summary.planned).toBe(1);
    expect(summary.plannedCost).toBe(4500000);
  });

  test("empty findings produce a zeroed summary", () => {
    expect(dentalSummary([])).toEqual({ recorded: 0, attention: 0, missing: 0, planned: 0, plannedCost: 0 });
  });

  test("draft → stored data → finding round trips", () => {
    const draft = {
      ...toFindingDraft(null),
      patient: "Dilnoza Akbarova",
      patientId: "b0d4c0de-0000-4000-8000-000000000001",
      tooth: 24,
      condition: "Pulpit",
      recommendation: "Kanallar davolash",
      date: "2026-10-28",
      doctor: "Aziz Shifokor",
      doctorId: "b0d4c0de-0000-4000-8000-000000000002",
      price: "800000",
      note: "Lokal anesteziya",
    };
    const finding = toToothFinding(row("x", toFindingData(draft)));
    expect(finding.tooth).toBe(24);
    expect(finding.patientId).toBe(draft.patientId);
    expect(finding.condition).toBe("Pulpit");
    expect(finding.doctorId).toBe(draft.doctorId);
    expect(finding.price).toBe(800000);
    expect(odontogramTitle(finding)).toBe("Tish 24 — Pulpit");
  });

  test("editing keeps the stored tooth values in the form", () => {
    const finding = toToothFinding(
      row("y", {
        tish: "36",
        holat: "Koronka",
        tavsiya: "Yangilash",
        sana: "2026-04-04",
        shifokor: "Nodir",
        shifokor_id: "member-1",
        narx: "1200000",
        izoh: "Metalkor",
      }),
    );
    const draft = toFindingDraft(finding);
    expect(draft).toMatchObject({
      condition: "Koronka",
      recommendation: "Yangilash",
      date: "2026-04-04",
      doctor: "Nodir",
      doctorId: "member-1",
      price: "1200000",
      note: "Metalkor",
    });
  });

  test("tooth names and conditions are translated in every language", () => {
    const labels = [
      ...TOOTH_CONDITIONS,
      ...ADULT_TEETH.map((tooth) => toothName(tooth)),
      ...[14, 24, 34, 44].map((tooth) => quadrantName(tooth)),
    ];
    for (const label of new Set(labels)) {
      for (const table of [en, ru, kaa]) {
        expect(Object.prototype.hasOwnProperty.call(table, label)).toBe(true);
      }
    }
  });

  test("a new draft starts with today, not a stored date", () => {
    const draft = toFindingDraft(null);
    expect(draft.condition).toBe("");
    expect(draft.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
