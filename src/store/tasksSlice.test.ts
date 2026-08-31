import { describe, expect, it } from "vitest";
import tasksReducer, {
  addTask,
  toggleTaskCompletion,
  type TasksState,
} from "./tasksSlice";

const baseState: TasksState = {
  tasks: [
    { id: "1", title: "First" },
    { id: "2", title: "Second" },
  ],
  completedTaskIds: [],
};

describe("tasksSlice", () => {
  it("marks a task complete the first time it is toggled", () => {
    const state = tasksReducer(baseState, toggleTaskCompletion("1"));
    expect(state.completedTaskIds).toEqual(["1"]);
  });

  it("marks a task incomplete the second time it is toggled", () => {
    const completedState: TasksState = {
      ...baseState,
      completedTaskIds: ["1"],
    };
    const state = tasksReducer(completedState, toggleTaskCompletion("1"));
    expect(state.completedTaskIds).toEqual([]);
  });

  it("does not mutate the original state", () => {
    const state = tasksReducer(baseState, toggleTaskCompletion("1"));
    expect(baseState.completedTaskIds).toEqual([]);
    expect(state).not.toBe(baseState);
  });

  it("adds a new task with a unique id and the given title", () => {
    const state = tasksReducer(baseState, addTask("Third"));
    expect(state.tasks).toHaveLength(3);

    const newTask = state.tasks[2];
    expect(newTask.title).toBe("Third");
    expect(newTask.id).not.toBe(baseState.tasks[0].id);
    expect(newTask.id).not.toBe(baseState.tasks[1].id);
  });
});
