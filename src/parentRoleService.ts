import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabaseClient";

const LOCAL_PARENT_HELP_NAME_KEY_LEGACY = "@ritmo_parent_help_name";
const LOCAL_PARENT_HELP_NAME_KEY_PREFIX = "@ritmo_parent_help_name:";
const METADATA_PARENT_HELP_NAME_KEY = "parent_help_name";

function getLocalKeyForUserId(userId: string): string {
  return `${LOCAL_PARENT_HELP_NAME_KEY_PREFIX}${userId}`;
}

function normalizeHelpName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Keep it short so UI won't overflow.
  return trimmed.slice(0, 24);
}

export async function refreshParentHelpNameFromCloud(): Promise<string | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const cloudHelpName = normalizeHelpName((user.user_metadata as any)?.[METADATA_PARENT_HELP_NAME_KEY]);
    if (!cloudHelpName) return null;

    await AsyncStorage.setItem(getLocalKeyForUserId(user.id), cloudHelpName);
    return cloudHelpName;
  } catch {
    return null;
  }
}

/**
 * Fetch preferred parent help name from local storage or Supabase.
 * Priority: Local storage → Supabase user metadata → null
 */
export async function getParentHelpName(): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const perUserKey = getLocalKeyForUserId(user.id);
    const localValue = await AsyncStorage.getItem(perUserKey);
    const localHelpName = normalizeHelpName(localValue);
    if (localHelpName) return localHelpName;

    // Do not fall back to legacy key unless the cloud metadata already has a value.
    // This prevents new accounts from inheriting previous users' local values.
    const cloudHelpName = normalizeHelpName((user.user_metadata as any)?.[METADATA_PARENT_HELP_NAME_KEY]);
    if (cloudHelpName) {
      await AsyncStorage.setItem(perUserKey, cloudHelpName);
      // Best-effort cleanup of legacy key to avoid cross-user reuse.
      try {
        await AsyncStorage.removeItem(LOCAL_PARENT_HELP_NAME_KEY_LEGACY);
      } catch {
        // ignore
      }
      return cloudHelpName;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Save preferred parent help name to both local storage and Supabase user metadata.
 * Returns true if local save succeeded (cloud update is best-effort).
 */
export async function saveParentHelpName(helpName: string): Promise<boolean> {
  try {
    const normalized = normalizeHelpName(helpName);
    if (!normalized) return false;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      await AsyncStorage.setItem(getLocalKeyForUserId(user.id), normalized);
    } else {
      // Fallback (should be rare) — still save locally.
      await AsyncStorage.setItem(LOCAL_PARENT_HELP_NAME_KEY_LEGACY, normalized);
    }

    try {
      await supabase.auth.updateUser({
        data: { [METADATA_PARENT_HELP_NAME_KEY]: normalized },
      });
    } catch {
      // Best-effort; keep local value.
    }

    return true;
  } catch {
    return false;
  }
}

export function formatCallParentForHelpTitle(helpName: string | null): string {
  const name = normalizeHelpName(helpName);
  if (!name) return "Call Parent for Help!";
  return `Call ${name} for Help!`;
}
