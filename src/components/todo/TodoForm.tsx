import { useState, type FormEvent } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import type { CreateTodoDto, UpdateTodoDto, Todo } from "../../types/todo";

interface TodoFormProps {
  /** If provided, the form is in edit mode */
  editingTodo?: Todo;
  onSubmit: (data: CreateTodoDto | UpdateTodoDto) => void;
  onCancel?: () => void;
}

export function TodoForm({ editingTodo, onSubmit, onCancel }: TodoFormProps) {
  const [title, setTitle] = useState(editingTodo?.title ?? "");
  const [description, setDescription] = useState(
    editingTodo?.description ?? ""
  );

  const isEditing = !!editingTodo;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    if (isEditing) {
      onSubmit({
        id: editingTodo.id,
        title: trimmedTitle,
        description: description.trim() || null,
      } satisfies UpdateTodoDto);
    } else {
      onSubmit({
        title: trimmedTitle,
        description: description.trim() || undefined,
      } satisfies CreateTodoDto);
      setTitle("");
      setDescription("");
    }
  }

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <div className="todo-form__fields">
        <Input
          id="todo-title"
          placeholder="¿Qué necesitas hacer?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <Input
          id="todo-description"
          placeholder="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="todo-form__actions">
        <Button type="submit" disabled={!title.trim()}>
          {isEditing ? "Guardar" : "Añadir"}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
