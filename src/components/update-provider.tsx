import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { load } from "@tauri-apps/plugin-store";
import * as updaterApi from "@/services/updaterApi";
import type { UpdateProgress } from "@/services/updaterApi";

type UpdateMode = "notify" | "background";

interface UpdateContextValue {
	currentVersion: string;
	mode: UpdateMode;
	setMode: (mode: UpdateMode) => void;
	checking: boolean;
	availableVersion: string | null;
	releaseNotes: string | null;
	downloaded: boolean;
	progress: UpdateProgress | null;
	downloading: boolean;
	error: string | null;
	checkNow: () => Promise<void>;
	downloadUpdate: () => Promise<void>;
	installAndRestart: () => Promise<void>;
	dismissError: () => void;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

/** How long to wait between automatic update checks (1 hour). */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function UpdateProvider({ children }: { children: React.ReactNode }) {
	const [currentVersion, setCurrentVersion] = useState("0.0.0");
	const [mode, setModeState] = useState<UpdateMode>("notify");
	const [checking, setChecking] = useState(false);
	const [availableVersion, setAvailableVersion] = useState<string | null>(
		null,
	);
	const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
	const [downloaded, setDownloaded] = useState(false);
	const [progress, setProgress] = useState<UpdateProgress | null>(null);
	const [downloading, setDownloading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	// Load the packaged app version
	useEffect(() => {
		getVersion()
			.then((v) => {
				if (mountedRef.current) setCurrentVersion(v);
			})
			.catch(() => {
				// leave default 0.0.0
			});
	}, []);

	// Auto-check on startup with throttle
	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout>;

		async function startup() {
			let savedMode: UpdateMode = "notify";
			let lastCheck = 0;

			try {
				const store = await load("settings.json");
				const storedMode = await store.get<UpdateMode>("updateMode");
				if (storedMode) savedMode = storedMode;
				const storedLastCheck =
					await store.get<number>("updateLastCheck");
				if (storedLastCheck) lastCheck = storedLastCheck;
			} catch {
				// ignore
			}

			if (mountedRef.current) setModeState(savedMode);

			const elapsed = Date.now() - lastCheck;
			if (elapsed < CHECK_INTERVAL_MS) return;

			// 5-second startup grace period to reduce contention
			timeoutId = setTimeout(() => {
				if (mountedRef.current) {
					performCheck(savedMode === "background");
				}
			}, 5000);
		}

		startup();
		return () => clearTimeout(timeoutId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function persistLastCheck(): Promise<void> {
		try {
			const store = await load("settings.json");
			await store.set("updateLastCheck", Date.now());
			await store.save();
		} catch {
			// ignore
		}
	}

	async function performCheck(autoDownload: boolean): Promise<void> {
		if (!mountedRef.current) return;
		setChecking(true);
		setError(null);

		try {
			const update = await updaterApi.checkForUpdate();
			if (!mountedRef.current) return;

			if (update) {
				setAvailableVersion(update.version ?? null);
				setReleaseNotes(update.body ?? null);
				if (autoDownload) {
					await doDownload();
				}
			} else {
				setAvailableVersion(null);
				setReleaseNotes(null);
			}

			await persistLastCheck();
		} catch (err) {
			if (mountedRef.current) {
				setError(err instanceof Error ? err.message : String(err));
			}
		} finally {
			if (mountedRef.current) setChecking(false);
		}
	}

	async function doDownload(): Promise<void> {
		if (!mountedRef.current) return;
		setDownloading(true);
		setProgress(null);
		setError(null);

		try {
			await updaterApi.downloadAndInstall((prog) => {
				if (mountedRef.current) setProgress(prog);
			});
			if (mountedRef.current) {
				setDownloaded(true);
				setDownloading(false);
			}
		} catch (err) {
			if (mountedRef.current) {
				setError(err instanceof Error ? err.message : String(err));
				setDownloading(false);
			}
		}
	}

	const checkNow = async () => {
		await performCheck(mode === "background");
	};

	const downloadUpdate = async () => {
		if (!availableVersion || downloading || downloaded) return;
		await doDownload();
	};

	const installAndRestart = async () => {
		try {
			await relaunch();
		} catch (err) {
			if (mountedRef.current) {
				setError(err instanceof Error ? err.message : String(err));
			}
		}
	};

	const setMode = async (nextMode: UpdateMode) => {
		setModeState(nextMode);
		try {
			const store = await load("settings.json");
			await store.set("updateMode", nextMode);
			await store.save();
		} catch {
			// ignore
		}
	};

	const dismissError = () => setError(null);

	return (
		<UpdateContext.Provider
			value={{
				currentVersion,
				mode,
				setMode,
				checking,
				availableVersion,
				releaseNotes,
				downloaded,
				progress,
				downloading,
				error,
				checkNow,
				downloadUpdate,
				installAndRestart,
				dismissError,
			}}
		>
			{children}
		</UpdateContext.Provider>
	);
}

export function useUpdate(): UpdateContextValue {
	const ctx = useContext(UpdateContext);
	if (!ctx) throw new Error("useUpdate must be used within UpdateProvider");
	return ctx;
}
