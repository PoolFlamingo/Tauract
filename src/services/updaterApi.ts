import { check, type Update } from "@tauri-apps/plugin-updater";

export interface UpdateProgress {
	contentLength: number;
	downloaded: number;
}

let currentUpdate: Update | null = null;

/**
 * Checks the remote endpoint for an available update.
 * Caches the Update object internally for a subsequent downloadAndInstall call.
 */
export async function checkForUpdate(): Promise<Update | null> {
	currentUpdate = await check();
	return currentUpdate;
}

/**
 * Downloads and installs the previously cached update, streaming progress events.
 * Must be called after a successful checkForUpdate().
 */
export async function downloadAndInstall(
	onProgress: (progress: UpdateProgress) => void,
): Promise<void> {
	if (!currentUpdate) throw new Error("No update available");

	let downloaded = 0;
	let contentLength = 0;

	await currentUpdate.downloadAndInstall((event) => {
		switch (event.event) {
			case "Started":
				contentLength = event.data.contentLength ?? 0;
				downloaded = 0;
				onProgress({ contentLength, downloaded });
				break;
			case "Progress":
				downloaded += event.data.chunkLength;
				onProgress({ contentLength, downloaded });
				break;
			case "Finished":
				onProgress({ contentLength, downloaded: contentLength });
				break;
		}
	});
}

/** Clears the cached update reference. */
export function clearUpdate(): void {
	currentUpdate = null;
}
