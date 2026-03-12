import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const ROOT_DIR = `${FileSystem.documentDirectory ?? ""}offline`;

function toStorageKey(relativePath: string): string {
  return `@offline_json_${relativePath.replace(/[\\/]/g, "_")}`;
}

async function ensureDirectoryForPath(path: string): Promise<void> {
  const dir = path.slice(0, path.lastIndexOf("/"));
  if (!dir) return;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

function getFullPath(relativePath: string): string {
  return `${ROOT_DIR}/${relativePath}`;
}

export async function readJsonFile<T>(relativePath: string, fallback: T): Promise<T> {
  if (Platform.OS === "web" || !FileSystem.documentDirectory) {
    const raw = await AsyncStorage.getItem(toStorageKey(relativePath));
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  const fullPath = getFullPath(relativePath);
  const info = await FileSystem.getInfoAsync(fullPath);
  if (!info.exists) return fallback;

  try {
    const raw = await FileSystem.readAsStringAsync(fullPath);
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile<T>(relativePath: string, data: T): Promise<void> {
  if (Platform.OS === "web" || !FileSystem.documentDirectory) {
    await AsyncStorage.setItem(toStorageKey(relativePath), JSON.stringify(data));
    return;
  }

  const fullPath = getFullPath(relativePath);
  await ensureDirectoryForPath(fullPath);

  const tmpPath = `${fullPath}.tmp`;
  await FileSystem.writeAsStringAsync(tmpPath, JSON.stringify(data, null, 2));

  const existing = await FileSystem.getInfoAsync(fullPath);
  if (existing.exists) {
    await FileSystem.deleteAsync(fullPath, { idempotent: true });
  }
  await FileSystem.moveAsync({ from: tmpPath, to: fullPath });
}

export async function deleteJsonFile(relativePath: string): Promise<void> {
  if (Platform.OS === "web" || !FileSystem.documentDirectory) {
    await AsyncStorage.removeItem(toStorageKey(relativePath));
    return;
  }

  const fullPath = getFullPath(relativePath);
  await FileSystem.deleteAsync(fullPath, { idempotent: true });
}
