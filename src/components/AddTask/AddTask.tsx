import { useState, type SubmitEvent } from "react";
import styles from "./AddTask.module.css";

import { useAppDispatch } from "../../store/hooks";
import { addTask } from "../../store/tasksSlice";

const AddTask = () => {
  const [taskName, setTaskName] = useState("");
  const dispatch = useAppDispatch();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = taskName.trim();
    if (trimmedName !== "") {
      dispatch(addTask(trimmedName));
      setTaskName("");
    }
  };

  return (
    <form className={styles.addTask} onSubmit={handleSubmit}>
      <label htmlFor="new-task-name" className={styles.visuallyHidden}>
        Task name
      </label>
      <input
        id="new-task-name"
        type="text"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        placeholder="Enter task name"
        className={styles.input}
      />
      <button
        type="submit"
        className={styles.button}
        disabled={taskName.trim() === ""}
      >
        Add Task
      </button>
    </form>
  );
};

export default AddTask;
