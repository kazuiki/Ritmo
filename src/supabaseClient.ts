// src/supabaseClient.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://vdrxkkluuxwwozyznexp.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcnhra2x1dXh3d296eXpuZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDk1MDUsImV4cCI6MjA3NzA4NTUwNX0.zIRMMu1VYV_lnwKsOuTUeDcvSDswR-KUa19PDEKA9nw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    detectSessionInUrl: true,
    autoRefreshToken: true,
    persistSession: true,
    storage: AsyncStorage, // Uses AsyncStorage for persistence
  },
});

// Service to manage manual logout state
export const LogoutService = {
  async setManualLogout(value: boolean) {
    try {
      if (value) {
        await AsyncStorage.setItem('manual_logout', 'true');
      } else {
        await AsyncStorage.removeItem('manual_logout');
      }
    } catch (error) {
      console.error('Error setting manual logout flag:', error);
    }
  },

  async isManualLogout(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem('manual_logout');
      return value === 'true';
    } catch (error) {
      console.error('Error checking manual logout flag:', error);
      return false;
    }
  },

  async clearManualLogout() {
    try {
      await AsyncStorage.removeItem('manual_logout');
    } catch (error) {
      console.error('Error clearing manual logout flag:', error);
    }
  },
};
