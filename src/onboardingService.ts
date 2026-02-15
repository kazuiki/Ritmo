import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

/**
 * Onboarding Service
 * Manages onboarding completion status synced across devices via Supabase
 * Uses AsyncStorage as a local cache for performance
 */

export interface OnboardingPreferences {
  user_id: string;
  main_tour_completed: boolean;
  parental_lock_completed: boolean;
  add_routine_completed: boolean;
  add_routine_modal_completed: boolean;
  routine_preset_completed: boolean;
  progress_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

// AsyncStorage cache keys
const CACHE_KEY_PREFIX = '@ritmo_onboarding_cache_';

/**
 * Initialize onboarding preferences for a user in the database
 */
async function initializeUserPreferences(userId: string): Promise<OnboardingPreferences> {
  const { data, error } = await supabase
    .from('user_onboarding_preferences')
    .insert({
      user_id: userId,
      main_tour_completed: false,
      parental_lock_completed: false,
      add_routine_completed: false,
      add_routine_modal_completed: false,
      routine_preset_completed: false,
      progress_completed: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error initializing user preferences:', error);
    throw error;
  }

  return data;
}

/**
 * Get onboarding preferences from database, with AsyncStorage cache
 */
export async function getOnboardingPreferences(userId: string): Promise<OnboardingPreferences | null> {
  try {
    // First, try to get from cache
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    
    // Always fetch from database to ensure sync across devices
    const { data, error } = await supabase
      .from('user_onboarding_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found - initialize new preferences
        console.log('📝 No preferences found, initializing for user:', userId);
        const newPrefs = await initializeUserPreferences(userId);
        // Cache the new preferences
        await AsyncStorage.setItem(cacheKey, JSON.stringify(newPrefs));
        return newPrefs;
      }
      console.error('Error fetching onboarding preferences:', error);
      
      // Fallback to cache if database fails
      if (cached) {
        console.log('⚠️ Database error, using cached preferences');
        return JSON.parse(cached);
      }
      
      return null;
    }

    // Update cache with fresh data
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('Error in getOnboardingPreferences:', error);
    return null;
  }
}

/**
 * Update a specific onboarding completion status
 */
export async function updateOnboardingStatus(
  userId: string,
  field: keyof Omit<OnboardingPreferences, 'user_id' | 'created_at' | 'updated_at'>,
  completed: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_onboarding_preferences')
      .update({ [field]: completed })
      .eq('user_id', userId);

    if (error) {
      console.error(`Error updating ${field}:`, error);
      return false;
    }

    // Update cache
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    const current = await getOnboardingPreferences(userId);
    if (current) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(current));
    }

    console.log(`✅ Updated ${field} to ${completed} for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error in updateOnboardingStatus for ${field}:`, error);
    return false;
  }
}

/**
 * Reset all onboarding preferences (for testing/debugging)
 */
export async function resetAllOnboardingPreferences(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_onboarding_preferences')
      .update({
        main_tour_completed: false,
        parental_lock_completed: false,
        add_routine_completed: false,
        add_routine_modal_completed: false,
        routine_preset_completed: false,
        progress_completed: false,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error resetting onboarding preferences:', error);
      return false;
    }

    // Clear cache
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    await AsyncStorage.removeItem(cacheKey);

    console.log('🔄 Reset all onboarding preferences for user:', userId);
    return true;
  } catch (error) {
    console.error('Error in resetAllOnboardingPreferences:', error);
    return false;
  }
}

/**
 * Clear local cache (useful when switching users)
 */
export async function clearOnboardingCache(userId?: string): Promise<void> {
  try {
    if (userId) {
      const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
      await AsyncStorage.removeItem(cacheKey);
    } else {
      // Clear all onboarding caches
      const keys = await AsyncStorage.getAllKeys();
      const onboardingKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
      if (onboardingKeys.length > 0) {
        await AsyncStorage.multiRemove(onboardingKeys);
      }
    }
  } catch (error) {
    console.error('Error clearing onboarding cache:', error);
  }
}
