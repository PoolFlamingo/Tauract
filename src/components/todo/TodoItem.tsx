import { useState } from "react";
import type { Todo, UpdateTodoDto } from "../../types/todo";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { TodoForm } from "./TodoForm";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onEdit: (data: UpdateTodoDto) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleEdit(data: UpdateTodoDto | { title: string }) {
    onEdit({ ...data, id: todo.id } as UpdateTodoDto);
    setIsEditing(false);
  }

  function handleDelete() {
    onDelete(todo.id);
    setIsDeleting(false);
  }

  return (
    <>
      <div className={`todo-item ${todo.completed ? "todo-item--completed" : ""}`}>
        <label className="todo-item__checkbox">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => onToggle(todo.id)}
          />
          <span className="todo-item__checkmark" />
        </label>

        <div className="todo-item__content">
          <span className="todo-item__title">{todo.title}</span>
          {todo.description && (
            <span className="todo-item__description">{todo.description}</span>
          )}
        </div>

        <div className="todo-item__actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            aria-label="Editar"
          >
            ✏️
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleting(true)}
            aria-label="Eliminar"
          >
            🗑️
          </Button>
        </div>
      </div>

      <Modal
        open={isEditing}
        title="Editar tarea"
        onClose={() => setIsEditing(false)}
      >
        <TodoForm
          editingTodo={todo}
          onSubmit={handleEdit}
          onCancel={() => setIsEditing(false)}
        />
      </Modal>

      <Modal
        open={isDeleting}
        title="Eliminar tarea"
        onClose={() => setIsDeleting(false)}
      >
        <p className="modal-confirm-text">
          ¿Estás seguro de que quieres eliminar &quot;{todo.title}&quot;?
        </p>
        <div className="modal-confirm-actions">
          <Button variant="danger" onClick={handleDelete}>
            Eliminar
          </Button>
          <Button variant="secondary" onClick={() => setIsDeleting(false)}>
            Cancelar
          </Button>
        </div>
      </Modal>
    </>
  );
}
