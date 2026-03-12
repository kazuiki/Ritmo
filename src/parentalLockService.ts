import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

const PARENTAL_LOCK_ENABLED_KEY = '@ritmo_parental_lock_enabled';
const PARENTAL_LOCK_PIN_KEY = '@ritmo_parental_lock_pin';

async function cacheEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PARENTAL_LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
}

async function getCachedEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(PARENTAL_LOCK_ENABLED_KEY);
  return value === 'true';
}

async function cachePin(pin: string): Promise<void> {
  await AsyncStorage.setItem(PARENTAL_LOCK_PIN_KEY, pin);
}

async function getCachedPin(): Promise<string | null> {
  return AsyncStorage.getItem(PARENTAL_LOCK_PIN_KEY);
}

const isAuthParseError = (error: unknown) => {
  if (!error) return false;
  const message = (error as any)?.message;
  const errorName = (error as any)?.name;
  return (
    (typeof message === 'string' && message.includes('JSON Parse error')) ||
    (typeof message === 'string' && message.includes('Auth session missing')) ||
    errorName === 'AuthSessionMissingError'
  );
};

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

export const ParentalLockService = {
  // Check if parental lock is enabled
  async isEnabled(): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        if (!isAuthParseError(error) && !isNetworkError(error)) {
          console.error('Error getting user:', error);
        }
        return getCachedEnabled();
      }
      // Check if parental_lock_enabled is set to true in user metadata
      const enabled = user.user_metadata?.parental_lock_enabled === true;
      await cacheEnabled(enabled);
      return enabled;
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error('Error checking parental lock status:', error);
      }
      return getCachedEnabled();
    }
  },

  // Set parental lock status
  async setEnabled(enabled: boolean): Promise<void> {
    await cacheEnabled(enabled);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { parental_lock_enabled: enabled }
      });
      if (error) {
        if (!isNetworkError(error)) {
          console.error('Error setting parental lock status:', error);
        }
      }
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error('Error setting parental lock status:', error);
      }
    }
  },

  // Save PIN to user metadata
  async savePin(pin: string): Promise<void> {
    await cachePin(pin);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { parental_pin: pin }
      });
      if (error) {
        if (!isNetworkError(error)) {
          console.error('Error saving PIN:', error);
        }
      }
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error('Error saving PIN:', error);
      }
    }
  },

  // Get saved PIN from user metadata
  async getSavedPin(): Promise<string | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        if (!isAuthParseError(error) && !isNetworkError(error)) {
          console.error('Error getting user:', error);
        }
        return getCachedPin();
      }
      const pin = user.user_metadata?.parental_pin || null;
      if (pin) {
        await cachePin(pin);
      }
      return pin;
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error('Error getting saved PIN:', error);
      }
      return getCachedPin();
    }
  },

  // Verify PIN
  async verifyPin(inputPin: string): Promise<boolean> {
    try {
      const savedPin = await this.getSavedPin();
      return savedPin === inputPin;
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error('Error verifying PIN:', error);
      }
      return false;
    }
  },

  // Check if PIN exists
  async hasPin(): Promise<boolean> {
    try {
      const savedPin = await this.getSavedPin();
      return savedPin !== null && savedPin !== '';
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error('Error checking PIN:', error);
      }
      return false;
    }
  }
};