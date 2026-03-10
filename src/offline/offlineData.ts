import { deleteJsonFile, readJsonFile, writeJsonFile } from "./jsonStore";

type RoutineCacheItem = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  time: string;
  imageUrl?: string | null;
  presetId?: number | null;
  created_at?: string;
  updated_at?: string;
};

type RoutineProgressCacheItem = {
  id: number;
  user_id: string;
  routine_id: number;
  day_date: string;
  completed: boolean;
  completed_at: string | null;
  created_at?: string;
};

type OnboardingPreferencesCacheItem = {
  user_id: string;
  main_tour_completed: boolean;
  parental_lock_completed: boolean;
  add_routine_completed: boolean;
  add_routine_modal_completed: boolean;
  routine_preset_completed: boolean;
  progress_completed: boolean;
  created_at?: string;
  updated_at?: string;
};

function routinesPath(userId: string): string {
  return `cache/${userId}/routines.json`;
}

function progressPath(userId: string): string {
  return `cache/${userId}/routine_progress.json`;
}

function onboardingPath(userId: string): string {
  return `cache/${userId}/onboarding.json`;
}

export async function readRoutinesCache(userId: string): Promise<RoutineCacheItem[]> {
  return readJsonFile<RoutineCacheItem[]>(routinesPath(userId), []);
}

export async function writeRoutinesCache(userId: string, routines: RoutineCacheItem[]): Promise<void> {
  await writeJsonFile(routinesPath(userId), routines);
}

export async function upsertRoutineInCache(userId: string, routine: RoutineCacheItem): Promise<void> {
  const list = await readRoutinesCache(userId);
  const idx = list.findIndex((item) => item.id === routine.id);
  if (idx >= 0) {
    const existing = list[idx];
    list[idx] = {
      ...existing,
      ...routine,
      imageUrl: routine.imageUrl !== undefined ? routine.imageUrl : existing.imageUrl,
      presetId: routine.presetId !== undefined ? routine.presetId : existing.presetId,
    };
  } else {
    list.push(routine);
  }
  await writeRoutinesCache(userId, list);
}

export async function replaceRoutineIdInCache(userId: string, oldId: number, newRoutine: RoutineCacheItem): Promise<void> {
  const list = await readRoutinesCache(userId);
  const next = list
    .filter((item) => item.id !== oldId)
    .filter((item) => item.id !== newRoutine.id);
  next.push(newRoutine);
  next.sort((a, b) => a.id - b.id);
  await writeRoutinesCache(userId, next);

  const progress = await readProgressCache(userId);
  const mapped = progress.map((item) => {
    if (item.routine_id === oldId) {
      return { ...item, routine_id: newRoutine.id };
    }
    return item;
  });
  await writeProgressCache(userId, mapped);
}

export async function readProgressCache(userId: string): Promise<RoutineProgressCacheItem[]> {
  return readJsonFile<RoutineProgressCacheItem[]>(progressPath(userId), []);
}

export async function writeProgressCache(userId: string, progress: RoutineProgressCacheItem[]): Promise<void> {
  await writeJsonFile(progressPath(userId), progress);
}

export async function upsertProgressInCache(userId: string, row: RoutineProgressCacheItem): Promise<void> {
  const list = await readProgressCache(userId);
  const idx = list.findIndex((item) => item.user_id === row.user_id && item.routine_id === row.routine_id && item.day_date === row.day_date);
  if (idx >= 0) {
    list[idx] = row;
  } else {
    list.push(row);
  }
  await writeProgressCache(userId, list);
}

export async function readOnboardingCache(userId: string): Promise<OnboardingPreferencesCacheItem | null> {
  return readJsonFile<OnboardingPreferencesCacheItem | null>(onboardingPath(userId), null);
}

export async function writeOnboardingCache(userId: string, value: OnboardingPreferencesCacheItem): Promise<void> {
  await writeJsonFile(onboardingPath(userId), value);
}

export async function upsertOnboardingInCache(userId: string, value: OnboardingPreferencesCacheItem): Promise<void> {
  await writeOnboardingCache(userId, value);
}

export async function clearOnboardingJsonCache(userId: string): Promise<void> {
  await deleteJsonFile(onboardingPath(userId));
}
