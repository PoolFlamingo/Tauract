/**
 * Shared types for the TODO feature.
 * Mirrors the Drizzle schema but as plain TypeScript interfaces
 * for frontend consumption.
 */

export interface Todo {
	id: number;
	title: string;
	description: string | null;
	completed: boolean;
	createdAt: number; // timestamp ms
	updatedAt: number; // timestamp ms
}

export interface CreateTodoDto {
	title: string;
	description?: string;
}

export interface UpdateTodoDto {
	id: number;
	title?: string;
	description?: string | null;
	completed?: boolean;
}

export type TodoFilter = "all" | "active" | "completed";
