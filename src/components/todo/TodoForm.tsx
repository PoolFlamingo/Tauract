import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { CreateTodoDto, UpdateTodoDto, Todo } from "@/types/todo";

interface TodoFormProps {
  /** If provided, the form is in edit mode */
  editingTodo?: Todo;
  onSubmit: (data: CreateTodoDto | UpdateTodoDto) => void;
  onCancel?: () => void;
}

export function TodoForm({ editingTodo, onSubmit, onCancel }: TodoFormProps) {
  const [title, setTitle] = useState(editingTodo?.title ?? "");
  const [description, setDescription] = useState(
    editingTodo?.description ?? "",
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="todo-title" className="sr-only">
            Título
          </Label>
          <Input
            id="todo-title"
            placeholder="¿Qué necesitas hacer?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="todo-description" className="sr-only">
            Descripción
          </Label>
          <Textarea
            id="todo-description"
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
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
