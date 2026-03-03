import { ClipboardList } from "lucide-react";
import type { Todo, UpdateTodoDto } from "@/types/todo";
import { Skeleton } from "@/components/ui/skeleton";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  loading: boolean;
  onToggle: (id: number) => void;
  onEdit: (data: UpdateTodoDto) => void;
  onDelete: (id: number) => void;
}

export function TodoList({
  todos,
  loading,
  onToggle,
  onEdit,
  onDelete,
}: TodoListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
            <Skeleton className="h-4 w-4 rounded-sm mt-0.5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          No hay tareas todavía
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Añade una nueva tarea usando el formulario de arriba
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
