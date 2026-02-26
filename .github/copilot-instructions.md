# Copilot Instructions — Tauract

## Project Overview

Tauract is a Tauri v2 + React 19 + TypeScript desktop app template. It serves as a starter for building desktop applications with a TODO list example backed by SQLite (planned). The project language context is Spanish (see `APP_BASE_PLAN.md`).

## Architecture

```
src/            ← React frontend (Vite dev server on port 1420)
src-tauri/      ← Rust backend (Tauri v2)
  src/lib.rs    ← Tauri commands + app builder (entry: run())
  src/main.rs   ← Binary entry point, calls tauract_lib::run()
```

- **Frontend→Backend communication**: Use `invoke()` from `@tauri-apps/api/core` to call Rust commands. Command arguments are passed as an object: `invoke("greet", { name })`.
- **Rust commands**: Annotate with `#[tauri::command]` in `src-tauri/src/lib.rs` and register in `.invoke_handler(tauri::generate_handler![...])`.
- **Capabilities/permissions**: Defined in `src-tauri/capabilities/default.json`. Add new plugin permissions there when integrating Tauri plugins.

## Key Commands

| Action | Command |
|---|---|
| Dev (frontend only) | `npm run dev` |
| Dev (full Tauri app) | `npm run tauri dev` |
| Build production | `npm run tauri build` |
| Type-check frontend | `tsc` |

Tauri orchestrates both frontend and backend: `tauri dev` runs `npm run dev` automatically (configured in `src-tauri/tauri.conf.json` → `build.beforeDevCommand`).

## Conventions

- **Frontend**: Functional React components with hooks (`useState`, etc.). No class components. JSX uses `.tsx` extension.
- **Styling**: Plain CSS in `src/App.css` — no CSS framework currently. Dark mode supported via `prefers-color-scheme` media query.
- **Assets**: Images go in `src/assets/media/imgs/`; reusable components in `src/assets/components/`.
- **Rust lib naming**: The library crate is named `tauract_lib` (with `_lib` suffix) to avoid Windows build conflicts between lib and bin targets. Do not rename it.
- **TypeScript**: Strict mode enabled (`strict: true`, `noUnusedLocals`, `noUnusedParameters`). Target ES2020, module ESNext with bundler resolution.

## Adding a New Tauri Command

1. Define the function in `src-tauri/src/lib.rs` with `#[tauri::command]`:
   ```rust
   #[tauri::command]
   fn my_command(arg: String) -> Result<String, String> { ... }
   ```
2. Register it: `.invoke_handler(tauri::generate_handler![greet, my_command])`
3. Call from React: `const result = await invoke("my_command", { arg: "value" });`

## Planned Features (see APP_BASE_PLAN.md)

- **SQLite integration**: TODO CRUD backed by SQLite. May be implemented via Node sidecar (Deno-compiled TypeScript) or Rust-side ORM. Check `APP_BASE_PLAN.md` for the latest decision.
- **TODO list UI**: React components for create/read/update/delete operations.

## Dependencies

- **Frontend**: React 19, `@tauri-apps/api` v2, `@tauri-apps/plugin-opener` v2, Vite 7
- **Backend**: Tauri 2, `tauri-plugin-opener`, `serde`/`serde_json` for serialization

## Extra Notes
- Always use `.editorconfig` settings for consistent formatting. Prettier is configured but not enforced via linting.
