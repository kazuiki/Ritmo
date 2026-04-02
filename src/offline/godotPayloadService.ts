import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { isNetworkConnected } from "../utils/networkUtils";

export type GodotGameKey = "brush" | "eat" | "bath" | "school" | "makehair";

export type GodotPayloadFile = {
	name: string;
	url: string;
	minBytes: number;
	compressed?: boolean; // true if file is gzip-compressed before download
};

export type GodotPayloadManifest = {
	version: string;
	files: GodotPayloadFile[];
};

export type PayloadDownloadProgress = {
	game: GodotGameKey;
	fileName: string;
	completedBytes: number;
	totalBytes: number;
	percent: number;
};

// Update this base URL when switching environments (dev/staging/prod CDN).
const CDN_BASE_URL = "https://vdrxkkluuxwwozyznexp.supabase.co/storage/v1/object/public/ritmo";

function buildGameUrl(game: GodotGameKey, fileName: string): string {
	return `${CDN_BASE_URL}/${game}/${fileName}`;
}

// Larger files like full_main.pck are already highly compressed internally, so not worth re-compressing.
// Smaller metadata files (project.binary, assets.sparsepck) compress well with gzip (~60% reduction).
export const GODOT_PAYLOAD_MANIFESTS: Record<GodotGameKey, GodotPayloadManifest> = {
	brush: {
		version: "v4-hotfix-no-read", // force clean re-download after removing readAsStringAsync validation
		files: [
			{ name: "full_main.pck", url: buildGameUrl("brush", "full_main.pck"), minBytes: 1024, compressed: false },
			{ name: "project.binary", url: buildGameUrl("brush", "project.binary"), minBytes: 512, compressed: false },
			{ name: "assets.sparsepck", url: buildGameUrl("brush", "assets.sparsepck"), minBytes: 512, compressed: false },
		],
	},
	eat: {
		version: "v4-hotfix-no-read",
		files: [
			{ name: "full_main.pck", url: buildGameUrl("eat", "full_main.pck"), minBytes: 1024, compressed: false },
			{ name: "project.binary", url: buildGameUrl("eat", "project.binary"), minBytes: 512, compressed: false },
			{ name: "assets.sparsepck", url: buildGameUrl("eat", "assets.sparsepck"), minBytes: 512, compressed: false },
		],
	},
	bath: {
		version: "v4-hotfix-no-read",
		files: [
			{ name: "full_main.pck", url: buildGameUrl("bath", "full_main.pck"), minBytes: 1024, compressed: false },
			{ name: "project.binary", url: buildGameUrl("bath", "project.binary"), minBytes: 512, compressed: false },
			{ name: "assets.sparsepck", url: buildGameUrl("bath", "assets.sparsepck"), minBytes: 512, compressed: false },
		],
	},
	school: {
		version: "v4-hotfix-no-read",
		files: [
			{ name: "project.binary", url: buildGameUrl("school", "project.binary"), minBytes: 512, compressed: false },
			{ name: "assets.sparsepck", url: buildGameUrl("school", "assets.sparsepck"), minBytes: 512, compressed: false },
		],
	},
	makehair: {
		version: "v4-hotfix-no-read",
		files: [
			{ name: "full_main.pck", url: buildGameUrl("makehair", "full_main.pck"), minBytes: 1024, compressed: false },
			{ name: "project.binary", url: buildGameUrl("makehair", "project.binary"), minBytes: 512, compressed: false },
			{ name: "assets.sparsepck", url: buildGameUrl("makehair", "assets.sparsepck"), minBytes: 512, compressed: false },
		],
	},
};

const ROOT = `${FileSystem.documentDirectory ?? ""}godot-payloads`;
const DOWNLOAD_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 1500;
const PAYLOAD_PIPELINE_VERSION = "payload-v4.1-no-read";

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function isRetryableDownloadError(error: unknown): boolean {
	const message = String((error as any)?.message ?? error ?? "").toLowerCase();
	
	// Do NOT retry OutOfMemoryError - it's a device resource issue, not network
	if (message.includes("outofmemoryerror") || message.includes("out of memory") || message.includes("oom")) {
		return false;
	}
	
	return (
		message.includes("network request failed") ||
		message.includes("unable to resolve host") ||
		message.includes("timed out") ||
		message.includes("timeout") ||
		message.includes("connection reset") ||
		message.includes("econnreset") ||
		message.includes("etimedout") ||
		message.includes("socket") ||
		message.includes("interrupted") ||
		message.includes("cancelled") ||
		message.includes("canceled")
	);
}

async function ensureNetworkAvailableOrThrow(context: string): Promise<void> {
	const connected = await isNetworkConnected();
	if (!connected) {
		throw new Error(`No internet connection while downloading ${context}`);
	}
}

async function downloadFileWithRetries(
	game: GodotGameKey,
	file: GodotPayloadFile,
	destination: string,
	onProgress?: (progress: PayloadDownloadProgress) => void
): Promise<void> {
	let lastError: unknown = null;

	for (let attempt = 1; attempt <= DOWNLOAD_RETRY_ATTEMPTS; attempt += 1) {
		try {
			await ensureNetworkAvailableOrThrow(`${game}/${file.name}`);

			if (attempt > 1) {
				await FileSystem.deleteAsync(destination, { idempotent: true });
			}

			const downloadTask = FileSystem.createDownloadResumable(
				file.url,
				destination,
				{},
				(update) => {
					const totalBytes = update.totalBytesExpectedToWrite ?? 0;
					const completedBytes = update.totalBytesWritten ?? 0;
					const percent = totalBytes > 0 ? Math.round((completedBytes / totalBytes) * 100) : 0;
					onProgress?.({
						game,
						fileName: file.name,
						completedBytes,
						totalBytes,
						percent,
					});
				}
			);

			const result = await downloadTask.downloadAsync();
			if (!result?.uri) {
				throw new Error(`Download returned no file URI for ${game}/${file.name}`);
			}

			const statusCode = Number((result as any)?.status ?? 0);
			if (!Number.isNaN(statusCode) && statusCode > 0 && statusCode >= 400) {
				throw new Error(`Download returned HTTP ${statusCode} for ${game}/${file.name}`);
			}

			return;
		} catch (error) {
			lastError = error;
			const canRetry = attempt < DOWNLOAD_RETRY_ATTEMPTS && isRetryableDownloadError(error);
			if (!canRetry) {
				break;
			}

			await sleep(RETRY_BACKOFF_MS * attempt);
		}
	}

	throw new Error(
		`[${PAYLOAD_PIPELINE_VERSION}] Download failed for ${game}/${file.name} after ${DOWNLOAD_RETRY_ATTEMPTS} attempts: ${String(
			(lastError as any)?.message ?? lastError ?? "Unknown error"
		)}`
	);
}

function ensureNativeRuntime(): void {
	if (Platform.OS === "web" || !FileSystem.documentDirectory) {
		throw new Error("Godot payload download is only supported on native platforms.");
	}
}

function getGameDir(game: GodotGameKey): string {
	return `${ROOT}/${game}`;
}

function getVersionMarkerPath(game: GodotGameKey): string {
	return `${getGameDir(game)}/.version`;
}

function getFilePath(game: GodotGameKey, fileName: string): string {
	return `${getGameDir(game)}/${fileName}`;
}

function getEffectiveMinBytes(file: GodotPayloadFile): number {
	const strictMinByName: Record<string, number> = {
		"full_main.pck": 64 * 1024,
		// Some games have intentionally small metadata payloads.
		"assets.sparsepck": 4 * 1024,
		"project.binary": 512,
	};

	const strictMin = strictMinByName[file.name] ?? 0;
	return Math.max(file.minBytes, strictMin);
}

async function ensureFileDoesNotLookLikeErrorPayload(filePath: string, fileName: string): Promise<void> {
	// Content sniffing via readAsStringAsync caused OOM/runtime failures on low-RAM devices.
	// Download status code + size validation are used instead.
	void filePath;
	void fileName;
}

async function ensureDir(path: string): Promise<void> {
	const info = await FileSystem.getInfoAsync(path);
	if (!info.exists) {
		await FileSystem.makeDirectoryAsync(path, { intermediates: true });
	}
}

async function writeVersionMarker(game: GodotGameKey, version: string): Promise<void> {
	await FileSystem.writeAsStringAsync(getVersionMarkerPath(game), version);
}

async function readVersionMarker(game: GodotGameKey): Promise<string | null> {
	const markerPath = getVersionMarkerPath(game);
	const info = await FileSystem.getInfoAsync(markerPath);
	if (!info.exists) return null;
	try {
		return await FileSystem.readAsStringAsync(markerPath);
	} catch {
		return null;
	}
}

async function hasValidFile(game: GodotGameKey, file: GodotPayloadFile): Promise<boolean> {
	const filePath = getFilePath(game, file.name);
	const info = await FileSystem.getInfoAsync(filePath);
	if (!(info.exists && typeof info.size === "number" && info.size >= getEffectiveMinBytes(file))) {
		return false;
	}

	try {
		await ensureFileDoesNotLookLikeErrorPayload(filePath, file.name);
		return true;
	} catch {
		return false;
	}
}

/**
 * Decompresses a gzip file in-place WITHOUT causing OOM.
 * Updated: Skip decompression entirely to avoid memory spikes.
 * Files should be stored uncompressed on CDN to prevent OOM on low-RAM devices.
 */
async function decompressGzipFile(filePath: string): Promise<void> {
	// For now, skip decompression to avoid OOM on low-RAM devices.
	// Files on CDN should already be stored in final format.
	// If files ARE compressed, they will need manual decompression offline.
	return;
}

export async function isGodotPayloadReady(game: GodotGameKey): Promise<boolean> {
	ensureNativeRuntime();

	const manifest = GODOT_PAYLOAD_MANIFESTS[game];
	const markerVersion = await readVersionMarker(game);
	if (markerVersion !== manifest.version) return false;

	for (const file of manifest.files) {
		const ok = await hasValidFile(game, file);
		if (!ok) return false;
	}

	return true;
}

export async function clearGodotPayload(game: GodotGameKey): Promise<void> {
	ensureNativeRuntime();
	await FileSystem.deleteAsync(getGameDir(game), { idempotent: true });
}

export async function ensureGodotPayloadDownloaded(
	game: GodotGameKey,
	onProgress?: (progress: PayloadDownloadProgress) => void
): Promise<void> {
	ensureNativeRuntime();

	const manifest = GODOT_PAYLOAD_MANIFESTS[game];
	const alreadyReady = await isGodotPayloadReady(game);
	if (alreadyReady) return;

	const gameDir = getGameDir(game);
	await ensureDir(gameDir);

	for (const file of manifest.files) {
		const destination = getFilePath(game, file.name);
		const existingOk = await hasValidFile(game, file);
		if (existingOk) continue;

		await FileSystem.deleteAsync(destination, { idempotent: true });

		await downloadFileWithRetries(game, file, destination, onProgress);

		// Decompress if file is gzip-compressed
		if (file.compressed) {
			try {
				onProgress?.({
					game,
					fileName: `${file.name} (decompressing)`,
					completedBytes: 0,
					totalBytes: 100,
					percent: 0,
				});
				
				await decompressGzipFile(destination);
				
				onProgress?.({
					game,
					fileName: `${file.name} (decompressing)`,
					completedBytes: 100,
					totalBytes: 100,
					percent: 100,
				});
			} catch (decompressError) {
				await FileSystem.deleteAsync(destination, { idempotent: true });
				throw decompressError;
			}
		}

		await ensureFileDoesNotLookLikeErrorPayload(destination, file.name);

		const downloadedOk = await hasValidFile(game, file);
		if (!downloadedOk) {
			await FileSystem.deleteAsync(destination, { idempotent: true });
			throw new Error(`[${PAYLOAD_PIPELINE_VERSION}] Downloaded file is invalid for ${game}/${file.name}`);
		}
	}

	await writeVersionMarker(game, manifest.version);
}

export function getGodotPayloadDir(game: GodotGameKey): string {
	ensureNativeRuntime();
	return getGameDir(game);
}

