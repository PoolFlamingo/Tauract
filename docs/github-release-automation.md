# My Journal GitHub Release Automation

## Purpose And Scope

This document explains how My Journal automates application releases using local version bumping, Git tags, GitHub Actions, signed Tauri bundles, and GitHub Releases.

It focuses on the complete release chain currently implemented in the repository:

1. a local script bumps versions and creates a Git tag;
2. the tag is pushed to GitHub;
3. a GitHub Actions workflow builds release artifacts for multiple operating systems;
4. the workflow generates the updater manifest consumed by the application;
5. GitHub Release assets are published automatically.

This is not only a packaging flow. It is also the backbone of the in-app update system, because the desktop app reads update information from the release assets produced by this pipeline.

## High-Level Release Model

The repository uses a tag-driven release model.

The critical rule is:

- pushing a tag that matches `v*` triggers the release workflow.

Examples:

- `v1.0.2`
- `v1.1.0`
- `v2.0.0`

The tag naming convention is important because both the local release script and the GitHub Actions workflow assume the tag format `v<semver>`.

## Entry Point: Local Release Script

The main local entry point is:

- `npm run release`

That script executes:

```bash
node scripts/release.mjs
```

The script is intentionally designed to handle both semantic increments and explicit version numbers.

Supported invocations:

- `node scripts/release.mjs patch`
- `node scripts/release.mjs minor`
- `node scripts/release.mjs major`
- `node scripts/release.mjs 1.2.3`
- `node scripts/release.mjs patch --dry-run`

## What The Release Script Actually Does

`scripts/release.mjs` performs the following steps.

### 1. Read and validate input

The script expects either:

- `patch`
- `minor`
- `major`
- an explicit version in `x.y.z` format

If no valid argument is provided, it prints usage instructions and exits with code `1`.

### 2. Determine the next version

The script reads the current version from `package.json` and computes the next version with the helper `bump(current, type)`.

Semver behavior:

- `patch`: increments only the patch component
- `minor`: increments the minor component and resets patch to zero
- `major`: increments the major component and resets minor and patch to zero
- explicit version: uses the provided value after validating `x.y.z`

### 3. Build the tag name

The tag is always generated as:

```txt
v<nextVersion>
```

For example:

- version `1.0.2` -> tag `v1.0.2`

### 4. Support dry runs

If `--dry-run` is present, the script only prints:

- current version
- next version
- target tag

Then it exits without modifying files or running Git commands.

This is useful for verifying the next release number before touching the repository.

### 5. Ask for confirmation

Before changing files, the script prompts interactively:

```txt
Continue? [y/N]
```

Any answer other than `y` or `yes` aborts the release.

### 6. Warn about dirty working trees

The script runs:

```bash
git status --porcelain
```

If it detects uncommitted changes, it does not block the release. It only warns that those changes will be included in the release commit.

This is an intentional but risky convenience choice. The release process is permissive, not strict.

### 7. Update version numbers in all relevant manifests

The script updates three files:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Why all three matter:

- `package.json` keeps the frontend and npm metadata aligned;
- `src-tauri/tauri.conf.json` is used by Tauri packaging and app metadata;
- `src-tauri/Cargo.toml` keeps the Rust package version aligned.

This multi-file synchronization is essential because the application is a hybrid project, not a pure Node.js app.

### 8. Commit, tag, and push

Once versions are updated, the script executes:

- `git add -A`
- `git commit -m "chore: release vX.Y.Z"`
- `git tag vX.Y.Z`
- `git push`
- `git push origin vX.Y.Z`

This means one local command can complete the entire source-control side of the release.

### 9. Hand off to GitHub Actions

After the tag reaches GitHub, the script itself stops. From that point on, GitHub Actions is responsible for building installers, signing them, generating `latest.json`, and publishing the release.

## Files Modified By The Local Script

The script deliberately keeps the set of edited files small and release-focused.

### `package.json`

The script parses the JSON, updates the root `version`, and writes the file back using tab indentation.

### `src-tauri/tauri.conf.json`

The script parses the JSON, updates the root `version`, and rewrites the config file.

### `src-tauri/Cargo.toml`

The script uses a regex replacement to modify the first matching `version = "..."` line in the package section.

This approach is simple and effective, but it assumes the file structure remains compatible with that regex.

## What The Script Does Not Do

The local script intentionally does not:

- build the app locally;
- run tests;
- lint the project;
- validate the updater manifest;
- create release notes text by itself;
- update `package-lock.json` version metadata;
- enforce a clean working tree.

Those omissions are worth noting because they define the real trust boundary of the automation. The script is a release trigger, not a full release validation gate.

## GitHub Actions Trigger

The CI release workflow lives in:

- `.github/workflows/release.yml`

It is triggered by:

```yaml
on:
  push:
    tags:
      - 'v*'
```

This means the workflow is tag-driven only. Regular branch pushes do not publish releases.

## Workflow Structure

The workflow has two jobs:

1. `build`
2. `release`

`release` depends on `build`, so GitHub only publishes a release after all configured platform builds finish.

## Build Matrix

The `build` job uses a matrix with three platform targets.

### Windows

- runner: `windows-latest`
- target: `x86_64-pc-windows-msvc`
- bundles: `msi,nsis`

### Linux

- runner: `ubuntu-22.04`
- target: `x86_64-unknown-linux-gnu`
- bundles: `deb,rpm`

### macOS

- runner: `macos-latest`
- target: `aarch64-apple-darwin`
- bundles: `dmg,app`

`fail-fast: false` is enabled, which means one matrix failure does not immediately cancel the others.

## Build Job Steps In Detail

Each matrix run performs roughly the same sequence.

### Checkout source

The workflow first checks out the repository.

### Install Bun

Bun is required because the project builds a Bun sidecar during the Tauri build flow.

### Install Node.js

The workflow currently uses Node.js 22.

### Install Rust toolchain

The job installs stable Rust and the target triple required by the current matrix item.

### Cache Rust artifacts

`Swatinem/rust-cache@v2` caches Rust build outputs for the `src-tauri` workspace.

### Install Linux system packages when needed

On Ubuntu, the workflow installs required native dependencies such as WebKitGTK and `patchelf`, which are necessary for Tauri Linux builds.

### Install npm dependencies

The project uses:

```bash
npm install --legacy-peer-deps
```

### Build release bundles

The core build command is:

```bash
npm run tauri build -- --bundles <bundle-list>
```

The build step is provided with these secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Those secrets are critical because Tauri uses them to sign updater-compatible bundles and generate `.sig` files.

## Which Assets Are Uploaded Per Platform

After building, each matrix run uploads platform-specific artifacts.

### Windows artifacts

Uploaded paths:

- `src-tauri/target/release/bundle/msi/*.msi`
- `src-tauri/target/release/bundle/msi/*.msi.sig`
- `src-tauri/target/release/bundle/nsis/*.exe`
- `src-tauri/target/release/bundle/nsis/*.exe.sig`

### macOS artifacts

Uploaded paths:

- `src-tauri/target/release/bundle/dmg/*.dmg`
- `src-tauri/target/release/bundle/macos/*.app.tar.gz`
- `src-tauri/target/release/bundle/macos/*.app.tar.gz.sig`

### Linux artifacts

Uploaded paths:

- `src-tauri/target/release/bundle/deb/*.deb`
- `src-tauri/target/release/bundle/rpm/*.rpm`
- `src-tauri/target/release/bundle/appimage/*.AppImage`
- `src-tauri/target/release/bundle/appimage/*.AppImage.sig`

These artifacts serve two different audiences:

- manual download users who want installers such as MSI, DMG, DEB, or RPM;
- the in-app updater, which needs updater-compatible files plus signatures.

## Release Job Responsibilities

Once the build matrix finishes, the `release` job runs on Ubuntu with `contents: write` permission.

Its responsibilities are:

1. download all previously uploaded artifacts;
2. generate the updater manifest `latest.json`;
3. create the GitHub Release and attach all files.

## Artifact Download Strategy

The workflow uses `actions/download-artifact@v4` with:

```yaml
path: bundles/
merge-multiple: false
```

This preserves each artifact group under `bundles/` and gives the manifest generation step a predictable directory tree to scan.

## How `latest.json` Is Generated

This is the most important bridge between GitHub Releases and the in-app updater.

The workflow extracts:

- `VERSION` from the pushed tag without the leading `v`
- `TAG` from `GITHUB_REF_NAME`
- `REPO` from `GITHUB_REPOSITORY`
- `BASE_URL` as the release download URL for the current tag
- `DATE` as the current UTC timestamp
- `NOTES` as a link back to the release page

Then it scans the downloaded artifacts to locate:

- the first Windows `.exe` and its `.exe.sig`
- the first Linux `.AppImage` and its `.AppImage.sig`
- the first macOS `.app.tar.gz` and its `.app.tar.gz.sig`

Helper shell functions:

- `read_sig(pattern)` reads the contents of a signature file
- `find_name(pattern)` locates the asset filename for a given artifact type

Using those values, the workflow writes `latest.json` with this structure:

```json
{
  "version": "1.0.2",
  "notes": "See release notes at https://github.com/<repo>/releases/tag/v1.0.2",
  "pub_date": "2026-04-16T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/<repo>/releases/download/v1.0.2/<file>.exe"
    },
    "linux-x86_64": {
      "signature": "...",
      "url": "https://github.com/<repo>/releases/download/v1.0.2/<file>.AppImage"
    },
    "darwin-aarch64": {
      "signature": "...",
      "url": "https://github.com/<repo>/releases/download/v1.0.2/<file>.app.tar.gz"
    }
  }
}
```

This manifest is what the Tauri updater plugin reads from inside the desktop app.

## Why Only Certain Assets Appear In `latest.json`

The workflow uploads more artifacts than the updater manifest advertises.

Examples:

- Windows manual installers include MSI, but `latest.json` points to the updater-compatible executable.
- Linux manual packages include DEB and RPM, but `latest.json` points to the AppImage.
- macOS includes DMG for manual installation, but `latest.json` points to the signed `.app.tar.gz` bundle.

This distinction matters because a GitHub Release can expose several distribution formats, while Tauri's updater manifest needs one concrete, signed update payload per supported platform entry.

## GitHub Release Creation

The final publishing step uses:

- `softprops/action-gh-release@v2`

With configuration:

- `generate_release_notes: true`
- attached files: `bundles/**/*` and `latest.json`

As a result, every release contains:

- all uploaded installers and signature files;
- the updater manifest;
- GitHub-generated release notes.

The app then consumes the release indirectly through the stable URL:

- `releases/latest/download/latest.json`

## End-To-End Release Timeline

Putting everything together, the actual release path is:

1. Run `npm run release patch` or similar.
2. The script calculates the next version.
3. The script updates `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
4. The script commits those changes.
5. The script creates tag `vX.Y.Z`.
6. The script pushes the commit and the tag.
7. GitHub Actions detects the pushed tag.
8. The matrix builds Tauri bundles for Windows, Linux, and macOS.
9. The workflow signs updater-compatible artifacts with Tauri signing secrets.
10. The workflow uploads artifacts.
11. The release job downloads those artifacts.
12. The release job generates `latest.json`.
13. The release job creates the GitHub Release and attaches all files.
14. The running application later checks `latest.json` and offers the update to users.

## Operational Requirements

For this release system to work correctly, several conditions must hold.

### Git must be available locally

The local script depends on Git for status inspection, commit creation, tag creation, and pushes.

### The operator must have push permissions

Both the branch push and the tag push must succeed.

### GitHub Actions must be enabled

The release workflow does the actual packaging and publication.

### Release secrets must exist

The workflow expects:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Without them, signed updater artifacts will not be generated correctly.

### App-side updater configuration must match the signing setup

The desktop app should expose the matching updater public key in `src-tauri/tauri.conf.json` so published signatures can be validated by the client.

## Risks And Current Caveats

The current automation is effective, but several details are worth documenting honestly.

### The script can release with unrelated local changes

Because it only warns on a dirty working tree and then runs `git add -A`, any uncommitted file can end up inside the release commit.

### The script does not enforce pre-release validation

There is no mandatory build, test, or lint gate in the local script before tagging.

### The workflow currently targets a limited platform matrix

The updater manifest currently advertises:

- `windows-x86_64`
- `linux-x86_64`
- `darwin-aarch64`

That means the automated updater coverage is narrower than the full universe of possible Tauri targets.

### The updater trust chain is only complete if the app public key is configured

The workflow signs artifacts, but the client configuration must still expose the corresponding public key for verification.

### Release notes for the updater are generic

`latest.json` currently uses a notes string that points users to the GitHub release page instead of embedding the full generated release notes body.

## Why This Automation Fits The Project

This release model is well aligned with My Journal's architecture because:

- the project is a desktop app with multi-platform packaging needs;
- releases must produce native installers, not just a web bundle;
- the in-app updater needs signed artifacts and a stable manifest location;
- Git tags provide a clear, auditable release boundary;
- GitHub Releases already serve both distribution and updater metadata hosting.

In short, one tag drives both human-facing distribution and machine-facing update discovery.

## End-To-End Summary

My Journal's release automation is a tag-triggered pipeline that starts locally and finishes in GitHub.

Locally, `scripts/release.mjs` synchronizes version numbers, creates a release commit, tags it, and pushes it. In CI, `.github/workflows/release.yml` builds signed Tauri bundles for the configured targets, uploads them, generates `latest.json`, and publishes everything to a GitHub Release. The desktop app then consumes that release output through the updater endpoint configured in Tauri.

That makes the release pipeline more than a deployment convenience. It is also a core runtime dependency of the app's update mechanism.