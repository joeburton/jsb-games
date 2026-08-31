import styles from "./TaskList.module.css";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { toggleTaskCompletion } from "../../store/tasksSlice";
import {
  selectCompletedTaskIdSet,
  selectVisibleTasks,
} from "../../store/selectors";
import { AddTask, TaskFilter } from "../";

const TaskList = () => {
  const tasks = useAppSelector(selectVisibleTasks);
  const completedTaskIds = useAppSelector(selectCompletedTaskIdSet);
  const dispatch = useAppDispatch();

  return (
    <div className={styles.taskList}>
      <AddTask />
      <TaskFilter />
      <ul>
        {tasks.map((task) => (
          <li
            key={task.id}
            className={
              styles.taskItem +
              (completedTaskIds.has(task.id) ? ` ${styles.completed}` : "")
            }
            onClick={() => dispatch(toggleTaskCompletion(task.id))}
          >
            {task.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskList;
