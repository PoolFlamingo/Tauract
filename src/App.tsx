import { useTodos } from "./hooks/useTodos";
import { TodoForm } from "./components/todo/TodoForm";
import { TodoFilters } from "./components/todo/TodoFilters";
import { TodoList } from "./components/todo/TodoList";
import type { CreateTodoDto, UpdateTodoDto } from "./types/todo";
import "./App.css";

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
		<main className="app">
			<header className="app-header">
				<h1 className="app-title">Tauract</h1>
				<p className="app-subtitle">Gestor de tareas</p>
			</header>

			{error && (
				<div className="app-error">
					<p>⚠️ {error}</p>
				</div>
			)}

			<section className="app-content">
				<TodoForm onSubmit={handleAddTodo} />

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
			</section>

			<footer className="app-footer">
				<p>
					Tauri + React + Bun + SQLite
				</p>
			</footer>
		</main>
	);
}

export default App;
