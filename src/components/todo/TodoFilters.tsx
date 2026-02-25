import type { TodoFilter } from "../../types/todo";
import { Button } from "../ui/Button";

interface TodoFiltersProps {
  filter: TodoFilter;
  counts: { all: number; active: number; completed: number };
  onFilterChange: (filter: TodoFilter) => void;
  onClearCompleted: () => void;
}

export function TodoFilters({
  filter,
  counts,
  onFilterChange,
  onClearCompleted,
}: TodoFiltersProps) {
  const filters: { key: TodoFilter; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: counts.all },
    { key: "active", label: "Activos", count: counts.active },
    { key: "completed", label: "Completados", count: counts.completed },
  ];

  return (
    <div className="todo-filters">
      <div className="todo-filters__tabs">
        {filters.map(({ key, label, count }) => (
          <button
            key={key}
            className={`todo-filters__tab ${filter === key ? "todo-filters__tab--active" : ""}`}
            onClick={() => onFilterChange(key)}
          >
            {label}
            <span className="todo-filters__count">{count}</span>
          </button>
        ))}
      </div>
      {counts.completed > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearCompleted}>
          Limpiar completados
        </Button>
      )}
    </div>
  );
}
