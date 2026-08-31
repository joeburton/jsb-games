import { describe, expect, it } from "vitest";
import {
  selectCompletedTaskCount,
  selectCompletedTaskIdSet,
  selectTotalTaskCount,
  selectVisibleTasks,
} from "./selectors";
import type { RootState } from "./";

const makeState = (overrides: Partial<RootState> = {}): RootState => ({
  tasks: {
    tasks: [
      { id: "1", title: "First" },
      { id: "2", title: "Second" },
      { id: "3", title: "Third" },
    ],
    completedTaskIds: ["2"],
  },
  filters: {
    visibilityFilter: "all",
  },
  ...overrides,
});

describe("selectTotalTaskCount", () => {
  it("returns the number of tasks", () => {
    expect(selectTotalTaskCount(makeState())).toBe(3);
  });
});

describe("selectCompletedTaskCount", () => {
  it("returns the number of completed task ids", () => {
    expect(selectCompletedTaskCount(makeState())).toBe(1);
  });
});

describe("selectCompletedTaskIdSet", () => {
  it("returns a Set built from the completed task ids", () => {
    const set = selectCompletedTaskIdSet(makeState());
    expect(set).toBeInstanceOf(Set);
    expect(set.has("2")).toBe(true);
    expect(set.has("1")).toBe(false);
  });
});

describe("selectVisibleTasks", () => {
  it("returns all tasks when the filter is 'all'", () => {
    expect(selectVisibleTasks(makeState()).map((t) => t.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("returns only incomplete tasks when the filter is 'active'", () => {
    const state = makeState({ filters: { visibilityFilter: "active" } });
    expect(selectVisibleTasks(state).map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("returns only completed tasks when the filter is 'completed'", () => {
    const state = makeState({ filters: { visibilityFilter: "completed" } });
    expect(selectVisibleTasks(state).map((t) => t.id)).toEqual(["2"]);
  });
});
