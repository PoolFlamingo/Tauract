#!/usr/bin/env node
/**
 * Generates the latest.json updater manifest from CI build artifacts.
 * Run from the repo root after downloading all platform artifacts to bundles/.
 *
 * Environment variables (set automatically by GitHub Actions):
 *   GITHUB_REF_NAME   - e.g. "v1.0.2"
 *   GITHUB_REPOSITORY - e.g. "nitropc/tauract"
 */
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { basename } from "path";

const VERSION = (process.env.GITHUB_REF_NAME ?? "v0.0.0").replace(/^v/, "");
const TAG = process.env.GITHUB_REF_NAME ?? `v${VERSION}`;
const REPO = process.env.GITHUB_REPOSITORY ?? "";
const BASE_URL = `https://github.com/${REPO}/releases/download/${TAG}`;
const DATE = new Date().toISOString();
const NOTES = `See release notes at https://github.com/${REPO}/releases/tag/${TAG}`;

/**
 * Finds a file in bundles/ matching the given glob pattern.
 * Optionally excludes .sig files.
 */
function findFile(pattern, excludeSig = true) {
	try {
		const excludeFlag = excludeSig ? `! -name "*.sig"` : "";
		const result = execSync(
			`find bundles/ -name "${pattern}" ${excludeFlag} -print -quit 2>/dev/null`,
			{ encoding: "utf-8" },
		).trim();
		return result || "";
	} catch {
		return "";
	}
}

/**
 * Reads the full content of a .sig file (preserves newlines for the manifest).
 */
function readSig(filePath) {
	if (!filePath) return "";
	try {
		return readFileSync(filePath, "utf-8");
	} catch {
		return "";
	}
}

const winExePath = findFile("*.exe");
const winSigPath = findFile("*.exe.sig", false);
const linuxAppImagePath = findFile("*.AppImage");
const linuxSigPath = findFile("*.AppImage.sig", false);
const macosTarPath = findFile("*.app.tar.gz");
const macosSigPath = findFile("*.app.tar.gz.sig", false);

const manifest = {
	version: VERSION,
	notes: NOTES,
	pub_date: DATE,
	platforms: {
		"windows-x86_64": {
			signature: readSig(winSigPath),
			url: `${BASE_URL}/${basename(winExePath || "update.exe")}`,
		},
		"linux-x86_64": {
			signature: readSig(linuxSigPath),
			url: `${BASE_URL}/${basename(linuxAppImagePath || "update.AppImage")}`,
		},
		"darwin-aarch64": {
			signature: readSig(macosSigPath),
			url: `${BASE_URL}/${basename(macosTarPath || "update.app.tar.gz")}`,
		},
	},
};

writeFileSync("latest.json", JSON.stringify(manifest, null, 2));
console.log(`Generated latest.json for version ${VERSION}`);
