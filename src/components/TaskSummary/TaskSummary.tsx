import { useAppSelector } from "../../store/hooks";
import {
  selectCompletedTaskCount,
  selectTotalTaskCount,
} from "../../store/selectors";

import styles from "./TaskSummary.module.css";

const TaskSummary = () => {
  const totalTasks = useAppSelector(selectTotalTaskCount);
  const completedCount = useAppSelector(selectCompletedTaskCount);

  return (
    <div className={styles.taskSummaryContainer}>
      <h1 className={styles.taskSummary}>
        Todo
        <span className={styles.count}>
          {completedCount} of {totalTasks} complete
        </span>
      </h1>
    </div>
  );
};

export default TaskSummary;
