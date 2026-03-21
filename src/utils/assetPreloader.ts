import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { Image, Platform } from 'react-native';

// Global flag to prevent duplicate preloading
let isPreloading = false;
let isPreloaded = false;
let preloadPromise: Promise<void> | null = null;

// Cache for preloaded assets
const assetCache = new Set<number>();
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
 * Comprehensive asset preloader for all game images and GIFs
 * Uses both expo-asset and React Native Image.prefetch for faster loading
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
    
    // Define all game assets to preload
    const gameAssets = [
      // Brush Game assets
      require('../../app/game1/BrushGame/Brush1.png'),
      require('../../app/game1/BrushGame/Brush2.png'),
      require('../../app/game1/BrushGame/Brush3.png'),
      require('../../app/game1/BrushGame/Brush4.png'),
      require('../../app/game1/BrushGame/Brush5.png'),
      require('../../app/game1/BrushGame/Brush6.gif'),
      require('../../app/game1/BrushGame/Brush7.gif'),
      require('../../app/game1/BrushGame/Brush8.gif'),
      require('../../app/game1/BrushGame/Brush9.gif'),
      require('../../app/game1/BrushGame/BrushBG.png'),
      require('../../app/game1/BrushGame/Cup.png'),
      require('../../app/game1/BrushGame/Paste.png'),
      require('../../app/game1/BrushGame/Tartar1.png'),
      require('../../app/game1/BrushGame/Tartar2.png'),
      require('../../app/game1/BrushGame/Tartar3.png'),
      require('../../app/game1/BrushGame/Tartar4.png'),
      require('../../app/game1/BrushGame/Tartar5.png'),
      require('../../app/game1/BrushGame/Tartar6.png'),
      require('../../app/game1/BrushGame/Tartar7.png'),
      require('../../app/game1/BrushGame/Tartar8.png'),
      require('../../app/game1/BrushGame/Tartar9.png'),
      require('../../app/game1/BrushGame/Tartar10.png'),
      require('../../app/game1/BrushGame/Tartar11.png'),
      require('../../app/game1/BrushGame/Tartar12.png'),

      // Eating Game assets
      require('../../app/game2/EatGame/EatBG.png'),
      require('../../app/game2/EatGame/Eat1.png'),
      require('../../app/game2/EatGame/Eat2.png'),
      require('../../app/game2/EatGame/Eat3.gif'),
      require('../../app/game2/EatGame/Eat4.gif'),
      require('../../app/game2/EatGame/Higop.gif'),
      require('../../app/game2/EatGame/Plate.png'),
      require('../../app/game2/EatGame/Rice.png'),
      require('../../app/game2/EatGame/Chicken.png'),
      require('../../app/game2/EatGame/Vegi.png'),
      require('../../app/game2/EatGame/Water.png'),
      require('../../app/game2/EatGame/Water1.png'),

      // Bath Game assets
      require('../../app/game3/BathGame/Bath1.png'),
      require('../../app/game3/BathGame/Bath2_anim.gif'),
      require('../../app/game3/BathGame/Bath2.png'),
      require('../../app/game3/BathGame/Bath3.png'),
      require('../../app/game3/BathGame/Bath4.png'),
      require('../../app/game3/BathGame/Bath5_anim.gif'),
      require('../../app/game3/BathGame/Bath5.png'),
      require('../../app/game3/BathGame/Soap.png'),
      require('../../app/game3/BathGame/Towel.png'),

      // School Game assets
      require('../../app/game4/SchoolGame/SchoolBG.png'),
      require('../../app/game4/SchoolGame/School1.png'),
      require('../../app/game4/SchoolGame/School2.png'),
      require('../../app/game4/SchoolGame/School3.png'),
      require('../../app/game4/SchoolGame/School4.png'),
      require('../../app/game4/SchoolGame/School5.png'),
      require('../../app/game4/SchoolGame/School6.gif'),
      require('../../app/game4/SchoolGame/School7.gif'),
      require('../../app/game4/SchoolGame/Bag.png'),

      // New routine preset GIFs
      require('../../assets/gifs/fix_the_bed.gif'),
      require('../../assets/gifs/hair_care_time.gif'),
      require('../../assets/gifs/hand_blessing.gif'),
      require('../../assets/gifs/play_with_friends.gif'),
      require('../../assets/gifs/sweep_the_floor.gif'),

      // New routine guide step GIFs - Fix the Bed
      require('../../assets/gifs/bedStep1.gif'),
      require('../../assets/gifs/bedStep2.gif'),
      require('../../assets/gifs/bedStep3.gif'),
      require('../../assets/gifs/bedStep4.gif'),

      // New routine guide step GIFs - Hair Care Time
      require('../../assets/gifs/hairStep1.gif'),
      require('../../assets/gifs/hairStep2.gif'),
      require('../../assets/gifs/hairStep3.gif'),
      require('../../assets/gifs/hairStep4.gif'),

      // New routine guide step GIFs - Hand Blessing
      require('../../assets/gifs/manoStep1.gif'),
      require('../../assets/gifs/manoStep2.gif'),
      require('../../assets/gifs/manoStep3.gif'),
      require('../../assets/gifs/manoStep4.gif'),

      // New routine guide step GIFs - Play with Friends
      require('../../assets/gifs/playStep1.gif'),
      require('../../assets/gifs/playStep2.gif'),
      require('../../assets/gifs/playStep3.gif'),
      require('../../assets/gifs/playStep4.gif'),

      // New routine guide step GIFs - Sweep the Floor
      require('../../assets/gifs/sweepStep1.gif'),
      require('../../assets/gifs/sweepStep2.gif'),
      require('../../assets/gifs/sweepStep3.gif'),
      require('../../assets/gifs/sweepStep4.gif'),
    ];
    
    // Filter out already cached assets
    const assetsToLoad = gameAssets.filter((asset) => {
      const assetId = typeof asset === 'number' ? asset : asset.default;
      return !assetCache.has(assetId);
    });
    
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
    
    // Use expo-asset for aggressive caching
    await Asset.loadAsync(assetsToLoad);
    
    // Also use Image.prefetch for immediate availability
    const prefetchPromises = assetsToLoad.map(async (asset) => {
      try {
        const assetInfo = Asset.fromModule(asset);
        await assetInfo.downloadAsync();

        // Strict verification: on native, localUri must exist to count as ready offline.
        const isVerifiedLocal = Platform.OS === 'web'
          ? Boolean(assetInfo.localUri || assetInfo.uri)
          : Boolean(assetInfo.localUri);
        if (!isVerifiedLocal) {
          throw new Error('Asset verification failed: local file not available');
        }
        
        // Prefetch only image URIs for instant rendering; skip audio/video URIs.
        const resolvedUri = assetInfo.localUri || assetInfo.uri;
        if (resolvedUri && shouldImagePrefetch(resolvedUri)) {
          await Image.prefetch(resolvedUri);
        }
        
        // Mark as cached
        const assetId = typeof asset === 'number' ? asset : asset.default;
        assetCache.add(assetId);
        verifiedCount += 1;
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
  const assetId = typeof asset === 'number' ? asset : asset.default;
  return assetCache.has(assetId);
};

/**
 * Preload a single asset (for on-demand loading)
 */
export const preloadSingleAsset = async (asset: any) => {
  try {
    const assetId = typeof asset === 'number' ? asset : asset.default;
    
    if (assetCache.has(assetId)) {
      return; // Already cached
    }
    
    await Asset.loadAsync([asset]);
    const assetInfo = Asset.fromModule(asset);
    await assetInfo.downloadAsync();
    
    const resolvedUri = assetInfo.localUri || assetInfo.uri;
    if (resolvedUri && shouldImagePrefetch(resolvedUri)) {
      await Image.prefetch(resolvedUri);
    }
    
    assetCache.add(assetId);
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
