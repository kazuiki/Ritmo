import type { ImageSourcePropType } from "react-native";

const GIF_CDN_BASE_URL = "https://vdrxkkluuxwwozyznexp.supabase.co/storage/v1/object/public/ritmo/gifs";

export function getGifUrl(fileName: string): string {
  return `${GIF_CDN_BASE_URL}/${fileName}`;
}

export function getGifSource(fileName: string): ImageSourcePropType {
  return { uri: getGifUrl(fileName) };
}
