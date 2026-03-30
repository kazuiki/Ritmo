import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

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
		version: "v2-compressed", // bumped version to force re-download on migration
		files: [
			{ name: "full_main.pck", url: buildGameUrl("brush", "full_main.pck"), minBytes: 1024, compressed: false },
			{ name: "project.binary", url: buildGameUrl("brush", "project.binary.gz"), minBytes: 512, compressed: true },
			{ name: "assets.sparsepck", url: buildGameUrl("brush", "assets.sparsepck.gz"), minBytes: 512, compressed: true },
		],
	},
	eat: {
		version: "v2-compressed",
		files: [
			{ name: "full_main.pck", url: buildGameUrl("eat", "full_main.pck"), minBytes: 1024, compressed: false },
			{ name: "project.binary", url: buildGameUrl("eat", "project.binary.gz"), minBytes: 512, compressed: true },
			{ name: "assets.sparsepck", url: buildGameUrl("eat", "assets.sparsepck.gz"), minBytes: 512, compressed: true },
		],
	},
	bath: {
		version: "v2-compressed",
		files: [
			{ name: "full_main.pck", url: buildGameUrl("bath", "full_main.pck"), minBytes: 1024, compressed: false },
			{ name: "project.binary", url: buildGameUrl("bath", "project.binary.gz"), minBytes: 512, compressed: true },
			{ name: "assets.sparsepck", url: buildGameUrl("bath", "assets.sparsepck.gz"), minBytes: 512, compressed: true },
		],
	},
	school: {
		version: "v2-compressed", // School game: default/root payload (no full_main.pck)
		files: [
			{ name: "project.binary", url: buildGameUrl("school", "project.binary.gz"), minBytes: 512, compressed: true },
			{ name: "assets.sparsepck", url: buildGameUrl("school", "assets.sparsepck.gz"), minBytes: 512, compressed: true },
		],
	},
	makehair: {
		version: "v2-compressed",
		files: [
			{ name: "full_main.pck", url: buildGameUrl("makehair", "full_main.pck"), minBytes: 1024, compressed: false },
			{ name: "project.binary", url: buildGameUrl("makehair", "project.binary.gz"), minBytes: 512, compressed: true },
			{ name: "assets.sparsepck", url: buildGameUrl("makehair", "assets.sparsepck.gz"), minBytes: 512, compressed: true },
		],
	},
};

const ROOT = `${FileSystem.documentDirectory ?? ""}godot-payloads`;

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
	return info.exists && typeof info.size === "number" && info.size >= file.minBytes;
}

/**
 * Decompresses a gzip file in-place.
 * Reads compressed file, decompresses using pako, and writes back.
 */
async function decompressGzipFile(filePath: string): Promise<void> {
	try {
		// Import pako dynamically to avoid issues if not available
		const pako = require("pako");
		
		// Read compressed file as base64
		const compressedData = await FileSystem.readAsStringAsync(filePath, {
			encoding: FileSystem.EncodingType.Base64,
		});
		
		// Convert base64 to Uint8Array
		const binaryString = Buffer.from(compressedData, "base64").toString("binary");
		const uint8Array = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			uint8Array[i] = binaryString.charCodeAt(i);
		}
		
		// Decompress
		const decompressed = pako.ungzip(uint8Array);
		
		// Convert decompressed Uint8Array back to base64 and write
		const decompressedBinary = String.fromCharCode.apply(null, Array.from(decompressed));
		const decompressedBase64 = Buffer.from(decompressedBinary, "binary").toString("base64");
		
		await FileSystem.writeAsStringAsync(filePath, decompressedBase64, {
			encoding: FileSystem.EncodingType.Base64,
		});
	} catch (error) {
		throw new Error(`Failed to decompress ${filePath}: ${error}`);
	}
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
			throw new Error(`Download failed for ${game}/${file.name}`);
		}

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

		const downloadedOk = await hasValidFile(game, file);
		if (!downloadedOk) {
			throw new Error(`Downloaded file is invalid for ${game}/${file.name}`);
		}
	}

	await writeVersionMarker(game, manifest.version);
}

export function getGodotPayloadDir(game: GodotGameKey): string {
	ensureNativeRuntime();
	return getGameDir(game);
}

