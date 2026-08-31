import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import tasksReducer from "../../store/tasksSlice";
import filtersReducer from "../../store/filtersSlice";
import TaskList from "./TaskList";

const renderTaskList = () => {
  const store = configureStore({
    reducer: {
      tasks: tasksReducer,
      filters: filtersReducer,
    },
  });
  render(
    <Provider store={store}>
      <TaskList />
    </Provider>,
  );
};

beforeEach(() => {
  localStorage.clear();
});

describe("TaskList", () => {
  it("renders the seeded tasks", () => {
    renderTaskList();

    expect(screen.getByText("Learn React")).toBeInTheDocument();
    expect(screen.getByText("Learn TypeScript")).toBeInTheDocument();
    expect(
      screen.getByText("Learn React with TypeScript"),
    ).toBeInTheDocument();
  });

  it("toggles a task's completed state when clicked", async () => {
    const user = userEvent.setup();
    renderTaskList();

    const item = screen.getByText("Learn React");
    const listItem = item.closest("li");
    expect(listItem?.className).not.toMatch(/completed/);

    await user.click(item);
    expect(listItem?.className).toMatch(/completed/);

    await user.click(item);
    expect(listItem?.className).not.toMatch(/completed/);
  });

  it("adds a new task via the AddTask form", async () => {
    const user = userEvent.setup();
    renderTaskList();

    const input = screen.getByPlaceholderText("Enter task name");
    await user.type(input, "Write tests");
    await user.click(screen.getByRole("button", { name: "Add Task" }));

    expect(screen.getByText("Write tests")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("shows only active tasks when the Active filter is selected", async () => {
    const user = userEvent.setup();
    renderTaskList();

    await user.click(screen.getByText("Learn React"));
    await user.click(screen.getByRole("button", { name: "Active" }));

    expect(screen.queryByText("Learn React")).not.toBeInTheDocument();
    expect(screen.getByText("Learn TypeScript")).toBeInTheDocument();
  });

  it("shows only completed tasks when the Completed filter is selected", async () => {
    const user = userEvent.setup();
    renderTaskList();

    await user.click(screen.getByText("Learn React"));
    await user.click(screen.getByRole("button", { name: "Completed" }));

    expect(screen.getByText("Learn React")).toBeInTheDocument();
    expect(screen.queryByText("Learn TypeScript")).not.toBeInTheDocument();
  });
});
