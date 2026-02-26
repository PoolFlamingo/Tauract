import { sidecar } from "./sidecar";
import type { Todo, CreateTodoDto, UpdateTodoDto } from "../types/todo";

/**
 * Typed API for TODO CRUD operations.
 * Wraps the sidecar IPC calls with proper TypeScript types.
 */

export async function listTodos(filters?: {
	completed?: boolean;
	search?: string;
}): Promise<Todo[]> {
  	return sidecar.request<Todo[]>("todo.list", filters as unknown as Record<string, unknown>);
}

export async function getTodo(id: number): Promise<Todo> {
  	return sidecar.request<Todo>("todo.get", { id });
}

export async function createTodo(data: CreateTodoDto): Promise<Todo> {
  	return sidecar.request<Todo>("todo.create", data as unknown as Record<string, unknown>);
}

export async function updateTodo(data: UpdateTodoDto): Promise<Todo> {
  	return sidecar.request<Todo>("todo.update", data as unknown as Record<string, unknown>);
}

export async function deleteTodo(id: number): Promise<Todo> {
  	return sidecar.request<Todo>("todo.delete", { id });
}

export async function ping(): Promise<{ pong: boolean; timestamp: number }> {
  	return sidecar.request("ping");
}
