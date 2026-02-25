import { useState, useEffect, useCallback, useRef } from "react";
import * as todoApi from "../services/todoApi";
import type { Todo, CreateTodoDto, UpdateTodoDto, TodoFilter } from "../types/todo";
import { sidecar } from "../services/sidecar";

interface UseTodosReturn {
  todos: Todo[];
  filteredTodos: Todo[];
  filter: TodoFilter;
  loading: boolean;
  error: string | null;
  counts: { all: number; active: number; completed: number };
  setFilter: (filter: TodoFilter) => void;
  addTodo: (data: CreateTodoDto) => Promise<void>;
  toggleTodo: (id: number) => Promise<void>;
  editTodo: (data: UpdateTodoDto) => Promise<void>;
  removeTodo: (id: number) => Promise<void>;
  clearCompleted: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Initialize sidecar and load todos
  const loadTodos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await sidecar.init();
      const result = await todoApi.listTodos();
      if (mountedRef.current) {
        setTodos(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load todos");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadTodos();
    return () => {
      mountedRef.current = false;
      sidecar.destroy();
    };
  }, [loadTodos]);

  const addTodo = useCallback(async (data: CreateTodoDto) => {
    const newTodo = await todoApi.createTodo(data);
    if (mountedRef.current) {
      setTodos((prev) => [newTodo, ...prev]);
    }
  }, []);

  const toggleTodo = useCallback(async (id: number) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const updated = await todoApi.updateTodo({
      id,
      completed: !todo.completed,
    });
    if (mountedRef.current) {
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  }, [todos]);

  const editTodo = useCallback(async (data: UpdateTodoDto) => {
    const updated = await todoApi.updateTodo(data);
    if (mountedRef.current) {
      setTodos((prev) => prev.map((t) => (t.id === data.id ? updated : t)));
    }
  }, []);

  const removeTodo = useCallback(async (id: number) => {
    await todoApi.deleteTodo(id);
    if (mountedRef.current) {
      setTodos((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  const clearCompleted = useCallback(async () => {
    const completedTodos = todos.filter((t) => t.completed);
    await Promise.all(completedTodos.map((t) => todoApi.deleteTodo(t.id)));
    if (mountedRef.current) {
      setTodos((prev) => prev.filter((t) => !t.completed));
    }
  }, [todos]);

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const counts = {
    all: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  };

  return {
    todos,
    filteredTodos,
    filter,
    loading,
    error,
    counts,
    setFilter,
    addTodo,
    toggleTodo,
    editTodo,
    removeTodo,
    clearCompleted,
    refresh: loadTodos,
  };
}
