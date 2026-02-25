/**
 * IPC Protocol types for sidecar communication.
 * Uses JSON Lines (one JSON object per line) over stdin/stdout.
 * Follows JSON-RPC 2.0 conventions for request/response correlation.
 */

export interface IpcRequest {
  /** Unique request identifier for response correlation */
  id: string;
  /** RPC method name (e.g., "todo.list", "todo.create") */
  method: string;
  /** Optional parameters for the method */
  params?: Record<string, unknown>;
}

export interface IpcSuccessResponse {
  id: string;
  result: unknown;
}

export interface IpcErrorResponse {
  id: string;
  error: string;
}

export type IpcResponse = IpcSuccessResponse | IpcErrorResponse;

/** All available RPC methods */
export type IpcMethod =
  | "todo.list"
  | "todo.get"
  | "todo.create"
  | "todo.update"
  | "todo.delete"
  | "ping";

/** Params for todo.create */
export interface CreateTodoParams {
  title: string;
  description?: string;
}

/** Params for todo.update */
export interface UpdateTodoParams {
  id: number;
  title?: string;
  description?: string | null;
  completed?: boolean;
}

/** Params for todo.get / todo.delete */
export interface TodoByIdParams {
  id: number;
}

/** Params for todo.list (optional filters) */
export interface ListTodosParams {
  completed?: boolean;
  search?: string;
}
