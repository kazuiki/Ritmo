import { supabase } from './supabaseClient';

export const ParentalLockService = {
  // Check if parental lock is enabled
  async isEnabled(): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('Error getting user:', error);
        return false;
      }
      // Check if parental_lock_enabled is set to true in user metadata
      return user.user_metadata?.parental_lock_enabled === true;
    } catch (error) {
      console.error('Error checking parental lock status:', error);
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
        console.error('Error setting parental lock status:', error);
      }
    } catch (error) {
      console.error('Error setting parental lock status:', error);
    }
  },

  // Save PIN to user metadata
  async savePin(pin: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { parental_pin: pin }
      });
      if (error) {
        console.error('Error saving PIN:', error);
      }
    } catch (error) {
      console.error('Error saving PIN:', error);
    }
  },

  // Get saved PIN from user metadata
  async getSavedPin(): Promise<string | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('Error getting user:', error);
        return null;
      }
      return user.user_metadata?.parental_pin || null;
    } catch (error) {
      console.error('Error getting saved PIN:', error);
      return null;
    }
  },

  // Verify PIN
  async verifyPin(inputPin: string): Promise<boolean> {
    try {
      const savedPin = await this.getSavedPin();
      return savedPin === inputPin;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  }
};