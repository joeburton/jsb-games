import styles from "./TaskFilter.module.css";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  setVisibilityFilter,
  type VisibilityFilter,
} from "../../store/filtersSlice";
import { selectVisibilityFilter } from "../../store/selectors";

const FILTERS: { label: string; value: VisibilityFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

const TaskFilter = () => {
  const visibilityFilter = useAppSelector(selectVisibilityFilter);
  const dispatch = useAppDispatch();

  return (
    <div className={styles.taskFilter} role="group" aria-label="Filter tasks">
      {FILTERS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          className={
            styles.filterButton +
            (visibilityFilter === value ? ` ${styles.active}` : "")
          }
          aria-pressed={visibilityFilter === value}
          onClick={() => dispatch(setVisibilityFilter(value))}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default TaskFilter;
