# Tauract

Plantilla base para aplicaciones **Tauri v2 + React 19 + TypeScript**, lista para escalar y **compatible con móviles** (iOS / Android) gracias al uso exclusivo de plugins oficiales de Tauri. Incluye un ejemplo completo de lista de tareas (TODO) con base de datos SQLite persistente gestionada por el plugin oficial **`tauri-plugin-sql`**.

> **Cambio importante (mayo 2026):** se ha eliminado por completo el sidecar de Bun + Drizzle. Toda la persistencia ahora se hace desde el frontend a través del plugin SQL oficial de Tauri. Esto:
> - **Reduce el peso del bundle** (~95 MB menos por plataforma; ya no se distribuye un binario externo de Bun).
> - **Habilita iOS y Android**, donde los sidecars no están soportados.
> - **Elimina dependencias de desarrollo** (Bun, Drizzle ORM, drizzle-kit, plugin-shell, scripts de compilación de sidecar).
> - **Simplifica el arranque**: ya no hay proceso hijo, IPC por stdin/stdout, ni lifecycle que orquestar.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript + Vite 7 |
| Backend de escritorio/móvil | Tauri v2 (Rust) |
| Base de datos | SQLite vía [`tauri-plugin-sql`](https://v2.tauri.app/plugin/sql/) |
| Acceso desde el front | `@tauri-apps/plugin-sql` (`Database.load("sqlite:todos.db")`) |
| Migraciones | Embebidas en Rust (`Migration` + `MigrationKind::Up`) |
| Calidad de código | ESLint 9 (flat config) + Prettier |

## Arquitectura

```
React (UI)
  └─ hooks/useTodos
       └─ services/todoApi.ts (CRUD tipado en SQL)
            └─ services/db.ts (singleton: Database.load)
                 └─ @tauri-apps/plugin-sql (IPC interno de Tauri)
                      └─ tauri-plugin-sql (Rust, sqlx + SQLite)
                           └─ {appDataDir}/todos.db
```

No hay procesos externos. La base de datos se abre dentro del proceso de Tauri, las migraciones se aplican en el arranque del plugin, y el frontend habla con SQLite a través del bridge nativo de Tauri.

## Estructura del proyecto

```
tauract/
├── src/                              # Frontend React
│   ├── components/
│   │   ├── todo/                     # TodoList, TodoItem, TodoForm, TodoFilters
│   │   └── ui/                       # Componentes reutilizables (shadcn-style)
│   ├── hooks/
│   │   └── useTodos.ts               # Estado y CRUD de TODOs
│   ├── services/
│   │   ├── db.ts                     # Singleton de la conexión SQLite
│   │   └── todoApi.ts                # CRUD tipado contra la DB
│   ├── types/
│   │   └── todo.ts                   # Interfaces Todo / DTOs
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/                        # Backend Rust (Tauri)
│   ├── src/
│   │   ├── lib.rs                    # Plugins, migraciones SQL, comandos
│   │   └── main.rs                   # Entry point
│   ├── capabilities/
│   │   └── default.json              # Permisos del plugin sql (scoped a sqlite:todos.db)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── eslint.config.js
└── .prettierrc
```

## Requisitos previos

- [Node.js](https://nodejs.org/) >= 18
- [Rust + cargo](https://rustup.rs/)
- [Tauri CLI v2](https://v2.tauri.app/start/) (instalado como devDependency)

> Ya **no** se necesita Bun ni Drizzle. Cualquier persistencia se hace con SQL plano desde `src/services/todoApi.ts`.

## Comandos

### Desarrollo

```bash
# Instalar dependencias npm
npm install

# Arrancar la app en modo desarrollo
npm run tauri dev
```

### Build de producción

```bash
npm run tauri build
```

Genera el instalador en `src-tauri/target/release/bundle/`.

### Herramientas de código

```bash
npx tsc --noEmit        # Type-check
npm run lint            # ESLint
npm run format          # Prettier (escribe)
npm run format:check    # Prettier (verifica)
```

## Base de datos

La base de datos vive en `{appDataDir}/todos.db` y la gestiona el plugin SQL de Tauri (sqlx + SQLite). Las migraciones están embebidas en Rust:

```rust
// src-tauri/src/lib.rs
let migrations = vec![Migration {
    version: 1,
    description: "create_todos_table",
    sql: "CREATE TABLE IF NOT EXISTS todos (
        id          INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        title       TEXT NOT NULL,
        description TEXT,
        completed   INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
    );",
    kind: MigrationKind::Up,
}];
```

Para añadir nuevas migraciones basta con agregar entradas al `Vec<Migration>` con `version` ascendente. El plugin las aplica de forma idempotente en el arranque.

### Consulta y escritura desde el frontend

```ts
import { getDb } from "@/services/db";

const db = await getDb();
const rows = await db.select<TodoRow[]>(
  "SELECT * FROM todos WHERE completed = $1",
  [0],
);
await db.execute(
  "INSERT INTO todos (title, created_at, updated_at) VALUES ($1, $2, $2)",
  ["Mi tarea", Date.now()],
);
```

> SQLite usa placeholders posicionales `$1, $2, …` con el plugin (sqlx).

## Permisos / capabilities

`src-tauri/capabilities/default.json` declara permisos del plugin SQL acotados a la URL de la base de datos:

```json
{ "identifier": "sql:allow-load",    "allow": [{ "url": "sqlite:todos.db" }] },
{ "identifier": "sql:allow-execute", "allow": [{ "url": "sqlite:todos.db" }] },
{ "identifier": "sql:allow-select",  "allow": [{ "url": "sqlite:todos.db" }] },
{ "identifier": "sql:allow-close",   "allow": [{ "url": "sqlite:todos.db" }] }
```

Si añades una nueva base de datos, declara su URL aquí.

## Añadir una nueva tabla

1. Añadir una nueva `Migration` en `src-tauri/src/lib.rs` con `version` siguiente y `kind: MigrationKind::Up`.
2. Crear las funciones CRUD en `src/services/<algo>Api.ts` usando `getDb()`.
3. Definir tipos en `src/types/<algo>.ts`.
4. Consumir desde un hook (`src/hooks/use<Algo>.ts`) y los componentes correspondientes.

## Añadir un nuevo comando Tauri (Rust)

1. Definir la función en `src-tauri/src/lib.rs`:
   ```rust
   #[tauri::command]
   fn mi_comando(arg: String) -> Result<String, String> { /* … */ }
   ```
2. Registrarla en `.invoke_handler(tauri::generate_handler![greet, mi_comando])`.
3. Llamarla desde React: `await invoke("mi_comando", { arg: "valor" })`.

## Compatibilidad móvil (iOS / Android)

Al eliminar el sidecar, la app pasa a ser candidata a `tauri android dev` / `tauri ios dev`. Pasos pendientes para activar móvil:

1. Generar los proyectos: `npm run tauri android init` / `npm run tauri ios init`.
2. Revisar `plugins` y `capabilities`: `tauri-plugin-sql`, `tauri-plugin-os`, `tauri-plugin-store` y `tauri-plugin-process` soportan móvil. **`tauri-plugin-updater` no soporta iOS** (en Android sólo desde fuera del Play Store); si construyes para móvil, condiciónalo en `lib.rs` con `#[cfg(desktop)]`.
3. Probar: `npm run tauri android dev`.

## IDE recomendado

[VS Code](https://code.visualstudio.com/) con:

- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
