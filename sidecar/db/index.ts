import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

/**
 * Database path is received as the first CLI argument.
 * The Tauri frontend passes the appDataDir path when spawning the sidecar.
 */
const dbPath = process.argv[2];

if (!dbPath) {
  console.error("[sidecar] ERROR: No database path provided as argument.");
  process.exit(1);
}

const sqlite = new Database(dbPath);

// Performance and reliability PRAGMAs
sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA busy_timeout = 5000;");
sqlite.run("PRAGMA foreign_keys = ON;");
sqlite.run("PRAGMA synchronous = NORMAL;");

export const db = drizzle(sqlite, { schema });
export { sqlite };
