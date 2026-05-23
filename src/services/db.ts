import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:todos.db";

let connection: Promise<Database> | null = null;

/**
 * Returns the shared SQLite connection managed by the Tauri SQL plugin.
 * The DB file lives in the OS app-data directory and is created and
 * migrated automatically by the Rust side on first load.
 */
export function getDb(): Promise<Database> {
	if (!connection) {
		connection = Database.load(DB_URL);
	}
	return connection;
}
