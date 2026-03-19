import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabaseClient";

const LAST_USER_ID_KEY = "@ritmo_last_user_id";
const ROUTINE_OVERRIDES_KEY_PREFIX = "@ritmo_routine_overrides_";
const ROUTINE_OVERRIDES_METADATA_KEY = "routine_overrides";
const DEFAULT_DAYS = [0, 1, 2, 3, 4, 5, 6];

type RoutineOverrideInput = {
  days?: number[];
  ringtone?: string;
  imageUrl?: string | null;
  presetId?: number | null;
};

export type RoutineOverride = RoutineOverrideInput & {
  updatedAt: string;
};

export type RoutineOverridesMap = Record<string, RoutineOverride>;

function localOverridesKey(userId: string): string {
  return `${ROUTINE_OVERRIDES_KEY_PREFIX}${userId}`;
}

function normalizeDays(days?: number[]): number[] | undefined {
  if (!Array.isArray(days) || days.length === 0) {
    return undefined;
  }

  const normalized = Array.from(
    new Set(
      days
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    )
  ).sort((a, b) => a - b);

  return normalized.length > 0 ? normalized : undefined;
}

function sanitizeOverride(input: any): RoutineOverride | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const days = normalizeDays(input.days);
  const ringtone = typeof input.ringtone === "string" && input.ringtone.trim().length > 0
    ? input.ringtone.trim()
    : undefined;
  const imageUrl = input.imageUrl === null || typeof input.imageUrl === "string"
    ? input.imageUrl
    : undefined;
  const presetId = typeof input.presetId === "number" && Number.isFinite(input.presetId)
    ? input.presetId
    : input.presetId === null
      ? null
      : undefined;

  const updatedAt = typeof input.updatedAt === "string" && input.updatedAt.trim().length > 0
    ? input.updatedAt
    : new Date(0).toISOString();

  if (!days && !ringtone && imageUrl === undefined && presetId === undefined) {
    return null;
  }

  return {
    ...(days ? { days } : {}),
    ...(ringtone ? { ringtone } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    ...(presetId !== undefined ? { presetId } : {}),
    updatedAt,
  };
}

function sanitizeOverridesMap(input: any): RoutineOverridesMap {
  if (!input || typeof input !== "object") {
    return {};
  }

  const next: RoutineOverridesMap = {};
  for (const [key, value] of Object.entries(input)) {
    const override = sanitizeOverride(value);
    if (override) {
      next[String(key)] = override;
    }
  }

  return next;
}

function mergeOverrides(localMap: RoutineOverridesMap, cloudMap: RoutineOverridesMap): RoutineOverridesMap {
  const merged: RoutineOverridesMap = { ...localMap };

  Object.entries(cloudMap).forEach(([routineId, cloudOverride]) => {
    const localOverride = merged[routineId];
    if (!localOverride) {
      merged[routineId] = cloudOverride;
      return;
    }

    const localUpdatedAt = new Date(localOverride.updatedAt).getTime();
    const cloudUpdatedAt = new Date(cloudOverride.updatedAt).getTime();

    if (Number.isNaN(localUpdatedAt) || cloudUpdatedAt > localUpdatedAt) {
      merged[routineId] = cloudOverride;
    }
  });

  return merged;
}

async function resolveCurrentUserId(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUserId = sessionData?.session?.user?.id;
  if (sessionUserId) {
    await AsyncStorage.setItem(LAST_USER_ID_KEY, sessionUserId);
    return sessionUserId;
  }

  const cachedUserId = await AsyncStorage.getItem(LAST_USER_ID_KEY);
  if (cachedUserId) {
    return cachedUserId;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.id) {
      return null;
    }

    await AsyncStorage.setItem(LAST_USER_ID_KEY, user.id);
    return user.id;
  } catch {
    return null;
  }
}

export async function getRoutineOverridesLocal(userId: string): Promise<RoutineOverridesMap> {
  try {
    const raw = await AsyncStorage.getItem(localOverridesKey(userId));
    if (!raw) {
      return {};
    }

    return sanitizeOverridesMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function setRoutineOverridesLocal(userId: string, overrides: RoutineOverridesMap): Promise<void> {
  await AsyncStorage.setItem(localOverridesKey(userId), JSON.stringify(overrides));
}

export async function refreshRoutineOverridesFromCloud(): Promise<{ userId: string; overrides: RoutineOverridesMap } | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.id) {
      return null;
    }

    const cloudOverrides = sanitizeOverridesMap(user.user_metadata?.[ROUTINE_OVERRIDES_METADATA_KEY]);
    const localOverrides = await getRoutineOverridesLocal(user.id);
    const mergedOverrides = mergeOverrides(localOverrides, cloudOverrides);
    await setRoutineOverridesLocal(user.id, mergedOverrides);

    return {
      userId: user.id,
      overrides: mergedOverrides,
    };
  } catch {
    return null;
  }
}

async function pushRoutineOverridesToCloud(overrides: RoutineOverridesMap): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: {
      [ROUTINE_OVERRIDES_METADATA_KEY]: overrides,
    },
  });

  if (error) {
    throw error;
  }
}

export async function upsertRoutineOverrideForCurrentUser(
  routineId: number,
  input: RoutineOverrideInput
): Promise<void> {
  if (!Number.isFinite(routineId)) {
    return;
  }

  const userId = await resolveCurrentUserId();
  if (!userId) {
    return;
  }

  const routineKey = String(routineId);
  const localOverrides = await getRoutineOverridesLocal(userId);
  const existing = localOverrides[routineKey];

  const nextOverride = sanitizeOverride({
    ...(existing ?? {}),
    ...input,
    updatedAt: new Date().toISOString(),
  });

  if (!nextOverride) {
    return;
  }

  const nextOverrides = {
    ...localOverrides,
    [routineKey]: nextOverride,
  };

  await setRoutineOverridesLocal(userId, nextOverrides);

  try {
    await pushRoutineOverridesToCloud(nextOverrides);
  } catch {
    // Keep local override; cloud update will retry on next successful write/refresh.
  }
}

export async function removeRoutineOverrideForCurrentUser(routineId: number): Promise<void> {
  if (!Number.isFinite(routineId)) {
    return;
  }

  const userId = await resolveCurrentUserId();
  if (!userId) {
    return;
  }

  const localOverrides = await getRoutineOverridesLocal(userId);
  const routineKey = String(routineId);

  if (!localOverrides[routineKey]) {
    return;
  }

  const nextOverrides = { ...localOverrides };
  delete nextOverrides[routineKey];

  await setRoutineOverridesLocal(userId, nextOverrides);

  try {
    await pushRoutineOverridesToCloud(nextOverrides);
  } catch {
    // Keep local deletion; cloud update will retry on next successful write/refresh.
  }
}

export function applyRoutineOverrides<T extends {
  id: number;
  days?: number[];
  ringtone?: string;
  imageUrl?: string | null;
  presetId?: number | null;
}>(
  routines: T[],
  overrides: RoutineOverridesMap
): T[] {
  return routines.map((routine) => {
    const override = overrides[String(routine.id)];

    return {
      ...routine,
      days: override?.days ?? routine.days ?? DEFAULT_DAYS,
      ringtone: override?.ringtone ?? routine.ringtone ?? "alarm1",
      imageUrl: override?.imageUrl ?? routine.imageUrl ?? null,
      presetId: override?.presetId ?? routine.presetId ?? null,
    };
  });
}
