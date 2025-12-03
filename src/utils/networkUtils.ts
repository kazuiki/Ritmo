import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export interface NetworkQuality {
  isConnected: boolean;
  connectionType: string | null;
  isWeak: boolean;
  effectiveType?: string;
}

// Cache management for network state
let networkCache: { result: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 5000; // 5 seconds cache

/**
 * Clears the network quality cache
 */
export const clearNetworkCache = () => {
  networkCache = null;
  console.log('🗑️ Network cache cleared');
};

/**
 * Sets up network state listener to clear cache when network changes
 */
export const setupNetworkListener = () => {
  if (Platform.OS !== 'web') {
    const unsubscribe = NetInfo.addEventListener((state) => {
      console.log('📡 Network state changed:', state.isConnected, state.type);
      clearNetworkCache(); // Clear cache when network changes
    });
    
    return unsubscribe;
  }
  
  // For web, listen to online/offline events
  if (typeof window !== 'undefined') {
    const handleOnline = () => {
      console.log('📡 Network: back online');
      clearNetworkCache();
    };
    
    const handleOffline = () => {
      console.log('📡 Network: went offline');
      clearNetworkCache();
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
  
  return () => {}; // No-op for environments without network detection
};

/**
 * Checks the current network quality and determines if connection is weak
 * @returns Promise<NetworkQuality>
 */
export const checkNetworkQuality = async (): Promise<NetworkQuality> => {
  try {
    // For web platform, use browser APIs
    if (Platform.OS === 'web') {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const connection = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
      
      let isWeak = false;
      let effectiveType = 'unknown';
      
      if (connection) {
        effectiveType = connection.effectiveType || 'unknown';
        // Consider 'slow-2g' and '2g' as weak connections
        isWeak = effectiveType === 'slow-2g' || effectiveType === '2g';
      }
      
      return {
        isConnected: isOnline,
        connectionType: connection?.type || 'unknown',
        isWeak,
        effectiveType
      };
    }

    // For mobile platforms, use NetInfo
    const netInfoState: NetInfoState = await NetInfo.fetch();
    
    const isConnected = netInfoState.isConnected ?? false;
    const connectionType = netInfoState.type;
    
    // Consider connection weak if:
    // 1. Not connected
    // 2. Connection type is cellular with poor signal
    // 3. WiFi with poor signal (if available in details)
    let isWeak = false;
    
    if (!isConnected) {
      isWeak = true;
    } else if (connectionType === 'cellular') {
      // For cellular, check if we have details about connection strength
      const cellularDetails = netInfoState.details as any;
      if (cellularDetails) {
        // Check cellular generation (2G is considered weak)
        if (cellularDetails.cellularGeneration === '2g') {
          isWeak = true;
        }
        // Check signal strength if available
        if (cellularDetails.strength !== undefined && cellularDetails.strength < 2) {
          isWeak = true;
        }
      }
    } else if (connectionType === 'wifi') {
      // For WiFi, check signal strength if available
      const wifiDetails = netInfoState.details as any;
      if (wifiDetails && wifiDetails.strength !== undefined && wifiDetails.strength < 2) {
        isWeak = true;
      }
    }
    
    return {
      isConnected,
      connectionType,
      isWeak,
      effectiveType: (netInfoState.details as any)?.effectiveType
    };
  } catch (error) {
    console.error('Error checking network quality:', error);
    // Default to weak connection on error to be safe
    return {
      isConnected: false,
      connectionType: null,
      isWeak: true
    };
  }
};

/**
 * Performs a simple network speed test by downloading a small resource
 * @returns Promise<boolean> true if connection seems fast, false if slow
 */
export const performQuickSpeedTest = async (): Promise<boolean> => {
  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // Reduced to 2 second timeout
    
    // Use the most reliable endpoint first
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
        signal: controller.signal,
        cache: 'no-cache',
        method: 'GET'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return false;
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // More lenient timing - consider fast if download takes less than 2 seconds
      console.log(`🏃 Speed test completed in ${duration}ms`);
      return duration < 2000;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.log('Speed test failed:', fetchError);
      // If speed test fails but we have basic connectivity, assume it's good enough
      return true; // More optimistic - assume good if basic connectivity exists
    }
  } catch (error) {
    console.log('Speed test error:', error);
    return true; // Default to good if test fails
  }
};

/**
 * Checks if device has any network connectivity at all
 * @returns Promise<boolean> true if connected, false if completely offline
 */
export const isNetworkConnected = async (): Promise<boolean> => {
  try {
    // For web platform, use browser APIs
    if (Platform.OS === 'web') {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }

    // For mobile platforms, use NetInfo
    const netInfoState: NetInfoState = await NetInfo.fetch();
    return netInfoState.isConnected ?? false;
  } catch (error) {
    console.error('Error checking network connectivity:', error);
    return false; // Assume no connection on error
  }
};

/**
 * Comprehensive network quality check combining NetInfo and speed test
 * @returns Promise<boolean> true if network is good, false if weak
 */
export const isNetworkGood = async (): Promise<boolean> => {
  try {
    // Check cache first (only if recent)
    if (networkCache && (Date.now() - networkCache.timestamp) < CACHE_DURATION) {
      console.log('📋 Using cached network result:', networkCache.result);
      return networkCache.result;
    }
    
    console.log('🔍 Fresh network quality check...');
    const networkQuality = await checkNetworkQuality();
    
    // If basic connectivity check shows weak connection, cache and return false immediately
    if (!networkQuality.isConnected || networkQuality.isWeak) {
      const result = false;
      networkCache = { result, timestamp: Date.now() };
      console.log('❌ Network is weak/disconnected');
      return result;
    }
    
    // For good connections, be more optimistic about network quality
    let result: boolean = networkQuality.isConnected;
    
    if (networkQuality.isConnected && !networkQuality.isWeak) {
      // For WiFi, assume it's good (most WiFi connections are stable)
      if (networkQuality.connectionType === 'wifi') {
        result = true;
        console.log('📶 WiFi connection detected - assuming good quality');
      }
      // Only run speed test for unknown connections or web
      else if (networkQuality.connectionType === 'unknown' || Platform.OS === 'web') {
        result = await performQuickSpeedTest();
      } 
      // For cellular connections that are not marked as weak, trust the NetInfo assessment
      else {
        result = true;
        console.log('📱 Good cellular connection detected');
      }
    }
    
    // Cache the result
    networkCache = { result, timestamp: Date.now() };
    console.log('✅ Network quality check complete:', result);
    return result;
  } catch (error) {
    console.error('Network quality check failed:', error);
    // Clear cache on error and assume weak connection
    clearNetworkCache();
    return false;
  }
};