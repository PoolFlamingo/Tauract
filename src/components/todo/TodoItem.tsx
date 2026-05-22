import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import type { Todo, UpdateTodoDto } from "@/types/todo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TodoForm } from "./TodoForm";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onEdit: (data: UpdateTodoDto) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const { t } = useTranslation("todo");
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
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border p-3 transition-colors",
          todo.completed && "opacity-60",
        )}
      >
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo.id)}
          className="mt-0.5"
          aria-label={todo.completed
            ? t("item.markAsPending", { title: todo.title })
            : t("item.markAsCompleted", { title: todo.title })
          }
        />

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-tight",
              todo.completed && "line-through text-muted-foreground",
            )}
          >
            {todo.title}
          </p>
          {todo.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {todo.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsEditing(true)}
            aria-label={t("item.editButton")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setIsDeleting(true)}
            aria-label={t("item.deleteButton")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("item.editButton")}</DialogTitle>
          </DialogHeader>
          <TodoForm
            editingTodo={todo}
            onSubmit={handleEdit}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("item.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("item.deleteConfirmDescription", { title: todo.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("item.deleteConfirmCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("item.deleteConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
