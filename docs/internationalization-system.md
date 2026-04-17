# My Journal Internationalization System

## Purpose And Scope

This document explains how multilingual support is currently implemented in My Journal. It describes the runtime architecture, translation resource layout, language selection flow, persistence model, component integration pattern, and the practical consequences of the current design.

The application currently supports two interface languages:

- Spanish (`es`)
- English (`en`)

The implementation is frontend-only. There is no sidecar-based or Rust-based translation layer. All language behavior lives in the React application and is powered by `i18next` plus `react-i18next`.

## High-Level Architecture

The internationalization stack is built from four main pieces:

1. `src/i18n/i18n.ts`
   Initializes the global `i18next` instance and registers all translation resources.
2. `src/i18n/resources.ts`
   Defines the supported language type used by the rest of the frontend.
3. `src/components/language-provider.tsx`
   Resolves the active language, persists user preference, and exposes a React context.
4. Components calling `useTranslation(...)`
   Read translated strings from the registered namespaces.

The system is intentionally simple:

- translations are bundled statically at build time;
- there is no lazy loading of locale files;
- language changes happen entirely in memory by calling `i18n.changeLanguage(...)`;
- user preference is persisted with the Tauri Store plugin in `settings.json`.

## Startup And Bootstrapping Flow

Language bootstrapping happens in two distinct phases.

### Phase 1: Static i18n initialization

When the frontend starts, `src/main.tsx` imports `@/i18n/i18n`, which ensures that the `i18next` singleton is initialized before the main React tree renders.

Inside `src/i18n/i18n.ts`, the app:

- imports `i18next`;
- installs the `initReactI18next` adapter;
- registers Spanish and English resources;
- defines the available namespaces;
- sets the initial language to Spanish.

Current initialization details:

- `lng: "es"`
- `fallbackLng: ["es"]`
- `ns: ["common", "todo", "journal"]`
- `defaultNS: "common"`
- `react.useSuspense: false`
- `interpolation.escapeValue: false`

This means the application always starts from a valid Spanish baseline even before user preferences or OS locale detection have been resolved.

### Phase 2: Runtime language resolution

After React mounts, `LanguageProvider` performs an asynchronous bootstrap in `useEffect`.

The provider resolves the final runtime language in this order:

1. Read the previously saved language from `settings.json`.
2. If nothing is saved, inspect the system locale through `@tauri-apps/plugin-os`.
3. If the Tauri OS API is unavailable, fall back to the browser locale via `navigator.language` or `navigator.languages[0]`.
4. If none of the above yields a supported value, default to Spanish.

Once a supported language is found, the provider calls `await i18n.changeLanguage(nextLanguage)` and stores that value in React state.

This two-step model is important:

- static init guarantees a safe default immediately;
- runtime bootstrap upgrades the language to the user or system preference as soon as the provider resolves it.

## Translation Resource Structure

Translation resources are stored as JSON files under:

- `src/i18n/locales/es/`
- `src/i18n/locales/en/`

The current namespace layout is:

- `common.json`
- `todo.json`
- `journal.json`

These files are imported directly in `src/i18n/i18n.ts` and registered under the `resources` object.

The namespace split follows functional domains rather than component names:

- `common`: global UI strings such as language labels and generic theme labels
- `todo`: legacy TODO scaffold strings
- `journal`: the main product namespace for welcome flow, workspace, editor, settings, calendar, unlock flow, and errors

Because all locale files are imported statically, the complete bilingual text catalog is bundled into the frontend build.

## Supported Language Type And Normalization

The canonical language type is declared in `src/i18n/resources.ts`:

```ts
export type SupportedLanguage = "es" | "en";
```

That type is used throughout the language provider and UI components so the rest of the codebase cannot accidentally set an unsupported locale code.

`LanguageProvider` contains a normalization helper named `parseSupportedLanguage(...)`. Its behavior is intentionally permissive:

- values beginning with `es` resolve to `es`
- values beginning with `en` resolve to `en`
- all other values resolve to `null`

Examples:

- `es` -> `es`
- `es-ES` -> `es`
- `en` -> `en`
- `en-US` -> `en`
- `fr-FR` -> `null`

This normalization is what allows the app to consume OS locale strings without requiring an exact match.

## Persistence Model

Language preference is stored through the Tauri Store plugin, not in `localStorage`.

Current storage configuration:

- file: `settings.json`
- key: `language`

Read flow:

1. `Store.load("settings.json")`
2. `store.get<SupportedLanguage>("language")`
3. normalize via `parseSupportedLanguage(...)`

Write flow:

1. `Store.load("settings.json")`
2. `store.set("language", language)`
3. `store.save()`

Persistence errors are intentionally ignored in the provider. This is a pragmatic choice that avoids breaking development mode or browser-like contexts where the Tauri plugin may not be available.

The consequence is that language switching remains functional in memory even if persistence fails. The only thing lost in that case is cross-session retention.

## System Locale Detection

The provider tries to honor the host operating system before falling back to browser APIs.

Primary source:

- `@tauri-apps/plugin-os`
- `locale()`

Fallback source:

- `navigator.language`
- `navigator.languages?.[0]`

This matters because the project runs as a Tauri desktop app, but the frontend can still be started in plain web development mode. The provider is written to support both environments gracefully.

Behavior summary:

- in Tauri desktop mode, OS locale is the preferred runtime default;
- in plain frontend mode, browser locale becomes the fallback detector;
- if neither resolves to `es` or `en`, Spanish is used.

## React Provider Design

`LanguageProvider` exposes a context with three values:

- `language`
- `setLanguage(language)`
- `supportedLanguages`

The provider wraps the application with `I18nextProvider`, so any descendant component can call `useTranslation(...)`.

The current list of exposed languages is hardcoded as:

```ts
[
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
]
```

Important implementation detail: these labels are not themselves translated through `t()`. They are literal display labels returned from context. That is consistent with many language pickers, where the native language name is shown independently of the current UI locale.

The hook `useLanguage()` enforces provider usage and throws if used outside the provider tree. This prevents silent failure and makes integration mistakes obvious during development.

## Provider Placement In The App Tree

The application root in `src/main.tsx` wraps providers in this order:

1. `LanguageProvider`
2. `ThemeProvider`
3. `ThemePresetProvider`
4. `UpdateProvider`
5. `TooltipProvider`

Placing `LanguageProvider` at the top ensures that:

- every other provider and feature can safely call `useTranslation(...)`;
- settings, welcome screens, sidebar controls, editor UI, and updater UI all see the same active locale;
- language is resolved once for the whole app tree.

## How Components Consume Translations

Components use `react-i18next` through `useTranslation(...)`.

Examples from the current codebase:

- `useTranslation("common")` for generic UI controls such as the standalone language switch
- `useTranslation("journal")` for journal-specific screens and editor UI
- `useTranslation(["journal", "common"])` where a component needs strings from multiple namespaces, such as the settings dialog

Typical component pattern:

```ts
const { t } = useTranslation("journal");
```

Then strings are resolved with keys such as:

- `t("welcome.title")`
- `t("settings.checkForUpdates")`
- `t("menu.language")`

The project instructions explicitly require all user-facing UI strings to go through `t()` and to exist in both Spanish and English locale trees.

## Language Switching UI

There are two main ways the user can change the language in the current UI.

### 1. Standalone language switch

`src/components/language-switch.tsx` renders a dropdown button showing the active language code in uppercase, for example `ES` or `EN`.

It gets its data from `useLanguage()`:

- current language
- `setLanguage`
- `supportedLanguages`

When the user clicks an item, the component calls `setLanguage(item.code)`.

This control is currently reused in several high-visibility locations such as the welcome screen, unlock screen, and journal sidebar.

### 2. Settings dialog selector

`src/components/journal/SettingsDialog.tsx` also exposes a language selector using the same provider context.

This ensures the language can be changed from the central application settings without requiring a dedicated toolbar button.

## What Happens When The User Changes Language

When `setLanguage(nextLanguage)` is called in the provider, the following sequence occurs:

1. `i18n.changeLanguage(nextLanguage)` updates the active locale inside `i18next`.
2. `setLanguageState(nextLanguage)` updates React context state.
3. `saveLanguage(nextLanguage)` persists the preference to `settings.json`.

`react-i18next` then causes subscribed components to re-render with the new locale.

There is no page reload, process restart, or full app remount involved. Language switching is live and immediate.

## Namespaces And Product Evolution

The namespace list still includes `todo`, which reflects the repository history as a project that started from a TODO template.

From a product point of view:

- `journal` is the primary namespace for the real application;
- `todo` remains for legacy scaffold surfaces;
- `common` is the cross-cutting shared namespace.

This split is consistent with the repository guidance that new features should align with the journal product rather than expand the old TODO example.

## Why `useSuspense` Is Disabled

The `i18next` React integration is configured with:

```ts
react: {
  useSuspense: false,
}
```

Because translation resources are bundled statically, the app does not need Suspense-based async loading to fetch locale files. Disabling Suspense keeps rendering predictable and avoids wrapping the application in a Suspense boundary purely for i18n.

## Fallback Behavior And Error Tolerance

The current system is deliberately conservative.

Fallback behavior works at several levels:

- if no saved preference exists, use system locale;
- if system locale cannot be resolved, use browser locale;
- if browser locale is unsupported, use Spanish;
- if persistence fails, keep the selected language in memory;
- if a component uses the provider hook outside the provider tree, throw immediately.

This design strongly favors a working interface over strict failure semantics.

## Current Limitations And Practical Implications

The current implementation is clean and effective, but it is intentionally lightweight. These are the relevant limitations of the present design.

### Static resource loading

All translation catalogs are bundled at startup. This keeps the system simple, but it means:

- no per-language code splitting;
- no on-demand namespace fetching;
- larger frontend bundle than a lazy-loaded approach.

For a two-language desktop app, this tradeoff is reasonable.

### Spanish is the hard fallback

Even if the user machine runs in another language, unsupported locales fall back to Spanish rather than English. That is a deliberate product choice embedded in the current config.

### No runtime translation validation

The app depends on discipline and repository rules to keep locale files in sync. There is currently no automated build-time validation ensuring that every key exists in both languages.

### Provider state is frontend-scoped

The sidecar and Rust host do not participate in language resolution. If a future native menu, system notification, or sidecar-generated message needs localization, that would require an additional cross-layer design.

### Labels for supported languages are hardcoded

The language names shown in selectors are not pulled from locale files. In practice this is acceptable, but it is still a separate source of truth.

## Adding A New Language In The Current Design

To add a new locale under the present architecture, these steps would be required:

1. Add the new locale JSON files under `src/i18n/locales/<code>/`.
2. Import the files in `src/i18n/i18n.ts`.
3. Register them under `resources`.
4. Extend the `SupportedLanguage` union in `src/i18n/resources.ts`.
5. Teach `parseSupportedLanguage(...)` how to map locale values to the new code.
6. Extend `supportedLanguages` in `LanguageProvider`.
7. Ensure every required namespace exists for the new locale.

Because the system is statically declared, missing any of those steps would leave the locale only partially wired.

## End-To-End Summary

The multilingual system in My Journal is implemented as a frontend-centered, statically bundled `i18next` setup with a Tauri-aware language provider.

The essential behavior is:

- initialize `i18next` with Spanish and English resources;
- boot into Spanish safely;
- resolve saved preference or system locale asynchronously;
- expose the result through React context;
- let components read strings with `useTranslation(...)`;
- persist the user choice in `settings.json`.

That design matches the current product stage well: it is easy to reason about, desktop-friendly, compatible with both Tauri and plain frontend development, and consistent with the repository rule that every user-facing string must be localized in both English and Spanish.