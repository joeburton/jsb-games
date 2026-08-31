import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./";

const selectTasks = (state: RootState) => state.tasks.tasks;
const selectCompletedTaskIds = (state: RootState) =>
  state.tasks.completedTaskIds;
export const selectVisibilityFilter = (state: RootState) =>
  state.filters.visibilityFilter;

export const selectCompletedTaskIdSet = createSelector(
  [selectCompletedTaskIds],
  (completedTaskIds) => new Set(completedTaskIds),
);

export const selectTotalTaskCount = createSelector(
  [selectTasks],
  (tasks) => tasks.length,
);

export const selectCompletedTaskCount = createSelector(
  [selectCompletedTaskIds],
  (completedTaskIds) => completedTaskIds.length,
);

export const selectVisibleTasks = createSelector(
  [selectTasks, selectCompletedTaskIds, selectVisibilityFilter],
  (tasks, completedTaskIds, visibilityFilter) => {
    switch (visibilityFilter) {
      case "active":
        return tasks.filter((task) => !completedTaskIds.includes(task.id));
      case "completed":
        return tasks.filter((task) => completedTaskIds.includes(task.id));
      default:
        return tasks;
    }
  },
);
