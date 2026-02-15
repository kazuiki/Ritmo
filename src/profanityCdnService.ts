import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

type CachedProfanity = {
  savedAt: number;
  words: string[];
};

type ProfanityOptions = {
  forceRefresh?: boolean;
};

const CACHE_KEY = "profanityCdnCache:v1";
const DEFAULT_CACHE_HOURS = 24;

function getCdnUrl(): string | null {
  const fromExpo = Constants.expoConfig?.extra?.profanityCdnUrl;
  const fromEnv = process.env.EXPO_PUBLIC_PROFANITY_CDN_URL;
  const url = typeof fromExpo === "string" ? fromExpo.trim() : typeof fromEnv === "string" ? fromEnv.trim() : "";
  return url.length > 0 ? url : null;
}

function getCacheTtlMs(): number {
  const fromExpo = Constants.expoConfig?.extra?.profanityCdnCacheHours;
  const fromEnv = process.env.EXPO_PUBLIC_PROFANITY_CDN_CACHE_HOURS;
  const hours = Number(fromExpo ?? fromEnv);
  if (Number.isFinite(hours) && hours > 0) {
    return hours * 60 * 60 * 1000;
  }
  return DEFAULT_CACHE_HOURS * 60 * 60 * 1000;
}

function normalizeWords(words: string[]): string[] {
  return words
    .map(word => (typeof word === "string" ? word.toLowerCase().trim() : ""))
    .filter(Boolean);
}

function parseWordsPayload(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return normalizeWords(payload as string[]);
  }

  if (payload && typeof payload === "object") {
    const maybeWords = (payload as { words?: unknown }).words;
    if (Array.isArray(maybeWords)) {
      return normalizeWords(maybeWords as string[]);
    }
  }

  throw new Error("CDN payload is not a JSON array of words");
}

async function readCache(): Promise<CachedProfanity | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedProfanity;
    if (!parsed || !Array.isArray(parsed.words) || typeof parsed.savedAt !== "number") {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn("[ProfanityCDN] Failed to read cache:", err);
    return null;
  }
}

async function writeCache(words: string[]): Promise<void> {
  try {
    const payload: CachedProfanity = { savedAt: Date.now(), words };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[ProfanityCDN] Failed to write cache:", err);
  }
}

export async function getCdnProfanityWords(options: ProfanityOptions = {}): Promise<string[]> {
  const cdnUrl = getCdnUrl();
  const cacheTtlMs = getCacheTtlMs();
  const cached = await readCache();

  if (!cdnUrl) {
    console.warn("[ProfanityCDN] Missing CDN URL. Set extra.profanityCdnUrl or EXPO_PUBLIC_PROFANITY_CDN_URL.");
    return cached?.words ?? [];
  }

  if (!options.forceRefresh && cached) {
    const age = Date.now() - cached.savedAt;
    if (age <= cacheTtlMs) {
      return cached.words;
    }
  }

  try {
    const response = await fetch(cdnUrl);
    if (!response.ok) {
      throw new Error(`CDN request failed with status ${response.status}`);
    }
    const payload = await response.json();
    const words = parseWordsPayload(payload);
    await writeCache(words);
    return words;
  } catch (err) {
    console.warn("[ProfanityCDN] Failed to fetch CDN list:", err);
    return cached?.words ?? [];
  }
}
