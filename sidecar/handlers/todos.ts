import { eq, like, and } from "drizzle-orm";
import { db } from "../db";
import { todos } from "../db/schema";
import type {
  CreateTodoParams,
  UpdateTodoParams,
  TodoByIdParams,
  ListTodosParams,
} from "../types/ipc";

export async function listTodos(params?: ListTodosParams) {
  const conditions = [];

  if (params?.completed !== undefined) {
    conditions.push(eq(todos.completed, params.completed));
  }

  if (params?.search) {
    conditions.push(like(todos.title, `%${params.search}%`));
  }

  if (conditions.length > 0) {
    return db.select().from(todos).where(and(...conditions)).all();
  }

  return db.select().from(todos).all();
}

export async function getTodo(params: TodoByIdParams) {
  const result = db
    .select()
    .from(todos)
    .where(eq(todos.id, params.id))
    .get();

  if (!result) {
    throw new Error(`Todo with id ${params.id} not found`);
  }

  return result;
}

export async function createTodo(params: CreateTodoParams) {
  if (!params.title?.trim()) {
    throw new Error("Title is required");
  }

  const result = db
    .insert(todos)
    .values({
      title: params.title.trim(),
      description: params.description?.trim() || null,
    })
    .returning()
    .get();

  return result;
}

export async function updateTodo(params: UpdateTodoParams) {
  if (!params.id) {
    throw new Error("Todo id is required");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (params.title !== undefined) {
    if (!params.title.trim()) {
      throw new Error("Title cannot be empty");
    }
    updateData.title = params.title.trim();
  }

  if (params.description !== undefined) {
    updateData.description = params.description?.trim() || null;
  }

  if (params.completed !== undefined) {
    updateData.completed = params.completed;
  }

  const result = db
    .update(todos)
    .set(updateData)
    .where(eq(todos.id, params.id))
    .returning()
    .get();

  if (!result) {
    throw new Error(`Todo with id ${params.id} not found`);
  }

  return result;
}

export async function deleteTodo(params: TodoByIdParams) {
  const result = db
    .delete(todos)
    .where(eq(todos.id, params.id))
    .returning()
    .get();

  if (!result) {
    throw new Error(`Todo with id ${params.id} not found`);
  }

  return result;
}
