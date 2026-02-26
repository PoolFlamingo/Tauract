import { Command } from "@tauri-apps/plugin-shell";
import { appDataDir } from "@tauri-apps/api/path";

interface IpcRequest {
	id: string;
	method: string;
	params?: Record<string, unknown>;
}

interface IpcSuccessResponse {
	id: string;
	result: unknown;
}

interface IpcErrorResponse {
	id: string;
	error: string;
}

type IpcResponse = IpcSuccessResponse | IpcErrorResponse;

type PendingRequest = {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
};

/**
 * Manages the lifecycle and communication with the Bun sidecar process.
 * Uses JSON Lines protocol over stdin/stdout for IPC.
 *
 * Handles React StrictMode double-mount safely by serializing
 * init/destroy calls through a single promise chain.
 */
class SidecarService {
	private child: Awaited<ReturnType<Command<string>["spawn"]>> | null = null;
	private pending = new Map<string, PendingRequest>();
	private requestCounter = 0;
	private readyResolve: (() => void) | null = null;
	private initialized = false;
	private destroying = false;
	/** Serializes init/destroy to prevent overlapping lifecycle calls */
	private lifecycleChain: Promise<void> = Promise.resolve();

	/**
	 * Spawns the sidecar process and waits for it to be ready.
	 * Serialized: concurrent calls queue behind any pending init/destroy.
	 */
	async init(): Promise<void> {
		this.lifecycleChain = this.lifecycleChain
			.then(() => this.doInit())
			.catch(() => {
				/* swallow lifecycle errors so the chain stays healthy */
			});

		return this.lifecycleChain;
	}

	private async doInit(): Promise<void> {
		if (this.initialized && this.child) return;

		// If a destroy just ran, give the OS a tick to fully release the process
		if (this.destroying) {
			await new Promise((r) => setTimeout(r, 60));
		}

		const dataDir = await appDataDir();
		const dbPath = `${dataDir}todos.db`;

		const readyPromise = new Promise<void>((resolve) => {
			this.readyResolve = resolve;
		});

		const command = Command.sidecar("binaries/db-sidecar", [dbPath]);

		command.stdout.on("data", (line: string) => {
			this.handleStdout(line);
		});

		command.stderr.on("data", (line: string) => {
			console.debug("[sidecar:stderr]", line);
		});

		command.on("close", (data) => {
			if (this.destroying) {
				this.destroying = false;
				return;
			}
			console.error(
				"[sidecar] Process exited unexpectedly with code",
				data.code
			);
			this.child = null;
			this.initialized = false;

			for (const [id, { reject }] of this.pending) {
				reject(new Error("Sidecar process terminated unexpectedly"));
				this.pending.delete(id);
			}
		});

		command.on("error", (error) => {
			console.error("[sidecar] Process error:", error);
		});

		this.child = await command.spawn();
		this.initialized = true;

		await readyPromise;
		console.debug("[sidecar] Connected and ready.");
	}

	/**
	 * Handle a line from stdout: parse JSON and correlate to a pending request.
	 */
	private handleStdout(line: string): void {
		const trimmed = line.trim();
		if (!trimmed) return;

		try {
			const response: IpcResponse = JSON.parse(trimmed);

			if (response.id === "__ready__") {
				this.readyResolve?.();
				return;
			}

			const pending = this.pending.get(response.id);
			if (!pending) {
				console.warn(
				"[sidecar] Received response for unknown request:",
				response.id
				);
				return;
			}

			this.pending.delete(response.id);

			if ("error" in response) {
				pending.reject(new Error(response.error));
			} else {
				pending.resolve(response.result);
			}
		} catch {
			console.error("[sidecar] Failed to parse stdout:", trimmed);
		}
	}

	/**
	 * Send a request to the sidecar and wait for the correlated response.
	 */
	async request<T = unknown>(
		method: string,
		params?: Record<string, unknown>
	): Promise<T> {
		if (!this.child || !this.initialized) {
		await this.init();
		}

		const id = `req_${++this.requestCounter}_${Date.now()}`;

		const request: IpcRequest = { id, method };
		if (params) {
			request.params = params;
		}

		return new Promise<T>((resolve, reject) => {
			this.pending.set(id, {
				resolve: resolve as (value: unknown) => void,
				reject,
			});

			const message = JSON.stringify(request) + "\n";
			this.child!.write(message).catch((err: Error) => {
				this.pending.delete(id);
				reject(new Error(`Failed to write to sidecar: ${err.message}`));
			});

			setTimeout(() => {
				if (this.pending.has(id)) {
				this.pending.delete(id);
				reject(new Error(`Request ${method} timed out`));
				}
			}, 10000);
		});
	}

	/**
	 * Kill the sidecar process and clean up.
	 * Serialized: waits for any pending init to finish first.
	 */
	async destroy(): Promise<void> {
		this.lifecycleChain = this.lifecycleChain
			.then(() => this.doDestroy())
			.catch(() => {
				/* swallow lifecycle errors so the chain stays healthy */
			});
		
		return this.lifecycleChain;
	}

	private async doDestroy(): Promise<void> {
		if (!this.child) return;

		this.destroying = true;
		this.initialized = false;
		const childToKill = this.child;
		this.child = null;
		this.readyResolve = null;
		this.pending.clear();

		try {
			await childToKill.kill();
		} catch {
			// Process may have already exited
		}
		// Give the OS time to fully release the process handle
		await new Promise((r) => setTimeout(r, 50));
		this.destroying = false;
	}
}

// Singleton instance
export const sidecar = new SidecarService();
