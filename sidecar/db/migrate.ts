import { sqlite } from "./index";

/**
 * Ensures the database schema exists by running DDL statements directly.
 *
 * We avoid drizzle-kit's file-based migrator because `bun build --compile`
 * embeds source files into a virtual FS (/$bunfs/...) that cannot be read
 * by Node's fs.readdir at runtime. Instead we inline the DDL here using
 * CREATE TABLE IF NOT EXISTS, which is fully idempotent.
 *
 * To add a new table or column in the future, add another statement below
 * and run `npm run build:sidecar` to recompile.
 */
export function runMigrations(): void {
  try {
    // Wrap all DDL in a single transaction for atomicity
    sqlite.run("BEGIN;");

    // v1 — initial schema
    sqlite.run(`
      CREATE TABLE IF NOT EXISTS todos (
        id          INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        title       TEXT NOT NULL,
        description TEXT,
        completed   INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
    `);

    sqlite.run("COMMIT;");
    console.error("[sidecar] Schema ready.");
  } catch (error) {
    sqlite.run("ROLLBACK;");
    console.error("[sidecar] Migration error:", error);
    throw error;
  }
}
