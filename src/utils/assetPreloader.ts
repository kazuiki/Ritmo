import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';
import { getGifUrl, setLocalGifUri } from '../../constants/gifSources';

// Global flag to prevent duplicate preloading
let isPreloading = false;
let isPreloaded = false;
let preloadPromise: Promise<void> | null = null;

const REMOTE_GIF_FILES = [
  'fix_the_bed.gif',
  'hair_care_time.gif',
  'hand_blessing.gif',
  'play_with_friends.gif',
  'sweep_the_floor.gif',
  'bedStep1.gif',
  'bedStep2.gif',
  'bedStep3.gif',
  'bedStep4.gif',
  'hairStep1.gif',
  'hairStep2.gif',
  'hairStep3.gif',
  'hairStep4.gif',
  'manoStep1.gif',
  'manoStep2.gif',
  'manoStep3.gif',
  'manoStep4.gif',
  'playStep1.gif',
  'playStep2.gif',
  'playStep3.gif',
  'playStep4.gif',
  'sweepStep1.gif',
  'sweepStep2.gif',
  'sweepStep3.gif',
  'sweepStep4.gif',
];
const LOCAL_GIF_CACHE_DIR = `${FileSystem.documentDirectory ?? ''}gif-cache`;

// Cache for preloaded remote asset URLs
const assetCache = new Set<string>();
const ASSET_PROGRESS_STORAGE_KEY = '@ritmo_asset_preload_progress_v1';

export type AssetPreloadProgress = {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
  isPreloaded: boolean;
  percent: number;
};

let preloadProgress: AssetPreloadProgress = {
  total: 0,
  completed: 0,
  failed: 0,
  inProgress: false,
  isPreloaded: false,
  percent: 0,
};

let hasHydratedPersistedProgress = false;

const progressListeners = new Set<(progress: AssetPreloadProgress) => void>();

const IMAGE_URI_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

const shouldImagePrefetch = (uri: string): boolean => {
  const normalized = uri.toLowerCase();
  return IMAGE_URI_EXTENSIONS.some((ext) => normalized.includes(ext));
};

function emitProgress() {
  const snapshot = { ...preloadProgress };
  progressListeners.forEach((cb) => cb(snapshot));
}

async function persistProgressSnapshot() {
  try {
    await AsyncStorage.setItem(ASSET_PROGRESS_STORAGE_KEY, JSON.stringify(preloadProgress));
  } catch {
    // Best-effort telemetry persistence.
  }
}

function updateProgress(next: Partial<AssetPreloadProgress>) {
  preloadProgress = {
    ...preloadProgress,
    ...next,
  };
  emitProgress();
  void persistProgressSnapshot();
}

export const initializeAssetPreloadProgress = async () => {
  if (hasHydratedPersistedProgress) return;

  try {
    const raw = await AsyncStorage.getItem(ASSET_PROGRESS_STORAGE_KEY);
    if (!raw) {
      hasHydratedPersistedProgress = true;
      return;
    }

    const parsed = JSON.parse(raw) as Partial<AssetPreloadProgress>;
    preloadProgress = {
      ...preloadProgress,
      ...parsed,
      inProgress: false,
    };
    hasHydratedPersistedProgress = true;
    emitProgress();
  } catch {
    hasHydratedPersistedProgress = true;
  }
};

export const getAssetPreloadProgress = (): AssetPreloadProgress => ({
  ...preloadProgress,
});

export const subscribeAssetPreloadProgress = (
  cb: (progress: AssetPreloadProgress) => void
): (() => void) => {
  progressListeners.add(cb);
  cb(getAssetPreloadProgress());
  return () => {
    progressListeners.delete(cb);
  };
};

/**
 * Comprehensive asset preloader for remote GIF content.
 * Uses React Native Image.prefetch for faster first render.
 * Runs only ONCE per app session for maximum performance
 */
export const preloadGameAssets = async () => {
  if (!hasHydratedPersistedProgress) {
    await initializeAssetPreloadProgress();
  }

  // Return immediately if already preloaded
  if (isPreloaded) {
    console.log('✅ Assets already preloaded - using cache');
    updateProgress({
      total: assetCache.size,
      completed: assetCache.size,
      failed: 0,
      inProgress: false,
      isPreloaded: true,
      percent: 100,
    });
    return;
  }
  
  // Return existing promise if currently preloading
  if (isPreloading && preloadPromise) {
    console.log('⏳ Preloading in progress - waiting...');
    return preloadPromise;
  }
  
  // Start new preload
  isPreloading = true;
  updateProgress({ inProgress: true, isPreloaded: false });
  
  preloadPromise = (async () => {
    try {
      console.log('🚀 Starting ONE-TIME asset preload...');
      const startTime = Date.now();

      if (FileSystem.documentDirectory) {
        await FileSystem.makeDirectoryAsync(LOCAL_GIF_CACHE_DIR, { intermediates: true });
      }
    
    const assetsToLoad = REMOTE_GIF_FILES
      .map((fileName) => ({
        fileName,
        assetUrl: getGifUrl(fileName),
      }))
      .filter(({ assetUrl }) => !assetCache.has(assetUrl));
    
    if (assetsToLoad.length === 0) {
      console.log('✅ All assets already cached');
      isPreloaded = true;
      isPreloading = false;
      updateProgress({
        total: assetCache.size,
        completed: assetCache.size,
        failed: 0,
        inProgress: false,
        isPreloaded: true,
        percent: 100,
      });
      return;
    }
    
    console.log(`📦 Preloading ${assetsToLoad.length} new assets...`);
    let completedCount = 0;
    let failedCount = 0;
    let verifiedCount = 0;
    updateProgress({
      total: assetsToLoad.length,
      completed: 0,
      failed: 0,
      inProgress: true,
      isPreloaded: false,
      percent: 0,
    });
    
    const prefetchPromises = assetsToLoad.map(async ({ assetUrl, fileName: gifFileName }) => {
      const localPath = gifFileName ? `${LOCAL_GIF_CACHE_DIR}/${gifFileName}` : '';

      try {
        if (localPath && FileSystem.documentDirectory) {
          const localInfo = await FileSystem.getInfoAsync(localPath);
          if (localInfo.exists && (localInfo.size ?? 0) > 0) {
            setLocalGifUri(gifFileName, localPath);
            assetCache.add(assetUrl);
            verifiedCount += 1;
            return;
          }

          const downloadTask = FileSystem.createDownloadResumable(assetUrl, localPath, {}, undefined);
          const result = await downloadTask.downloadAsync();
          if (!result || result.status < 200 || result.status >= 300) {
            throw new Error(`GIF download failed with status ${result?.status ?? 'unknown'}`);
          }
          setLocalGifUri(gifFileName, localPath);
          assetCache.add(assetUrl);
          verifiedCount += 1;
          return;
        }

        if (shouldImagePrefetch(assetUrl)) {
          const prefetched = await Image.prefetch(assetUrl);
          if (!prefetched) {
            throw new Error('Image.prefetch returned false');
          }
          assetCache.add(assetUrl);
          verifiedCount += 1;
          return;
        }
      } catch (error) {
        failedCount += 1;
        console.log('⚠️ Failed to prefetch asset:', error);
      } finally {
        completedCount += 1;
        const percent = Math.min(100, Math.round((verifiedCount / assetsToLoad.length) * 100));
        updateProgress({
          total: assetsToLoad.length,
          completed: verifiedCount,
          failed: failedCount,
          inProgress: true,
          isPreloaded: false,
          percent,
        });
      }
    });
    
    await Promise.all(prefetchPromises);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    isPreloaded = failedCount === 0 && verifiedCount === assetsToLoad.length;
    isPreloading = false;
    updateProgress({
      total: assetsToLoad.length,
      completed: verifiedCount,
      failed: failedCount,
      inProgress: false,
      isPreloaded,
      percent: Math.min(100, Math.round((verifiedCount / assetsToLoad.length) * 100)),
    });
    
    console.log(`✅ ALL assets preloaded in ${duration}s - cached permanently!`);
  } catch (error) {
    console.log('❌ Asset preload error:', error);
    isPreloading = false;
    updateProgress({ inProgress: false, isPreloaded: false });
    // Don't throw - allow app to continue even if preload fails
  }
  })();
  
  return preloadPromise;
};

/**
 * Check if an asset is already cached
 */
export const isAssetCached = (asset: any): boolean => {
  if (typeof asset === 'string') return assetCache.has(asset);
  const uri = asset?.uri;
  if (typeof uri === 'string') return assetCache.has(uri);
  return false;
};

/**
 * Preload a single asset (for on-demand loading)
 */
export const preloadSingleAsset = async (asset: any) => {
  try {
    const uri = typeof asset === 'string' ? asset : asset?.uri;
    if (!uri || typeof uri !== 'string') return;

    if (assetCache.has(uri)) {
      return;
    }

    if (shouldImagePrefetch(uri)) {
      const prefetched = await Image.prefetch(uri);
      if (!prefetched) {
        throw new Error('Image.prefetch returned false');
      }
    }

    assetCache.add(uri);
  } catch (error) {
    console.log('⚠️ Failed to preload single asset:', error);
  }
};

/**
 * Clear asset cache (useful for debugging or memory management)
 */
export const clearAssetCache = () => {
  assetCache.clear();
  isPreloaded = false;
  hasHydratedPersistedProgress = true;
  updateProgress({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false,
    isPreloaded: false,
    percent: 0,
  });
  console.log('🗑️ Asset cache cleared');
};
