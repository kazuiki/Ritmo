import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'mediaTimeLimit';
const START_TIME_KEY = 'mediaStartTime';
const REMAINING_TIME_KEY = 'mediaRemainingTime';

export interface MediaTimeLimit {
  hours: number;
  minutes: number;
  totalSeconds: number;
  isActive: boolean;
  startTime: number | null;
  remainingSeconds: number | null;
  sessionActive?: boolean;
  sessionLastUpdatedAt?: number | null;
}

const isNetworkError = (error: unknown) => {
  if (!error) return false;
  const message = (error as any)?.message;
  const errorName = (error as any)?.name;
  return (
    (typeof message === 'string' && message.includes('Network request failed')) ||
    (typeof message === 'string' && message.includes('fetch failed')) ||
    errorName === 'AuthRetryableFetchError' ||
    errorName === 'TypeError'
  );
};

export const MediaTimeLimitService = {
  // Set time limit for media page (called by parent)
  async setTimeLimit(hours: number, minutes: number): Promise<void> {
    try {
      const totalSeconds = (hours * 3600) + (minutes * 60);
      const startTime = Date.now();
      
      const timeLimit: MediaTimeLimit = {
        hours,
        minutes,
        totalSeconds,
        isActive: true,
        startTime,
        remainingSeconds: totalSeconds,
        sessionActive: false,
        sessionLastUpdatedAt: null,
      };

      // Save to AsyncStorage first (primary storage)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timeLimit));
      console.log('✅ Media time limit saved to AsyncStorage:', timeLimit);

      // Also save to Supabase user metadata for backup
      try {
        const { error } = await supabase.auth.updateUser({
          data: { 
            media_time_limit: timeLimit 
          }
        });
        if (error && !isNetworkError(error)) {
          console.warn('⚠️ Error saving time limit to Supabase (continuing with AsyncStorage):', error);
        } else if (!error) {
          console.log('✅ Media time limit synced to Supabase');
        }
      } catch (err) {
        if (!isNetworkError(err)) {
          console.warn('⚠️ Error saving time limit to Supabase (continuing with AsyncStorage):', err);
        }
      }
    } catch (error) {
      console.error('❌ Error setting time limit:', error);
      throw error;
    }
  },

  // Start a "media session" countdown (called when child enters media page)
  async startSession(): Promise<void> {
    try {
      const timeLimit = await this.getTimeLimit();
      if (!timeLimit || !timeLimit.isActive) return;

      timeLimit.sessionActive = true;
      timeLimit.sessionLastUpdatedAt = Date.now();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timeLimit));
    } catch (error) {
      console.error('❌ Error starting media session:', error);
    }
  },

  // Stop a "media session" countdown
  async endSession(): Promise<void> {
    try {
      const timeLimit = await this.getTimeLimit();
      if (!timeLimit) return;

      timeLimit.sessionActive = false;
      timeLimit.sessionLastUpdatedAt = null;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timeLimit));
    } catch (error) {
      console.error('❌ Error ending media session:', error);
    }
  },

  // Apply elapsed wall-clock time to remainingSeconds while session is active.
  // This prevents bypass by backgrounding/switching apps.
  async applyElapsedTime(): Promise<MediaTimeLimit | null> {
    try {
      const timeLimit = await this.getTimeLimit();
      if (!timeLimit || !timeLimit.isActive) {
        return timeLimit;
      }

      if (!timeLimit.sessionActive) {
        // If session isn't active, just keep remaining as-is.
        return timeLimit;
      }

      const now = Date.now();
      const last = timeLimit.sessionLastUpdatedAt || now;
      const elapsedSeconds = Math.floor((now - last) / 1000);

      if (elapsedSeconds <= 0) {
        return timeLimit;
      }

      const currentRemaining = timeLimit.remainingSeconds || 0;
      const newRemaining = Math.max(0, currentRemaining - elapsedSeconds);
      timeLimit.remainingSeconds = newRemaining;
      timeLimit.sessionLastUpdatedAt = now;

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timeLimit));

      if (newRemaining <= 0) {
        await this.lockMedia();
      }

      return timeLimit;
    } catch (error) {
      console.error('❌ Error applying elapsed media time:', error);
      return null;
    }
  },

  // Get current time limit settings
  async getTimeLimit(): Promise<MediaTimeLimit | null> {
    try {
      // Always check AsyncStorage first (primary storage)
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const timeLimit = JSON.parse(stored);
        console.log('📱 Media time limit loaded from AsyncStorage:', timeLimit);
        return timeLimit;
      }

      // Try to get from Supabase if not in local storage (fallback)
      console.log('🔍 Checking Supabase for media time limit...');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.media_time_limit) {
          const timeLimit = user.user_metadata.media_time_limit as MediaTimeLimit;
          // Save locally for faster access next time
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timeLimit));
          console.log('☁️ Media time limit loaded from Supabase and cached locally:', timeLimit);
          return timeLimit;
        }
      } catch (err) {
        if (!isNetworkError(err)) {
          console.warn('⚠️ Error fetching time limit from Supabase:', err);
        }
      }

      console.log('ℹ️ No media time limit set');
      return null;
    } catch (error) {
      console.error('❌ Error getting time limit:', error);
      return null;
    }
  },

  // Check if media is currently locked
  async isMediaLocked(): Promise<boolean> {
    try {
      const timeLimit = await this.getTimeLimit();
      if (!timeLimit) {
        return false;
      }

      // If not active, it means it was already locked
      if (!timeLimit.isActive) {
        return true;
      }

      // If active, check if remaining time has expired
      const remaining = timeLimit.remainingSeconds || 0;
      const isExpired = remaining <= 0;
      
      // If expired, lock it now
      if (isExpired) {
        await this.lockMedia();
      }
      
      return isExpired;
    } catch (error) {
      console.error('Error checking lock status:', error);
      return false;
    }
  },

  // Get remaining time in seconds
  async getRemainingTime(): Promise<number> {
    try {
      const timeLimit = await this.getTimeLimit();
      if (!timeLimit || !timeLimit.isActive) {
        return 0;
      }

      // Return stored remainingSeconds instead of calculating from startTime
      return Math.max(0, timeLimit.remainingSeconds || 0);
    } catch (error) {
      console.error('Error getting remaining time:', error);
      return 0;
    }
  },

  // Decrement remaining time by 1 second (called every second when on media page)
  async decrementTime(): Promise<void> {
    try {
      const timeLimit = await this.getTimeLimit();
      if (!timeLimit || !timeLimit.isActive) {
        return;
      }

      const newRemaining = Math.max(0, (timeLimit.remainingSeconds || 0) - 1);
      timeLimit.remainingSeconds = newRemaining;

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timeLimit));

      // Log every 60 seconds to track timer progress
      if (newRemaining % 60 === 0) {
        console.log(`⏱️ Media timer: ${Math.floor(newRemaining / 60)} minutes remaining`);
      }

      // If time has run out, lock the media
      if (newRemaining <= 0) {
        console.log('🔒 Media time expired, locking media');
        await this.lockMedia();
      }
    } catch (error) {
      console.error('❌ Error decrementing time:', error);
    }
  },

  // Clear time limit (deactivate)
  async clearTimeLimit(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      
      // Also clear from Supabase
      try {
        const { error } = await supabase.auth.updateUser({
          data: { 
            media_time_limit: null 
          }
        });
        if (error && !isNetworkError(error)) {
          console.warn('Error clearing time limit from Supabase:', error);
        }
      } catch (err) {
        if (!isNetworkError(err)) {
          console.warn('Error clearing time limit from Supabase:', err);
        }
      }
    } catch (error) {
      console.error('Error clearing time limit:', error);
    }
  },

  // Update remaining time (for tracking when app is in background)
  async updateRemainingTime(remainingSeconds: number): Promise<void> {
    try {
      const timeLimit = await this.getTimeLimit();
      if (timeLimit) {
        timeLimit.remainingSeconds = remainingSeconds;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timeLimit));
      }
    } catch (error) {
      console.error('Error updating remaining time:', error);
    }
  },

  // Mark media as locked (time expired)
  async lockMedia(): Promise<void> {
    try {
      const timeLimit = await this.getTimeLimit();
      if (timeLimit) {
        timeLimit.isActive = false;
        timeLimit.remainingSeconds = 0;
        timeLimit.sessionActive = false;
        timeLimit.sessionLastUpdatedAt = null;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timeLimit));
        
        // Also save to Supabase
        try {
          const { error } = await supabase.auth.updateUser({
            data: { 
              media_time_limit: timeLimit 
            }
          });
          if (error && !isNetworkError(error)) {
            console.warn('Error saving locked state to Supabase:', error);
          }
        } catch (err) {
          if (!isNetworkError(err)) {
            console.warn('Error saving locked state to Supabase:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error locking media:', error);
    }
  },
};
