import { describe, expect, test } from "bun:test";
import { groupLeads, leadStatusChange } from "./lead-kanban";

describe("lead Kanban", () => {
  test("keeps all seven existing statuses and every real row exactly once", () => {
    const rows = [{ id: "a", status: "new" }, { id: "b", status: "won" }, { id: "c", status: "needs_operator" }];
    const groups = groupLeads(rows);
    expect(groups.map((g) => g.status)).toEqual(["new", "needs_operator", "assigned", "contacted", "negotiating", "won", "lost"]);
    expect(groups.flatMap((g) => g.rows)).toHaveLength(3);
    expect(groups.find((g) => g.status === "won")?.rows).toEqual([rows[1]]);
    expect(groups.find((g) => g.status === "lost")?.rows).toEqual([]);
  });
  test("moves to an existing status and ignores unchanged or invalid drops", () => {
    expect(leadStatusChange("new", "negotiating")).toBe("negotiating");
    expect(leadStatusChange("new", "new")).toBeNull();
    expect(leadStatusChange("new", "unknown")).toBeNull();
  });
});
import { leadTaskState } from "./lead-kanban";
describe("lead next-task rule", () => {
  const now = new Date("2026-10-13T10:00:00");
  test("open lead without open task is flagged", () => {
    expect(leadTaskState("new", [], now)).toBe("none");
    expect(leadTaskState("new", [{ lead_id: "a", status: "completed", due_date: null }], now)).toBe("none");
  });
  test("overdue beats today beats planned", () => {
    expect(leadTaskState("contacted", [{ lead_id: "a", status: "pending", due_date: "2026-10-12T10:00:00" }, { lead_id: "a", status: "pending", due_date: "2026-10-13T18:00:00" }], now)).toBe("overdue");
    expect(leadTaskState("contacted", [{ lead_id: "a", status: "pending", due_date: "2026-10-13T18:00:00" }], now)).toBe("today");
    expect(leadTaskState("contacted", [{ lead_id: "a", status: "pending", due_date: "2026-10-15T10:00:00" }], now)).toBe("planned");
  });
  test("won and lost leads need no task", () => {
    expect(leadTaskState("won", [], now)).toBe("closed");
    expect(leadTaskState("lost", [], now)).toBe("closed");
  });
});
