import AsyncStorage from "@react-native-async-storage/async-storage";

const MEDIA_SEARCH_HISTORY_KEY = "mediaSearchHistory:v1";
const MAX_HISTORY_ITEMS = 50;

export type MediaSearchHistoryEntry = {
  query: string;
  searchedAt: string;
};

const normalizeQuery = (query: string): string =>
  query
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const sanitizeQuery = (query: string): string =>
  query.trim().replace(/\s+/g, " ");

export async function getMediaSearchHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(MEDIA_SEARCH_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed
      .map((item) => {
        if (typeof item === "string") {
          return {
            query: item,
            searchedAt: new Date(0).toISOString(),
          } satisfies MediaSearchHistoryEntry;
        }

        if (
          item &&
          typeof item === "object" &&
          typeof item.query === "string" &&
          typeof item.searchedAt === "string"
        ) {
          return {
            query: item.query,
            searchedAt: item.searchedAt,
          } satisfies MediaSearchHistoryEntry;
        }

        return null;
      })
      .filter((item): item is MediaSearchHistoryEntry => item !== null);

    return normalized.map((item) => item.query);
  } catch (error) {
    console.warn("Failed to read media search history:", error);
    return [];
  }
}

export async function getMediaSearchHistoryEntries(): Promise<MediaSearchHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(MEDIA_SEARCH_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (typeof item === "string") {
          return {
            query: item,
            searchedAt: new Date(0).toISOString(),
          } satisfies MediaSearchHistoryEntry;
        }

        if (
          item &&
          typeof item === "object" &&
          typeof item.query === "string" &&
          typeof item.searchedAt === "string"
        ) {
          return {
            query: item.query,
            searchedAt: item.searchedAt,
          } satisfies MediaSearchHistoryEntry;
        }

        return null;
      })
      .filter((item): item is MediaSearchHistoryEntry => item !== null);
  } catch (error) {
    console.warn("Failed to read media search history entries:", error);
    return [];
  }
}

export async function addMediaSearchHistory(query: string): Promise<void> {
  const cleaned = sanitizeQuery(query);
  if (!cleaned) return;

  try {
    const current = await getMediaSearchHistoryEntries();
    const normalizedCleaned = normalizeQuery(cleaned);

    const deduped = current.filter(
      (item) => normalizeQuery(item.query) !== normalizedCleaned
    );

    const next: MediaSearchHistoryEntry[] = [
      {
        query: cleaned,
        searchedAt: new Date().toISOString(),
      },
      ...deduped,
    ].slice(0, MAX_HISTORY_ITEMS);

    await AsyncStorage.setItem(MEDIA_SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Failed to save media search history:", error);
  }
}

export async function clearMediaSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MEDIA_SEARCH_HISTORY_KEY);
  } catch (error) {
    console.warn("Failed to clear media search history:", error);
  }
}
