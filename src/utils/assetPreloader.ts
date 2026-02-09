import { Asset } from 'expo-asset';
import { Image } from 'react-native';

// Global flag to prevent duplicate preloading
let isPreloading = false;
let isPreloaded = false;
let preloadPromise: Promise<void> | null = null;

// Cache for preloaded assets
const assetCache = new Set<number>();

/**
 * Comprehensive asset preloader for all game images and GIFs
 * Uses both expo-asset and React Native Image.prefetch for faster loading
 * Runs only ONCE per app session for maximum performance
 */
export const preloadGameAssets = async () => {
  // Return immediately if already preloaded
  if (isPreloaded) {
    console.log('✅ Assets already preloaded - using cache');
    return;
  }
  
  // Return existing promise if currently preloading
  if (isPreloading && preloadPromise) {
    console.log('⏳ Preloading in progress - waiting...');
    return preloadPromise;
  }
  
  // Start new preload
  isPreloading = true;
  
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
      require('../../app/game3/BathGame/BathBG.png'),
      require('../../app/game3/BathGame/Bath1.png'),
      require('../../app/game3/BathGame/Bath2.gif'),
      require('../../app/game3/BathGame/Bath3.gif'),
      require('../../app/game3/BathGame/Bath4.gif'),
      require('../../app/game3/BathGame/Bath5.gif'),
      require('../../app/game3/BathGame/Bubbles.png'),
      require('../../app/game3/BathGame/Shampoo.png'),
      require('../../app/game3/BathGame/Soap.png'),
      require('../../app/game3/BathGame/Towel.png'),
      
      // School Game assets
      require('../../app/game4/SchoolGame/SchoolBG.png'),
      require('../../app/game4/SchoolGame/School1.png'),
      require('../../app/game4/SchoolGame/School2.gif'),
      require('../../app/game4/SchoolGame/School3.gif'),
      require('../../app/game4/SchoolGame/School4.gif'),
      require('../../app/game4/SchoolGame/School5.gif'),
      require('../../app/game4/SchoolGame/Bag.png'),
      require('../../app/game4/SchoolGame/Book.png'),
      require('../../app/game4/SchoolGame/Pencil.png'),
      require('../../app/game4/SchoolGame/Uniform.png'),
      
      // Common GIFs used in history/progress
      require('../../assets/gifs/brushStep1.gif'),
      require('../../assets/gifs/brushStep2.gif'),
      require('../../assets/gifs/brushStep3.gif'),
      require('../../assets/gifs/brushStep4.gif'),
      require('../../assets/gifs/eatStep1.gif'),
      require('../../assets/gifs/eatStep2.gif'),
      require('../../assets/gifs/eatStep3.gif'),
      require('../../assets/gifs/eatStep4.gif'),
      require('../../assets/gifs/bathStep1.gif'),
      require('../../assets/gifs/bathStep2.gif'),
      require('../../assets/gifs/bathStep3.gif'),
      require('../../assets/gifs/bathStep4.gif'),
      require('../../assets/gifs/schoolStep1.gif'),
      require('../../assets/gifs/schoolStep2.gif'),
      require('../../assets/gifs/schoolStep3.gif'),
      require('../../assets/gifs/schoolStep4.gif'),
      require('../../assets/gifs/media-unscreen.gif'),
      require('../../assets/gifs/media-1--unscreen.gif'),
      require('../../assets/gifs/fallingstars.gif'),
    ];
    
    // Filter out already cached assets
    const assetsToLoad = gameAssets.filter(asset => {
      const assetId = typeof asset === 'number' ? asset : asset.default;
      return !assetCache.has(assetId);
    });
    
    if (assetsToLoad.length === 0) {
      console.log('✅ All assets already cached');
      return;
    }
    
    console.log(`📦 Preloading ${assetsToLoad.length} new assets...`);
    
    // Use expo-asset for aggressive caching
    await Asset.loadAsync(assetsToLoad);
    
    // Also use Image.prefetch for immediate availability
    const prefetchPromises = assetsToLoad.map(async (asset) => {
      try {
        const assetInfo = Asset.fromModule(asset);
        await assetInfo.downloadAsync();
        
        // Prefetch using React Native Image for instant loading
        if (assetInfo.localUri || assetInfo.uri) {
          await Image.prefetch(assetInfo.localUri || assetInfo.uri);
        }
        
        // Mark as cached
        const assetId = typeof asset === 'number' ? asset : asset.default;
        assetCache.add(assetId);
      } catch (error) {
        console.log('⚠️ Failed to prefetch asset:', error);
      }
    });
    
    await Promise.all(prefetchPromises);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    isPreloaded = true;
    isPreloading = false;
    
    console.log(`✅ ALL assets preloaded in ${duration}s - cached permanently!`);
  } catch (error) {
    console.log('❌ Asset preload error:', error);
    isPreloading = false;
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
    
    if (assetInfo.localUri || assetInfo.uri) {
      await Image.prefetch(assetInfo.localUri || assetInfo.uri);
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
  console.log('🗑️ Asset cache cleared');
};
