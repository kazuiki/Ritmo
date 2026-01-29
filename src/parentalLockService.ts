import { supabase } from './supabaseClient';

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
        return false;
      }
      // Check if parental_lock_enabled is set to true in user metadata
      return user.user_metadata?.parental_lock_enabled === true;
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error('Error checking parental lock status:', error);
      }
      return false;
    }
  },

  // Set parental lock status
  async setEnabled(enabled: boolean): Promise<void> {
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
        return null;
      }
      return user.user_metadata?.parental_pin || null;
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error('Error getting saved PIN:', error);
      }
      return null;
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