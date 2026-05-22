import type { TodoFilter } from "@/types/todo";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("todo");
  const filters: { key: TodoFilter; label: string; count: number }[] = [
    { key: "all", label: t("filters.all"), count: counts.all },
    { key: "active", label: t("filters.active"), count: counts.active },
    { key: "completed", label: t("filters.completed"), count: counts.completed },
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
          {t("filters.clearCompleted")}
        </Button>
      )}
    </div>
  );
}
