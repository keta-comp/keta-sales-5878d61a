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