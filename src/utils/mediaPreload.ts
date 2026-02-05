import AsyncStorage from "@react-native-async-storage/async-storage";
import { KIDS_CATEGORIES } from "../constants/mediaCategories";
import { YouTubeKidsService, type YouTubeVideo } from "../youtubeKidsService";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cacheKeyForCategory = (categoryId: string) => `mediaCache:${categoryId}`;

const fetchCategoryVideos = async (category: { id: string; query: string; backupQuery: string; channelId: string | null; }): Promise<YouTubeVideo[]> => {
  // Fetch from all sources in parallel for speed
  const fetchPromises: Promise<YouTubeVideo[]>[] = [];

  // 1. Channel videos (if available)
  if (category.channelId) {
    fetchPromises.push(
      YouTubeKidsService.getVideosByChannel(category.channelId, 50, 150)
        .catch(() => [])
    );
  }

  // 2. Primary search
  fetchPromises.push(
    YouTubeKidsService.searchKidsVideos(category.query, 50, 150)
      .catch(() => [])
  );

  // 3. Backup search (if available)
  if (category.backupQuery) {
    fetchPromises.push(
      YouTubeKidsService.searchKidsVideos(category.backupQuery, 50, 150)
        .catch(() => [])
    );
  }

  // 4. Broad search (fallback)
  const broadSearch = category.query.split(" ")[0] + " kids";
  fetchPromises.push(
    YouTubeKidsService.searchKidsVideos(broadSearch, 50, 150)
      .catch(() => [])
  );

  // Wait for all fetches to complete
  const results = await Promise.all(fetchPromises);

  // Deduplicate videos across all sources
  const videoMap = new Map<string, YouTubeVideo>();
  results.forEach(videosArray => {
    videosArray.forEach(video => {
      if (!videoMap.has(video.id)) {
        videoMap.set(video.id, video);
      }
    });
  });

  const fetchedVideos = Array.from(videoMap.values());
  return fetchedVideos.slice(0, 150);
};

// Fast fetch - get first 50 videos quickly from primary search only
const fetchCategoryVideosFast = async (category: { id: string; query: string; backupQuery: string; channelId: string | null; }): Promise<YouTubeVideo[]> => {
  try {
    // Just fetch primary search - should complete in ~500ms
    const videos = await YouTubeKidsService.searchKidsVideos(category.query, 50, 50)
      .catch(() => []);
    return videos.slice(0, 50);
  } catch (err) {
    console.warn(`Fast fetch failed for ${category.id}:`, err);
    return [];
  }
};

const isCacheFresh = async (categoryId: string): Promise<boolean> => {
  const raw = await AsyncStorage.getItem(cacheKeyForCategory(categoryId));
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { savedAt: number; videos: YouTubeVideo[] };
    if (!parsed?.savedAt || !parsed?.videos) return false;
    return Date.now() - parsed.savedAt <= CACHE_TTL_MS;
  } catch {
    return false;
  }
};

export const preloadMediaCategories = async (): Promise<void> => {
  try {
    console.log("[mediaPreload] start");
    
    // Fast preload: get first 50 videos for default category (nursery) immediately
    const defaultCategory = KIDS_CATEGORIES.find(cat => cat.id === 'nursery');
    if (defaultCategory) {
      try {
        const fresh = await isCacheFresh('nursery');
        if (!fresh) {
          console.log("[mediaPreload] fast-loading nursery (50 videos)...");
          const fastVideos = await fetchCategoryVideosFast(defaultCategory);
          if (fastVideos.length > 0) {
            await AsyncStorage.setItem(
              cacheKeyForCategory('nursery'),
              JSON.stringify({ savedAt: Date.now(), videos: fastVideos })
            );
            console.log(`[mediaPreload] fast-saved nursery (${fastVideos.length} videos)`);
          }
        }
      } catch (err) {
        console.warn("[mediaPreload] fast preload failed:", err);
      }
    }

    // Background preload: fetch all categories with full 150 videos (non-blocking)
    const preloadPromises = KIDS_CATEGORIES.map(async (category) => {
      try {
        // For nursery, upgrade from 50 to full 150 in background
        // For others, do full 150 fetch
        console.log(`[mediaPreload] background fetching: ${category.id}`);
        const videos = await fetchCategoryVideos(category);
        
        // Cache immediately after fetch completes
        await AsyncStorage.setItem(
          cacheKeyForCategory(category.id),
          JSON.stringify({ savedAt: Date.now(), videos })
        );
        console.log(`[mediaPreload] background saved: ${category.id} (${videos.length})`);
      } catch (err) {
        console.warn(`[mediaPreload] background fetch failed for ${category.id}:`, err);
      }
    });

    // Fire all background fetches in parallel (non-blocking)
    Promise.all(preloadPromises).then(() => {
      console.log("[mediaPreload] background done");
    }).catch(err => {
      console.warn("Media preload batch error:", err);
    });
  } catch (err) {
    console.warn("Media preload failed:", err);
  }
};
