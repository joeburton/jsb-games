import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import tasks from "../data/tasks";

export type Task = (typeof tasks)[number];

export interface TasksState {
  tasks: Task[];
  completedTaskIds: string[];
}

const COMPLETED_TASK_IDS_KEY = "task-store-completed-ids";

const loadCompletedTaskIds = (): string[] => {
  try {
    const stored = localStorage.getItem(COMPLETED_TASK_IDS_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
};

export const saveCompletedTaskIds = (completedTaskIds: string[]) => {
  try {
    localStorage.setItem(
      COMPLETED_TASK_IDS_KEY,
      JSON.stringify(completedTaskIds),
    );
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded) —
    // completion state stays in memory for the session instead of persisting.
  }
};

const initialState: TasksState = {
  tasks,
  completedTaskIds: loadCompletedTaskIds(),
};

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    toggleTaskCompletion: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      const index = state.completedTaskIds.indexOf(taskId);
      if (index === -1) {
        state.completedTaskIds.push(taskId);
      } else {
        console.log(index);
        state.completedTaskIds.splice(index, 1);
      }
    },
    addTask: (state, action: PayloadAction<string>) => {
      state.tasks.push({
        id: crypto.randomUUID(),
        title: action.payload,
      });
    },
  },
});

export const { toggleTaskCompletion, addTask } = tasksSlice.actions;
export default tasksSlice.reducer;
