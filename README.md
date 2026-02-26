# Tauract

Plantilla base para aplicaciones de escritorio con **Tauri v2 + React 19 + TypeScript**, lista para escalar. Incluye un ejemplo completo de lista de tareas (TODO) con base de datos SQLite persistente gestionada por un **sidecar Bun + Drizzle ORM**.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript + Vite 7 |
| Backend de escritorio | Tauri v2 (Rust) |
| Base de datos | SQLite vía sidecar Bun |
| ORM | Drizzle ORM (`bun:sqlite`) |
| IPC frontend ↔ DB | JSON Lines sobre stdin/stdout |
| Calidad de código | ESLint 9 (flat config) + Prettier |

## Arquitectura

```
React (UI)
  └─ SidecarService (@tauri-apps/plugin-shell)
       └─ JSON Lines IPC (stdin / stdout)
            └─ Sidecar Bun (binario compilado ~60 MB)
                 └─ Drizzle ORM + bun:sqlite → todos.db
```

El sidecar es un **binario TypeScript compilado con `bun build --compile`** que se distribuye junto a la app. Gestiona toda la lógica de base de datos y expone un protocolo RPC sencillo. El frontend nunca toca SQL directamente.

## Estructura del proyecto

```
tauract/
├── src/                          # Frontend React
│   ├── components/
│   │   ├── todo/                 # TodoList, TodoItem, TodoForm, TodoFilters
│   │   └── ui/                   # Button, Input, Modal (componentes reutilizables)
│   ├── hooks/
│   │   └── useTodos.ts           # Hook principal de estado y CRUD
│   ├── services/
│   │   ├── sidecar.ts            # Gestión del ciclo de vida del sidecar + IPC
│   │   └── todoApi.ts            # API tipada de TODOs
│   ├── types/
│   │   └── todo.ts               # Interfaces Todo, CreateTodoDto, UpdateTodoDto
│   ├── App.tsx
│   └── App.css
├── sidecar/                      # Código fuente del sidecar (Bun + TypeScript)
│   ├── main.ts                   # Entry point: bucle de lectura stdin
│   ├── db/
│   │   ├── schema.ts             # Esquema Drizzle (tabla todos)
│   │   ├── index.ts              # Conexión SQLite + PRAGMAs
│   │   └── migrate.ts            # Migraciones DDL idempotentes al arranque
│   ├── handlers/
│   │   ├── todos.ts              # CRUD handlers con Drizzle
│   │   └── index.ts              # Router de métodos IPC
│   ├── types/
│   │   └── ipc.ts                # Tipos del protocolo JSON Lines
│   └── drizzle.config.ts         # Config de drizzle-kit (dev)
├── src-tauri/                    # Backend Rust (Tauri)
│   ├── src/
│   │   ├── lib.rs                # Comandos Tauri + registro de plugins
│   │   └── main.rs               # Punto de entrada del binario
│   ├── binaries/                 # Binario compilado del sidecar (generado)
│   ├── capabilities/
│   │   └── default.json          # Permisos: shell:spawn, shell:stdin-write, shell:kill
│   └── tauri.conf.json
├── sidecar-drizzle/              # Migraciones SQL generadas (committear)
├── scripts/
│   └── build-sidecar.mjs         # Script de compilación del sidecar
├── eslint.config.js
└── .prettierrc
```

## Requisitos previos

- [Node.js](https://nodejs.org/) >= 18
- [Rust + cargo](https://rustup.rs/)
- [Tauri CLI v2](https://v2.tauri.app/start/) (instalado como devDependency)
- [Bun](https://bun.sh/) >= 1.2 — necesario para compilar el sidecar

**Instalar Bun en Windows:**
```powershell
powershell -ExecutionPolicy ByPass -c "irm bun.sh/install.ps1 | iex"
```

## Comandos

### Desarrollo

```bash
# Instalar dependencias npm
npm install

# Compilar el sidecar (necesario la primera vez y tras cambios en sidecar/)
npm run build:sidecar

# Arrancar la app en modo desarrollo (compilar sidecar + Vite + Tauri)
npm run tauri dev
```

> `npm run tauri dev` ejecuta automáticamente `build:sidecar` antes de arrancar.

### Build de producción

```bash
npm run tauri build
```

Genera el instalador en `src-tauri/target/release/bundle/`.

### Herramientas de código

```bash
# Comprobar errores de TypeScript
npx tsc --noEmit

# Linter
npm run lint

# Formatear código
npm run format

# Comprobar formato sin modificar
npm run format:check
```

### Base de datos (desarrollo)

```bash
# Generar nuevas migraciones SQL tras modificar sidecar/db/schema.ts
npm run build:migrations

# Ver la DB en el navegador (Drizzle Studio)
npx drizzle-kit studio --config=sidecar/drizzle.config.ts
```

## Protocolo IPC (sidecar)

El frontend se comunica con el sidecar mediante **JSON Lines** sobre stdin/stdout. Cada mensaje es un JSON en una sola línea.

**Request:**
```json
{ "id": "req_1", "method": "todo.create", "params": { "title": "Mi tarea" } }
```

**Response:**
```json
{ "id": "req_1", "result": { "id": 1, "title": "Mi tarea", "completed": false, ... } }
```

**Métodos disponibles:**

| Método | Params | Descripción |
|---|---|---|
| `todo.list` | `{ completed?, search? }` | Listar todos (con filtros opcionales) |
| `todo.get` | `{ id }` | Obtener uno por ID |
| `todo.create` | `{ title, description? }` | Crear nuevo TODO |
| `todo.update` | `{ id, title?, description?, completed? }` | Actualizar campos |
| `todo.delete` | `{ id }` | Eliminar por ID |
| `ping` | — | Health check |

## Añadir una nueva tabla (escalado)

1. Definir la tabla en `sidecar/db/schema.ts` con `sqliteTable`
2. Añadir el `CREATE TABLE IF NOT EXISTS` correspondiente en `sidecar/db/migrate.ts`
3. Crear handlers en `sidecar/handlers/miTabla.ts`
4. Registrar los métodos en `sidecar/handlers/index.ts`
5. Añadir los tipos IPC en `sidecar/types/ipc.ts`
6. Crear el servicio API en `src/services/miTablaApi.ts`
7. Ejecutar `npm run build:sidecar` para recompilar

## Añadir un nuevo comando Tauri (Rust)

1. Definir la función en `src-tauri/src/lib.rs`:
   ```rust
   #[tauri::command]
   fn mi_comando(arg: String) -> Result<String, String> { ... }
   ```
2. Registrarlo en `.invoke_handler(tauri::generate_handler![greet, mi_comando])`
3. Llamarlo desde React: `await invoke("mi_comando", { arg: "valor" })`

## IDE recomendado

[VS Code](https://code.visualstudio.com/) con las siguientes extensiones:

- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [Bun for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=oven.bun-vscode)
