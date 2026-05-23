import { getDb } from "./db";
import type { Todo, CreateTodoDto, UpdateTodoDto } from "../types/todo";

interface TodoRow {
	id: number;
	title: string;
	description: string | null;
	completed: number;
	created_at: number;
	updated_at: number;
}

function toTodo(row: TodoRow): Todo {
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		completed: row.completed === 1,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

const SELECT_COLUMNS =
	"id, title, description, completed, created_at, updated_at";

export async function listTodos(filters?: {
	completed?: boolean;
	search?: string;
}): Promise<Todo[]> {
	const db = await getDb();
	const clauses: string[] = [];
	const params: unknown[] = [];

	if (filters?.completed !== undefined) {
		clauses.push(`completed = $${params.length + 1}`);
		params.push(filters.completed ? 1 : 0);
	}

	if (filters?.search) {
		clauses.push(`title LIKE $${params.length + 1}`);
		params.push(`%${filters.search}%`);
	}

	const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
	const rows = await db.select<TodoRow[]>(
		`SELECT ${SELECT_COLUMNS} FROM todos ${where} ORDER BY created_at DESC`,
		params,
	);
	return rows.map(toTodo);
}

export async function getTodo(id: number): Promise<Todo> {
	const db = await getDb();
	const rows = await db.select<TodoRow[]>(
		`SELECT ${SELECT_COLUMNS} FROM todos WHERE id = $1`,
		[id],
	);
	if (rows.length === 0) {
		throw new Error(`Todo with id ${id} not found`);
	}
	return toTodo(rows[0]);
}

export async function createTodo(data: CreateTodoDto): Promise<Todo> {
	const title = data.title?.trim();
	if (!title) {
		throw new Error("Title is required");
	}

	const description = data.description?.trim() || null;
	const now = Date.now();
	const db = await getDb();
	const result = await db.execute(
		"INSERT INTO todos (title, description, completed, created_at, updated_at) VALUES ($1, $2, 0, $3, $3)",
		[title, description, now],
	);

	if (result.lastInsertId === undefined) {
		throw new Error("Failed to create todo: no insert id returned");
	}

	return getTodo(result.lastInsertId);
}

export async function updateTodo(data: UpdateTodoDto): Promise<Todo> {
	if (!data.id) {
		throw new Error("Todo id is required");
	}

	const sets: string[] = [];
	const params: unknown[] = [];

	if (data.title !== undefined) {
		const trimmed = data.title.trim();
		if (!trimmed) {
			throw new Error("Title cannot be empty");
		}
		sets.push(`title = $${params.length + 1}`);
		params.push(trimmed);
	}

	if (data.description !== undefined) {
		sets.push(`description = $${params.length + 1}`);
		params.push(data.description?.trim() || null);
	}

	if (data.completed !== undefined) {
		sets.push(`completed = $${params.length + 1}`);
		params.push(data.completed ? 1 : 0);
	}

	sets.push(`updated_at = $${params.length + 1}`);
	params.push(Date.now());

	params.push(data.id);
	const db = await getDb();
	const result = await db.execute(
		`UPDATE todos SET ${sets.join(", ")} WHERE id = $${params.length}`,
		params,
	);

	if (result.rowsAffected === 0) {
		throw new Error(`Todo with id ${data.id} not found`);
	}

	return getTodo(data.id);
}

export async function deleteTodo(id: number): Promise<Todo> {
	const todo = await getTodo(id);
	const db = await getDb();
	await db.execute("DELETE FROM todos WHERE id = $1", [id]);
	return todo;
}
