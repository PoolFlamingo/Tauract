#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { createInterface } from "readline";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const arg = process.argv[2];
const isDryRun = process.argv.includes("--dry-run");

if (!arg) {
	console.log(
		"Usage: node scripts/release.mjs <patch|minor|major|x.y.z> [--dry-run]",
	);
	process.exit(1);
}

function bump(current, type) {
	const [major, minor, patch] = current.split(".").map(Number);
	if (type === "patch") return `${major}.${minor}.${patch + 1}`;
	if (type === "minor") return `${major}.${minor + 1}.0`;
	if (type === "major") return `${major + 1}.0.0`;
	if (/^\d+\.\d+\.\d+$/.test(type)) return type;
	console.error(`Invalid version argument: ${type}`);
	process.exit(1);
}

// Read current version from package.json
const pkgPath = resolve(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const currentVersion = pkg.version;
const nextVersion = bump(currentVersion, arg);
const tag = `v${nextVersion}`;

if (isDryRun) {
	console.log(`Current version: ${currentVersion}`);
	console.log(`Next version:    ${nextVersion}`);
	console.log(`Tag:             ${tag}`);
	process.exit(0);
}

// Ask for confirmation
const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise((resolve) => {
	rl.question(
		`Bump ${currentVersion} → ${nextVersion} (tag: ${tag}). Continue? [y/N] `,
		resolve,
	);
});
rl.close();

if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
	console.log("Aborted.");
	process.exit(0);
}

// Warn on dirty working tree
try {
	const status = execSync("git status --porcelain", {
		cwd: root,
		encoding: "utf-8",
	});
	if (status.trim()) {
		console.warn(
			"Warning: working tree has uncommitted changes. They will be included in the release commit.",
		);
	}
} catch (e) {
	console.warn("Could not check git status:", e.message);
}

// Update package.json
pkg.version = nextVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, "\t") + "\n");

// Update src-tauri/tauri.conf.json
const tauriConfPath = resolve(root, "src-tauri/tauri.conf.json");
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));
tauriConf.version = nextVersion;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, "\t") + "\n");

// Update src-tauri/Cargo.toml (first version = "..." line in the package section)
const cargoPath = resolve(root, "src-tauri/Cargo.toml");
let cargo = readFileSync(cargoPath, "utf-8");
cargo = cargo.replace(/^version = ".*?"/m, `version = "${nextVersion}"`);
writeFileSync(cargoPath, cargo);

console.log(`Updated versions to ${nextVersion}`);

// Git: commit, tag, push
try {
	execSync("git add -A", { cwd: root, stdio: "inherit" });
	execSync(`git commit -m "chore: release ${tag}"`, {
		cwd: root,
		stdio: "inherit",
	});
	execSync(`git tag ${tag}`, { cwd: root, stdio: "inherit" });
	execSync("git push", { cwd: root, stdio: "inherit" });
	execSync(`git push origin ${tag}`, { cwd: root, stdio: "inherit" });
	console.log(`\nReleased ${tag} successfully.`);
} catch (e) {
	console.error("Git operation failed:", e.message);
	process.exit(1);
}
