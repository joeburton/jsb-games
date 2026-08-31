import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import tasksReducer, {
  saveCompletedTaskIds,
  toggleTaskCompletion,
} from "./tasksSlice";
import filtersReducer from "./filtersSlice";

const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  actionCreator: toggleTaskCompletion,
  effect: (_action, listenerApi) => {
    const state = listenerApi.getState() as RootState;
    saveCompletedTaskIds(state.tasks.completedTaskIds);
  },
});

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    filters: filtersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
