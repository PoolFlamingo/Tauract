import type { IpcRequest, IpcResponse, IpcMethod } from "../types/ipc";
import {
  listTodos,
  getTodo,
  createTodo,
  updateTodo,
  deleteTodo,
} from "./todos";

type Handler = (params?: Record<string, unknown>) => Promise<unknown>;

const handlers: Record<IpcMethod, Handler> = {
  "todo.list": (params) =>
    listTodos(params as unknown as Parameters<typeof listTodos>[0]),
  "todo.get": (params) =>
    getTodo(params as unknown as Parameters<typeof getTodo>[0]),
  "todo.create": (params) =>
    createTodo(params as unknown as Parameters<typeof createTodo>[0]),
  "todo.update": (params) =>
    updateTodo(params as unknown as Parameters<typeof updateTodo>[0]),
  "todo.delete": (params) =>
    deleteTodo(params as unknown as Parameters<typeof deleteTodo>[0]),
  ping: async () => ({ pong: true, timestamp: Date.now() }),
};

/**
 * Routes an IPC request to the appropriate handler.
 * Returns a properly formatted IPC response.
 */
export async function handleRequest(request: IpcRequest): Promise<IpcResponse> {
  const handler = handlers[request.method as IpcMethod];

  if (!handler) {
    return {
      id: request.id,
      error: `Unknown method: ${request.method}`,
    };
  }

  try {
    const result = await handler(request.params);
    return { id: request.id, result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return { id: request.id, error: message };
  }
}
