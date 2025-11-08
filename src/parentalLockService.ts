import AsyncStorage from '@react-native-async-storage/async-storage';

const PARENTAL_LOCK_KEY = 'parental_lock_enabled';
const PARENTAL_PIN_KEY = 'parental_pin';

export const ParentalLockService = {
  // Check if parental lock is enabled
  async isEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(PARENTAL_LOCK_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error checking parental lock status:', error);
      return false;
    }
  },

  // Set parental lock status
  async setEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(PARENTAL_LOCK_KEY, enabled.toString());
    } catch (error) {
      console.error('Error setting parental lock status:', error);
    }
  },

  // Save PIN
  async savePin(pin: string): Promise<void> {
    try {
      await AsyncStorage.setItem(PARENTAL_PIN_KEY, pin);
    } catch (error) {
      console.error('Error saving PIN:', error);
    }
  },

  // Get saved PIN
  async getSavedPin(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PARENTAL_PIN_KEY);
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