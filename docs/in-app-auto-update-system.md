# My Journal In-App Auto-Update System

## Purpose And Scope

This document explains how the in-app update system is currently implemented in My Journal. It covers the frontend provider, the Tauri updater plugin integration, persisted user preferences, the startup check policy, the download and install flow, how the settings UI reflects update state, and the coupling between the app and the GitHub release pipeline.

The update system is designed so the desktop application can:

- discover whether a newer version exists;
- download the update package from GitHub Releases;
- install the downloaded update using Tauri's updater mechanism;
- relaunch the app after installation.

The implementation is currently centered on the React frontend plus Tauri plugins. The sidecar does not participate in update management.

## High-Level Architecture

The updater stack is distributed across four layers.

### 1. Tauri configuration

`src-tauri/tauri.conf.json` defines the updater plugin endpoint and install mode.

Current updater endpoint:

```json
"https://github.com/nitropc/my-journal/releases/latest/download/latest.json"
```

This file is the manifest consumed by the Tauri updater plugin to determine whether a newer version is available and where to download the platform-specific bundle.

### 2. Rust host plugin registration

`src-tauri/src/lib.rs` registers the native plugins used by the app, including:

- `tauri-plugin-updater`
- `tauri-plugin-process`
- `tauri-plugin-store`
- `tauri-plugin-os`

The updater plugin registration is what enables the frontend to call the JavaScript updater APIs exposed by `@tauri-apps/plugin-updater`.

### 3. Frontend service wrapper

`src/services/updaterApi.ts` wraps the raw Tauri updater calls and keeps a module-level reference to the currently available update object.

### 4. React state provider

`src/components/update-provider.tsx` orchestrates the full user-facing lifecycle:

- current version loading;
- startup auto-check;
- throttling;
- user mode persistence;
- background downloading;
- progress tracking;
- install and relaunch actions;
- error handling.

The Settings dialog then consumes that provider and exposes the update controls to the user.

## Dependencies And Native Plugins

The update flow depends on these packages being present and registered.

Frontend packages:

- `@tauri-apps/plugin-updater`
- `@tauri-apps/plugin-process`
- `@tauri-apps/api`
- `@tauri-apps/plugin-store`

Rust dependencies in `src-tauri/Cargo.toml`:

- `tauri-plugin-updater = "2"`
- `tauri-plugin-process = "2"`
- `tauri-plugin-store = "2"`

Without the updater plugin, the frontend could not check remote manifests or download signed bundles. Without the process plugin, the app could not relaunch itself after installation.

## Version Source Of Truth

The current version is duplicated intentionally across the release-relevant manifests:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

At runtime, `UpdateProvider` calls `getVersion()` from `@tauri-apps/api/app`, so the user-facing version shown in the settings UI comes from the Tauri application metadata, not from the web bundle.

This is important because the update comparison logic must match the packaged desktop version, not only the frontend package version.

## Updater Configuration In `tauri.conf.json`

The current configuration has three especially important fields.

### Endpoint

```json
"endpoints": [
  "https://github.com/nitropc/my-journal/releases/latest/download/latest.json"
]
```

This endpoint is stable and always points to the latest release's updater manifest. The workflow that publishes releases is responsible for uploading `latest.json` as a release asset.

### Windows install mode

```json
"windows": {
  "installMode": "passive"
}
```

This indicates a non-interactive or minimally interactive installation mode for Windows updater behavior.

### Public key

```json
"pubkey": ""
```

At the moment, the config shows an empty updater public key. The GitHub workflow signs release artifacts using Tauri signing secrets, so in a production-grade setup this public key must match the signing key pair used by the workflow. If it remains empty, signature verification is not fully configured from the application side.

That is an important operational detail: the release pipeline is already designed around signed bundles, but the app config still needs the corresponding public key to complete the trust chain.

## Frontend State Model

`UpdateProvider` maintains all update state inside React context.

The exposed context contract includes:

- `currentVersion`
- `mode`
- `setMode(mode)`
- `checking`
- `availableVersion`
- `releaseNotes`
- `downloaded`
- `progress`
- `downloading`
- `error`
- `checkNow()`
- `downloadUpdate()`
- `installAndRestart()`
- `dismissError()`

This creates a single source of truth for update UX across the frontend.

## Persisted Update Preferences

Update preferences are stored in the same Tauri Store file used by other local app settings.

Storage file:

- `settings.json`

Keys used by the update provider:

- `updateMode`
- `updateLastCheck`

### `updateMode`

The app supports two modes:

- `notify`
- `background`

Their semantics are:

- `notify`: check for updates and expose the result in the UI, but do not download automatically;
- `background`: check for updates and immediately begin download if one is available.

### `updateLastCheck`

This timestamp is used to throttle automatic checks on startup. The current interval is one hour:

```ts
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
```

The provider persists `Date.now()` after a completed check attempt.

## Startup Lifecycle

Update startup behavior is split into two asynchronous flows.

### Flow 1: Load current app version

On mount, the provider calls `getVersion()`.

If successful:

- `currentVersion` is updated to the packaged app version.

If it fails:

- the provider leaves the default `0.0.0` value in place.

### Flow 2: Auto-check with throttle

The provider then executes a startup routine that:

1. reads the saved update mode from `settings.json`;
2. stores it in React state;
3. reads the last-check timestamp;
4. compares the elapsed time against the one-hour threshold;
5. if the threshold has not passed, does nothing;
6. if the threshold has passed, waits 5 seconds;
7. then calls `performCheck(...)`.

That 5-second delay is intentional. It reduces startup contention with the rest of the application bootstrap.

In practice, the app does not check for updates immediately on every launch. It only does so when enough time has passed and only after a short startup grace period.

## Core Check Logic

The provider's main engine is `performCheck(autoDownload)`.

Its responsibilities are:

1. mark `checking = true`;
2. clear any previous `error`;
3. call `updaterApi.checkForUpdate()`;
4. if an update exists, store:
   - `availableVersion`
   - `releaseNotes`
5. if `autoDownload` is `true`, immediately download and install the update package payload;
6. persist the last-check timestamp;
7. clear `checking` in `finally`.

If no update exists, the provider resets:

- `availableVersion` to `null`
- `releaseNotes` to `null`

The provider uses a `mountedRef` guard so asynchronous completions do not update state after unmount.

## Service Layer And The `currentUpdate` Handle

`src/services/updaterApi.ts` keeps a module-level variable:

```ts
let currentUpdate: Update | null = null;
```

This value is set when `checkForUpdate()` succeeds.

Why this exists:

- the raw Tauri updater plugin returns an `Update` object;
- that object contains the `downloadAndInstall(...)` method;
- the UI provider wants a simpler API and does not store the raw object directly in React state.

So the wrapper works like this:

1. `checkForUpdate()` calls `check()` from `@tauri-apps/plugin-updater`;
2. the returned object is saved to `currentUpdate`;
3. `downloadAndInstall(...)` later consumes that saved object.

This design keeps the provider state serializable and simple.

## Manual Check Flow

When the user clicks the "Check for updates" button in the settings dialog, the UI calls:

```ts
await update.checkNow();
```

`checkNow()` delegates to `performCheck(mode === "background")`.

That means manual checks still honor the configured update mode:

- in `notify` mode, the check only announces availability;
- in `background` mode, the check can immediately start downloading.

## Download Flow

There are two ways a download can begin.

### Automatic download

If a startup or manual check happens while mode is `background`, the provider immediately starts downloading as part of `performCheck(true)`.

### User-initiated download

If mode is `notify`, the settings screen can later call `downloadUpdate()` after an available version is shown.

That method first guards against invalid states:

- no available version
- already downloading
- already downloaded

If the guards pass, it:

1. sets `downloading = true`;
2. resets `progress` to `null`;
3. clears previous `error`;
4. calls `updaterApi.downloadAndInstall(...)`.

## Progress Tracking

Progress reporting is implemented by subscribing to the Tauri updater event stream inside `updaterApi.downloadAndInstall(...)`.

The wrapper translates updater events into a simple progress shape:

```ts
interface UpdateProgress {
  contentLength: number;
  downloaded: number;
}
```

Event mapping:

- `Started`: capture total content length, emit zero downloaded bytes
- `Progress`: increment downloaded bytes by each chunk length
- `Finished`: emit full content length as downloaded

This state is then used by the settings dialog to render a progress bar.

## Install And Relaunch Semantics

The current service naming can be slightly misleading if read too quickly, so the real behavior should be explicit.

### `downloadAndInstall(...)`

In the Tauri updater API, this method downloads the update and prepares the installed payload according to the platform updater flow.

### `installAndRelaunch()`

In My Journal, this method does not perform the download. It simply calls:

```ts
await relaunch();
```

So the provider's install button effectively means:

- the update payload has already been downloaded and prepared;
- now restart the app so the platform updater can finalize or switch to the new version.

The UI text reflects this by only showing the restart action when `downloaded === true` and `availableVersion` is present.

## Settings UI Integration

The current update UI lives in the "About" tab of `src/components/journal/SettingsDialog.tsx`.

The dialog surfaces several update states.

### Error state

If `update.error` is set, the dialog shows an inline error message. Clicking the message calls `dismissError()`.

### Ready-to-install state

If `downloaded` is `true` and `availableVersion` is set, the dialog:

- shows a success-style message;
- renders the "Install and restart" button.

### Available-but-not-downloaded state

If an update is available but no download is in progress and nothing has been downloaded yet, the dialog:

- shows the available version;
- renders the "Download and install" button.

### Downloading state

If a download is active, the dialog:

- shows a status label;
- renders a progress bar if `contentLength > 0`.

### Up-to-date state

If there is no available version, no active check, and no error, the dialog shows that the user already has the latest version.

### Mode selector

The same dialog lets the user pick between:

- `Notify only`
- `Download in background`

The selection is stored immediately through `setMode(...)` and persisted to `settings.json`.

## Release Notes Handling

The provider stores `releaseNotes` from `update.body ?? null` after a successful check.

At the moment, those notes are part of the provider state but are not visibly rendered in the settings dialog.

That means the data path already exists, but the UI currently uses only:

- version availability
- progress
- install readiness
- error status

If richer update messaging is needed later, the provider is already carrying the release note body.

## Error Handling Strategy

The current system favors resilience and recoverability over strict failure escalation.

Examples:

- if current version lookup fails, the UI still works with a fallback version string;
- if settings persistence fails, update mode still works for the current session;
- if update check fails, the provider stores a user-visible error string;
- if download fails, the provider preserves the error and stops the downloading state;
- if relaunch fails, the provider exposes an install failure message.

Errors are intentionally converted to human-readable strings using `err instanceof Error ? err.message : ...`.

## Coupling With GitHub Releases

The in-app updater is tightly coupled to the GitHub release automation pipeline.

The app does not talk to a custom update server. Instead, it relies on a release asset named `latest.json` hosted under the latest GitHub Release.

That means successful in-app updating depends on all of the following being true:

1. a tag release is published;
2. the CI workflow builds signed platform bundles;
3. the workflow generates a valid `latest.json` manifest;
4. the manifest is uploaded as a release asset;
5. the bundle URLs in the manifest point to the correct files;
6. the app's configured public key matches the signing key pair.

If any of those break, the app may stop detecting or validating updates.

## Current Behavioral Characteristics

These details are important because they explain exactly what the user experiences today.

### Checks are not continuous

The app does not poll continuously in the background. It checks:

- on startup, if at least one hour has passed since the previous check;
- whenever the user manually requests a check.

### Background mode downloads, but does not silently restart

Background mode only automates the fetch step. The user still needs to reach the restart action exposed by the UI.

### No dedicated toast or system notification path yet

The current implementation stores update state in context and exposes it in settings, but it does not yet publish a separate toast or desktop notification when a background download becomes ready.

### `clearUpdate()` is currently unused

The service wrapper exports `clearUpdate()`, but nothing in the current frontend calls it. The provider instead overwrites update state on subsequent checks.

## Operational Caveats

Several practical caveats are worth documenting because they matter in production.

### Empty updater public key in app config

The workflow is set up to sign artifacts, but `tauri.conf.json` currently shows an empty `pubkey`. That should be completed before relying on production updater verification.

### The release manifest advertises one updater asset per platform

The GitHub workflow uploads more installers than the updater uses. For example, Windows uploads MSI and NSIS, but the updater manifest points to the updater-compatible asset selected by the workflow. Manual downloads and in-app updates are therefore related but not identical concerns.

### The provider depends on a successful prior check before download

Because `downloadAndInstall(...)` uses the cached `currentUpdate` object, calling download without a successful check first would fail with `No update available`. The UI guards against this, but the dependency exists by design.

## End-To-End Summary

The in-app updater in My Journal is a React-driven orchestration layer over Tauri's native updater plugin.

The full flow is:

1. Tauri exposes updater capabilities through native plugins.
2. The frontend provider loads version and saved preferences.
3. Startup or manual checks call the GitHub-hosted updater manifest.
4. If a new version exists, the provider stores version and note metadata.
5. Depending on mode, the app either waits for user action or downloads immediately.
6. Progress is streamed into React state.
7. Once the payload is ready, the UI offers a restart action.
8. Relaunch hands control back to the packaged updater flow.

This architecture is small, understandable, and already usable, while still leaving room for future improvements such as richer release notes UI, explicit ready-to-install notifications, and a fully configured signing public key.