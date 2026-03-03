import { useTodos } from "@/hooks/useTodos";
import { TodoForm } from "@/components/todo/TodoForm";
import { TodoFilters } from "@/components/todo/TodoFilters";
import { TodoList } from "@/components/todo/TodoList";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import type { CreateTodoDto, UpdateTodoDto } from "@/types/todo";

function App() {
	const {
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
	} = useTodos();

	async function handleAddTodo(data: CreateTodoDto | UpdateTodoDto) {
		try {
			await addTodo(data as CreateTodoDto);
		} catch (err) {
			console.error("Failed to add todo:", err);
		}
	}

	async function handleToggle(id: number) {
		try {
			await toggleTodo(id);
		} catch (err) {
			console.error("Failed to toggle todo:", err);
		}
	}

	async function handleEdit(data: UpdateTodoDto) {
		try {
			await editTodo(data);
		} catch (err) {
			console.error("Failed to edit todo:", err);
		}
	}

	async function handleDelete(id: number) {
		try {
			await removeTodo(id);
		} catch (err) {
			console.error("Failed to delete todo:", err);
		}
	}

	async function handleClearCompleted() {
		try {
			await clearCompleted();
		} catch (err) {
			console.error("Failed to clear completed:", err);
		}
	}

	return (
		<main className="min-h-screen bg-background">
			<div className="mx-auto max-w-2xl px-4 py-8">
				<header className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Tauract</h1>
						<p className="text-sm text-muted-foreground">
							Gestor de tareas
						</p>
					</div>
					<ThemeToggle />
				</header>

				{error && (
					<Alert variant="destructive" className="mb-6">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<Card>
					<CardHeader className="pb-4">
						<TodoForm onSubmit={handleAddTodo} />
					</CardHeader>
					<Separator />
					<CardContent className="pt-4 space-y-4">
						<TodoFilters
							filter={filter}
							counts={counts}
							onFilterChange={setFilter}
							onClearCompleted={handleClearCompleted}
						/>
						<TodoList
							todos={filteredTodos}
							loading={loading}
							onToggle={handleToggle}
							onEdit={handleEdit}
							onDelete={handleDelete}
						/>
					</CardContent>
				</Card>

				<footer className="mt-8 text-center">
					<p className="text-xs text-muted-foreground">
						Tauri + React + Bun + SQLite
					</p>
				</footer>
			</div>
		</main>
	);
}

export default App;
