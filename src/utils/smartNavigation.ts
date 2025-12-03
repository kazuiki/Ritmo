import { Router } from 'expo-router';
import { clearNetworkCache, isNetworkGood } from './networkUtils';

// Global navigation lock to prevent multiple simultaneous navigations
let navigationInProgress = false;

/**
 * Smart navigation function that checks network quality first
 * - Fast network: Navigate directly to destination
 * - Slow network: Navigate to loading page which will handle asset preloading
 */
export const navigateWithNetworkCheck = async (router: Router, destination: string) => {
  // Prevent concurrent navigation attempts
  if (navigationInProgress) {
    console.log('⚠️ Navigation already in progress, skipping...');
    return;
  }

  navigationInProgress = true;
  
  try {
    console.log('🌐 Checking network before navigation...');
    
    // Force fresh network check by clearing cache first
    clearNetworkCache();
    
    const hasGoodNetwork = await isNetworkGood();
    
    if (hasGoodNetwork) {
      console.log('⚡ Good network - navigating directly to:', destination);
      router.replace(destination as any);
    } else {
      console.log('🐌 Slow network - showing loading page first');
      router.replace(`/loading?next=${encodeURIComponent(destination)}` as any);
    }
  } catch (error) {
    console.error('Network check failed, defaulting to loading page:', error);
    // Clear cache on error and fallback to loading page
    clearNetworkCache();
    router.replace(`/loading?next=${encodeURIComponent(destination)}` as any);
  } finally {
    // Reset navigation lock after a delay
    setTimeout(() => {
      navigationInProgress = false;
    }, 2000);
  }
};

/**
 * Convenience function for navigating to greetings (most common case)
 */
export const navigateToGreetingsWithNetworkCheck = (router: Router) => {
  return navigateWithNetworkCheck(router, '/greetings');
};