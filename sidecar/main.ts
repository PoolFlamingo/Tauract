import { handleRequest } from "./handlers";
import { runMigrations } from "./db/migrate";
import type { IpcRequest } from "./types/ipc";

/**
 * Tauract Database Sidecar
 *
 * A standalone Bun-compiled binary that manages SQLite via Drizzle ORM.
 * Communicates with the Tauri frontend using JSON Lines over stdin/stdout.
 *
 * Usage: db-sidecar <database-path>
 *
 * Protocol:
 *   stdin  → one JSON object per line (IpcRequest)
 *   stdout → one JSON object per line (IpcResponse)
 *   stderr → logging/debug output
 */

// Apply database migrations on startup
console.error("[sidecar] Starting Tauract DB sidecar...");
console.error(`[sidecar] Database path: ${process.argv[2]}`);

try {
  runMigrations();
} catch {
  console.error("[sidecar] Failed to run migrations. Exiting.");
  process.exit(1);
}

console.error("[sidecar] Ready. Listening for requests on stdin...");

// Signal readiness to the frontend by writing a ready message
const readyMessage = JSON.stringify({
  id: "__ready__",
  result: { ready: true },
});
process.stdout.write(readyMessage + "\n");

/**
 * Read stdin line-by-line and process each JSON request.
 * Uses Bun's native readline for efficient line parsing.
 */
const decoder = new TextDecoder();
let buffer = "";

async function processLine(line: string): Promise<void> {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request: IpcRequest;

  try {
    request = JSON.parse(trimmed) as IpcRequest;
  } catch {
    const errorResponse = JSON.stringify({
      id: "__parse_error__",
      error: "Invalid JSON received",
    });
    process.stdout.write(errorResponse + "\n");
    return;
  }

  if (!request.id || !request.method) {
    const errorResponse = JSON.stringify({
      id: request.id || "__invalid__",
      error: "Request must include 'id' and 'method' fields",
    });
    process.stdout.write(errorResponse + "\n");
    return;
  }

  const response = await handleRequest(request);
  process.stdout.write(JSON.stringify(response) + "\n");
}

// Main stdin read loop
const stdin = Bun.stdin.stream();
const reader = stdin.getReader();

(async () => {
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        await processLine(line);
      }
    }

    // Process any remaining data in the buffer
    if (buffer.trim()) {
      await processLine(buffer);
    }
  } catch (error) {
    console.error("[sidecar] Fatal stdin error:", error);
    process.exit(1);
  }

  console.error("[sidecar] Stdin closed. Shutting down.");
  process.exit(0);
})();
