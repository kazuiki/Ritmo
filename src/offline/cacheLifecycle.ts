import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteJsonFile } from "./jsonStore";

const LAST_USER_ID_KEY = "@ritmo_last_user_id";
const LAST_SEEN_PREFIX = "@ritmo_last_seen_";
const NOTIFICATION_PREFIX = "@notification_";

const SHARED_OPTIONAL_KEYS = ["@routines_archived", "mediaSearchHistory:v1"];

function userScopedKeys(userId: string): string[] {
  return [
    `${LAST_SEEN_PREFIX}${userId}`,
    `@routines_${userId}`,
    `@ritmo:routines:${userId}`,
    `@ritmo:completed_order:${userId}`,
    `@ritmo_onboarding_cache_${userId}`,
    `@ritmo_settings_profile_${userId}`,
  ];
}

async function removeNotificationKeysForUser(userId: string): Promise<void> {
  try {
    const storageRaw = await AsyncStorage.getItem(`@routines_${userId}`);
    if (!storageRaw) return;

    const routines = JSON.parse(storageRaw);
    if (!Array.isArray(routines)) return;

    const ids = routines
      .map((item) => Number(item?.id))
      .filter((value) => Number.isFinite(value));

    if (ids.length === 0) return;
    await AsyncStorage.multiRemove(ids.map((id) => `${NOTIFICATION_PREFIX}${id}`));
  } catch {
    // Best-effort cleanup.
  }
}

export async function markUserLastSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${LAST_SEEN_PREFIX}${userId}`, String(Date.now()));
  } catch {
    // Non-critical telemetry signal.
  }
}

export async function clearUserScopedCache(userId: string, options?: { clearShared?: boolean }): Promise<void> {
  const keysToRemove = userScopedKeys(userId);
  if (options?.clearShared) {
    keysToRemove.push(...SHARED_OPTIONAL_KEYS);
  }

  await removeNotificationKeysForUser(userId);
  await AsyncStorage.multiRemove(keysToRemove);

  await Promise.all([
    deleteJsonFile(`cache/${userId}/routines.json`),
    deleteJsonFile(`cache/${userId}/routine_progress.json`),
    deleteJsonFile(`cache/${userId}/onboarding.json`),
  ]);

  const current = await AsyncStorage.getItem(LAST_USER_ID_KEY);
  if (current === userId) {
    await AsyncStorage.removeItem(LAST_USER_ID_KEY);
  }
}

export async function pruneInactiveUserCaches(maxAgeDays: number = 30): Promise<number> {
  const keys = await AsyncStorage.getAllKeys();
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  const lastSeenKeys = keys.filter((key) => key.startsWith(LAST_SEEN_PREFIX));
  let pruned = 0;

  for (const key of lastSeenKeys) {
    const userId = key.slice(LAST_SEEN_PREFIX.length);
    if (!userId) continue;

    const rawTs = await AsyncStorage.getItem(key);
    const ts = Number(rawTs);
    if (!Number.isFinite(ts)) continue;

    if (now - ts > maxAgeMs) {
      await clearUserScopedCache(userId, { clearShared: false });
      pruned += 1;
    }
  }

  return pruned;
}
