import type { ImageSourcePropType } from "react-native";

const GIF_CDN_BASE_URL = "https://vdrxkkluuxwwozyznexp.supabase.co/storage/v1/object/public/ritmo/gifs";
const localGifUriByFileName: Record<string, string> = {};

function normalizeFileName(fileName: string): string {
  return String(fileName || "").trim().toLowerCase();
}

export function getGifUrl(fileName: string): string {
  return `${GIF_CDN_BASE_URL}/${fileName}`;
}

export function setLocalGifUri(fileName: string, uri: string): void {
  const key = normalizeFileName(fileName);
  if (!key || !uri) return;
  localGifUriByFileName[key] = uri;
}

export function clearLocalGifUri(fileName: string): void {
  const key = normalizeFileName(fileName);
  if (!key) return;
  delete localGifUriByFileName[key];
}

export function getBestGifUri(fileName: string): string {
  const key = normalizeFileName(fileName);
  const localUri = key ? localGifUriByFileName[key] : undefined;
  if (localUri) {
    return localUri;
  }
  return getGifUrl(fileName);
}

export function getGifSource(fileName: string): ImageSourcePropType {
  return { uri: getBestGifUri(fileName) };
}
