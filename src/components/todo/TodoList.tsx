import type { Todo, UpdateTodoDto } from "../../types/todo";
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
      <div className="todo-list__empty">
        <div className="todo-list__spinner" />
        <p>Cargando tareas...</p>
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="todo-list__empty">
        <p className="todo-list__empty-icon">📋</p>
        <p>No hay tareas todavía</p>
        <p className="todo-list__empty-hint">
          Añade una nueva tarea usando el formulario de arriba
        </p>
      </div>
    );
  }

  return (
    <div className="todo-list">
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
