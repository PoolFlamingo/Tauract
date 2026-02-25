/**
 * Build script for the Bun sidecar binary.
 *
 * 1. Compiles the sidecar TypeScript code into a standalone binary using `bun build --compile`
 * 2. Renames the output with the Rust target triple suffix required by Tauri
 *
 * Usage: node scripts/build-sidecar.mjs
 * Or:    bun scripts/build-sidecar.mjs
 */

import { execSync } from "node:child_process";
import { renameSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";

const ROOT = resolve(import.meta.dirname, "..");
const SIDECAR_ENTRY = join(ROOT, "sidecar", "main.ts");
const BINARIES_DIR = join(ROOT, "src-tauri", "binaries");
const SIDECAR_NAME = "db-sidecar";

// Resolve the bun binary — check PATH first, then known install locations
function findBun() {
  const isWindows = process.platform === "win32";
  const bunName = isWindows ? "bun.exe" : "bun";

  // Try PATH first
  try {
    const cmd = isWindows ? `where ${bunName}` : `which ${bunName}`;
    return execSync(cmd, { encoding: "utf-8" }).trim().split(/\r?\n/)[0];
  } catch {
    // not in PATH
  }

  // Common install locations
  const candidates = [
    join(homedir(), ".bun", "bin", bunName),
    ...(isWindows
      ? [join(process.env.LOCALAPPDATA || "", "bun", bunName)]
      : ["/usr/local/bin/bun"]),
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  console.error(
    "[build-sidecar] ERROR: bun not found. Install it: https://bun.sh"
  );
  process.exit(1);
}

const BUN = findBun();
console.log(`[build-sidecar] Using bun: ${BUN}`);

// Ensure binaries directory exists
if (!existsSync(BINARIES_DIR)) {
  mkdirSync(BINARIES_DIR, { recursive: true });
}

// Get the Rust target triple for the current platform
const targetTriple = execSync("rustc --print host-tuple", {
  encoding: "utf-8",
}).trim();

console.log(`[build-sidecar] Target triple: ${targetTriple}`);

const isWindows = process.platform === "win32";
const ext = isWindows ? ".exe" : "";

const tempOutput = join(BINARIES_DIR, `${SIDECAR_NAME}${ext}`);
const finalOutput = join(
  BINARIES_DIR,
  `${SIDECAR_NAME}-${targetTriple}${ext}`
);

// Remove old binary if it exists
if (existsSync(finalOutput)) {
  rmSync(finalOutput);
  console.log(`[build-sidecar] Removed old binary: ${finalOutput}`);
}

// Compile the sidecar with Bun
console.log("[build-sidecar] Compiling sidecar with Bun...");

const compileCmd = [
  `"${BUN}"`,
  "build",
  "--compile",
  "--minify",
  "--bytecode",
  SIDECAR_ENTRY,
  "--outfile",
  tempOutput,
].join(" ");

try {
  execSync(compileCmd, { stdio: "inherit", cwd: ROOT });
} catch (error) {
  console.error("[build-sidecar] Compilation failed:", error.message);
  process.exit(1);
}

// Rename with target triple
if (tempOutput !== finalOutput) {
  renameSync(tempOutput, finalOutput);
}

console.log(`[build-sidecar] ✓ Built: ${finalOutput}`);
