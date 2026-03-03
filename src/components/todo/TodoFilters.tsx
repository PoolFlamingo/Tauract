import type { TodoFilter } from "@/types/todo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="flex items-center justify-between gap-4">
      <Tabs
        value={filter}
        onValueChange={(value) => onFilterChange(value as TodoFilter)}
      >
        <TabsList>
          {filters.map(({ key, label, count }) => (
            <TabsTrigger key={key} value={key} className="gap-1.5">
              {label}
              <Badge
                variant={filter === key ? "default" : "secondary"}
                className="h-5 min-w-5 px-1 text-xs"
              >
                {count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {counts.completed > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearCompleted}>
          Limpiar completados
        </Button>
      )}
    </div>
  );
}
