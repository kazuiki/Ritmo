import AsyncStorage from "@react-native-async-storage/async-storage";
import { isOnline } from "./offline/networkService";
import { clearOnboardingJsonCache, readOnboardingCache, writeOnboardingCache } from "./offline/offlineData";
import { createPendingOperation, enqueueOperation } from "./offline/offlineQueue";
import { supabase } from "./supabaseClient";

/**
 * Onboarding Service
 * Offline-first onboarding preferences with JSON cache + sync queue.
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

const CACHE_KEY_PREFIX = "@ritmo_onboarding_cache_";
const NETWORK_TIMEOUT_MS = 4500;
const CACHED_FALLBACK_TIMEOUT_MS = 1200;

function getRequestTimeoutMs(hasCachedData: boolean): number {
  return hasCachedData ? CACHED_FALLBACK_TIMEOUT_MS : NETWORK_TIMEOUT_MS;
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error("Network request timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function buildDefaultPreferences(userId: string): OnboardingPreferences {
  return {
    user_id: userId,
    main_tour_completed: false,
    parental_lock_completed: false,
    add_routine_completed: false,
    add_routine_modal_completed: false,
    routine_preset_completed: false,
    progress_completed: false,
    updated_at: new Date().toISOString(),
  };
}

async function initializeUserPreferences(userId: string): Promise<OnboardingPreferences> {
  const defaults = buildDefaultPreferences(userId);
  const { data, error } = await supabase
    .from("user_onboarding_preferences")
    .insert(defaults)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as OnboardingPreferences;
}

async function writeAllCaches(userId: string, prefs: OnboardingPreferences): Promise<void> {
  await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${userId}`, JSON.stringify(prefs));
  await writeOnboardingCache(userId, prefs);
}

async function readCachedPreferences(userId: string): Promise<OnboardingPreferences | null> {
  const fileCache = await readOnboardingCache(userId);
  if (fileCache) return fileCache;

  const raw = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OnboardingPreferences;
  } catch {
    return null;
  }
}

export async function getCachedOnboardingPreferences(userId: string): Promise<OnboardingPreferences | null> {
  return readCachedPreferences(userId);
}

async function fetchOnboardingPreferencesFromRemote(
  userId: string,
  cached: OnboardingPreferences | null
): Promise<OnboardingPreferences | null> {
  const { data, error } = await withTimeout(
    supabase
      .from("user_onboarding_preferences")
      .select("*")
      .eq("user_id", userId)
      .single(),
    getRequestTimeoutMs(Boolean(cached))
  );

  if (error) {
    if (error.code === "PGRST116") {
      const initialized = await initializeUserPreferences(userId);
      await writeAllCaches(userId, initialized);
      return initialized;
    }
    throw error;
  }

  const prefs = data as OnboardingPreferences;
  await writeAllCaches(userId, prefs);
  return prefs;
}

export async function refreshOnboardingPreferencesInBackground(userId: string): Promise<void> {
  if (!isOnline()) return;

  try {
    const cached = await readCachedPreferences(userId);
    await fetchOnboardingPreferencesFromRemote(userId, cached);
  } catch {
    // Best-effort background refresh.
  }
}

export async function getOnboardingPreferences(userId: string): Promise<OnboardingPreferences | null> {
  const cached = await readCachedPreferences(userId);

  if (cached) {
    // Return immediately from local cache for instant UI checks.
    if (isOnline()) {
      void refreshOnboardingPreferencesInBackground(userId);
    }
    return cached;
  }

  if (isOnline()) {
    try {
      return await fetchOnboardingPreferencesFromRemote(userId, cached);
    } catch {
      return cached;
    }
  }

  if (cached) return cached;

  const defaults = buildDefaultPreferences(userId);
  await writeAllCaches(userId, defaults);
  return defaults;
}

export async function updateOnboardingStatus(
  userId: string,
  field: keyof Omit<OnboardingPreferences, "user_id" | "created_at" | "updated_at">,
  completed: boolean
): Promise<boolean> {
  try {
    const current = (await getOnboardingPreferences(userId)) ?? buildDefaultPreferences(userId);
    const updatedAt = new Date().toISOString();
    const localNext: OnboardingPreferences = {
      ...current,
      [field]: completed,
      updated_at: updatedAt,
    };

    await writeAllCaches(userId, localNext);

    if (isOnline()) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("user_onboarding_preferences")
            .update({ [field]: completed, updated_at: updatedAt })
            .eq("user_id", userId)
            .select("*")
            .single(),
          NETWORK_TIMEOUT_MS
        );

        if (error) throw error;
        await writeAllCaches(userId, data as OnboardingPreferences);
        return true;
      } catch {
        // Request failed; queue for synchronization.
      }
    }

    await enqueueOperation(
      createPendingOperation({
        entity: "onboarding",
        action: "upsert",
        userId,
        recordId: userId,
        payload: {
          [field]: completed,
        },
        clientUpdatedAt: updatedAt,
      })
    );

    return true;
  } catch (error) {
    console.error(`Error in updateOnboardingStatus for ${field}:`, error);
    return false;
  }
}

export async function resetAllOnboardingPreferences(userId: string): Promise<boolean> {
  try {
    const resetPayload = {
      main_tour_completed: false,
      parental_lock_completed: false,
      add_routine_completed: false,
      add_routine_modal_completed: false,
      routine_preset_completed: false,
      progress_completed: false,
    };

    const localCurrent = (await getOnboardingPreferences(userId)) ?? buildDefaultPreferences(userId);
    const localReset: OnboardingPreferences = {
      ...localCurrent,
      ...resetPayload,
      updated_at: new Date().toISOString(),
    };

    await writeAllCaches(userId, localReset);

    if (isOnline()) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("user_onboarding_preferences")
            .update(resetPayload)
            .eq("user_id", userId)
            .select("*")
            .single(),
          NETWORK_TIMEOUT_MS
        );

        if (error) throw error;
        await writeAllCaches(userId, data as OnboardingPreferences);
        return true;
      } catch {
        // Request failed; queue for synchronization.
      }
    }

    await enqueueOperation(
      createPendingOperation({
        entity: "onboarding",
        action: "upsert",
        userId,
        recordId: userId,
        payload: resetPayload,
        clientUpdatedAt: localReset.updated_at ?? new Date().toISOString(),
      })
    );

    return true;
  } catch (error) {
    console.error("Error in resetAllOnboardingPreferences:", error);
    return false;
  }
}

export async function clearOnboardingCache(userId?: string): Promise<void> {
  try {
    if (userId) {
      await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
      await clearOnboardingJsonCache(userId);
      return;
    }

    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    if (onboardingKeys.length > 0) {
      await AsyncStorage.multiRemove(onboardingKeys);
    }
  } catch (error) {
    console.error("Error clearing onboarding cache:", error);
  }
}
