import AsyncStorage from "@react-native-async-storage/async-storage";
import { isOnline } from "./offline/networkService";
import {
  readProgressCache,
  readRoutinesCache,
  upsertProgressInCache,
  upsertRoutineInCache,
  writeProgressCache,
  writeRoutinesCache,
} from "./offline/offlineData";
import { createPendingOperation, enqueueOperation } from "./offline/offlineQueue";
import { supabase } from "./supabaseClient";

const LAST_USER_ID_KEY = "@ritmo_last_user_id";

export type RoutineInsert = {
  name: string;
  description?: string | null;
  is_active?: boolean;
  time: string; // e.g. "01:00 am"
  imageUrl?: string | null;
  presetId?: number | null;
};

export type Routine = {
  id: number;
  routine_ud?: string | null; // keep optional since schema mentions it
  name: string;
  description: string | null;
  is_active: boolean;
  time: string;
  imageUrl?: string | null;
  presetId?: number | null;
  created_at?: string;
  updated_at?: string;
};

function toRemoteRoutinePayload(values: {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  time?: string;
}) {
  return {
    name: values.name,
    description: values.description ?? null,
    is_active: values.is_active ?? true,
    time: values.time,
  };
}

function toRemoteRoutinePatch(
  patch: Partial<Pick<Routine, "name" | "description" | "is_active" | "time" | "imageUrl" | "presetId">>
) {
  const remotePatch: Record<string, any> = {};
  if (patch.name !== undefined) remotePatch.name = patch.name;
  if (patch.description !== undefined) remotePatch.description = patch.description;
  if (patch.is_active !== undefined) remotePatch.is_active = patch.is_active;
  if (patch.time !== undefined) remotePatch.time = patch.time;
  return remotePatch;
}

export type RoutineProgress = {
  id: number;
  user_id: string;
  routine_id: number;
  day_date: string; // YYYY-MM-DD
  completed: boolean;
  completed_at: string | null; // ISO timestamp
  created_at?: string;
};

async function getCurrentUserId(): Promise<string> {
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

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error("Not authenticated");
  }
  await AsyncStorage.setItem(LAST_USER_ID_KEY, data.user.id);
  return data.user.id;
}

function makeOfflineRoutineId(): number {
  return -1 * Date.now();
}

function toDateOnly(input?: Date | string): string {
  let date: Date;
  
  if (!input) {
    date = new Date();
  } else if (input instanceof Date) {
    date = input;
  } else {
    // assume already YYYY-MM-DD
    return input.slice(0, 10);
  }
  
  // Use local timezone instead of UTC to avoid date shift issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

async function createRoutineRemote(values: RoutineInsert): Promise<Routine> {
  const payload = toRemoteRoutinePayload(values);
  const { data, error } = await supabase
    .from("routines")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as Routine;
}

export async function createRoutineForCurrentUser(values: RoutineInsert): Promise<Routine> {
  const userId = await getCurrentUserId();

  if (isOnline()) {
    try {
      const routine = await createRoutineRemote(values);
      await upsertRoutineInCache(userId, routine);
      await ensureProgressRow({ routineId: routine.id, completed: false });
      return routine;
    } catch {
      // Falls back to offline queue when online request fails.
    }
  }

  const nowIso = new Date().toISOString();
  const offlineRoutine: Routine = {
    id: makeOfflineRoutineId(),
    name: values.name,
    description: values.description ?? null,
    is_active: values.is_active ?? true,
    time: values.time,
    imageUrl: values.imageUrl ?? null,
    presetId: values.presetId ?? null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  await upsertRoutineInCache(userId, offlineRoutine);

  await enqueueOperation(
    createPendingOperation({
      entity: "routine",
      action: "create",
      userId,
      clientTempId: String(offlineRoutine.id),
      payload: {
        ...toRemoteRoutinePayload(values),
      },
      clientUpdatedAt: nowIso,
    })
  );

  await ensureProgressRow({ routineId: offlineRoutine.id, completed: false });
  return offlineRoutine;
}

export async function ensureProgressRow(params: {
  routineId: number;
  dayDate?: string | Date;
  completed?: boolean;
}): Promise<RoutineProgress> {
  const userId = await getCurrentUserId();
  const day = toDateOnly(params.dayDate);
  const completed = !!params.completed;
  const localRow: RoutineProgress = {
    id: Date.now(),
    user_id: userId,
    routine_id: params.routineId,
    day_date: day,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  };

  await upsertProgressInCache(userId, localRow);

  if (isOnline()) {
    try {
      const { data: existing, error: selErr } = await supabase
        .from("user_routine_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("routine_id", params.routineId)
        .eq("day_date", day)
        .maybeSingle();

      if (selErr && selErr.code !== "PGRST116") {
        throw selErr;
      }

      if (existing) {
        const { data, error } = await supabase
          .from("user_routine_progress")
          .update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
          })
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw error;
        await upsertProgressInCache(userId, data as RoutineProgress);
        return data as RoutineProgress;
      }

      const { data, error } = await supabase
        .from("user_routine_progress")
        .insert({
          user_id: userId,
          routine_id: params.routineId,
          day_date: day,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .select("*")
        .single();
      if (error) throw error;
      await upsertProgressInCache(userId, data as RoutineProgress);
      return data as RoutineProgress;
    } catch {
      // Request failed; falls through to queue.
    }
  }

  await enqueueOperation(
    createPendingOperation({
      entity: "routine_progress",
      action: "upsert",
      userId,
      recordId: String(params.routineId),
      payload: {
        day_date: day,
        completed,
      },
      clientUpdatedAt: new Date().toISOString(),
    })
  );

  return localRow;
}

export async function setRoutineCompleted(params: {
  routineId: number;
  dayDate?: string | Date;
  completed: boolean;
}): Promise<RoutineProgress> {
  return ensureProgressRow(params);
}

export async function getUserProgressForRange(params: {
  routineId?: number;
  from: string | Date;
  to: string | Date;
}): Promise<RoutineProgress[]> {
  const userId = await getCurrentUserId();
  const from = toDateOnly(params.from);
  const to = toDateOnly(params.to);

  if (isOnline()) {
    try {
      let q = supabase
        .from("user_routine_progress")
        .select("*")
        .eq("user_id", userId)
        .gte("day_date", from)
        .lte("day_date", to)
        .order("day_date", { ascending: true });

      if (params.routineId) q = q.eq("routine_id", params.routineId);

      const { data, error } = await q;
      if (error) throw error;
      const serverRows = (data ?? []) as RoutineProgress[];
      await writeProgressCache(userId, serverRows);

      if (serverRows.length > 0) {
        return serverRows;
      }

      const cachedRange = (await readProgressCache(userId))
        .filter((row) => row.day_date >= from && row.day_date <= to)
        .filter((row) => (params.routineId ? row.routine_id === params.routineId : true))
        .sort((a, b) => a.day_date.localeCompare(b.day_date));

      if (cachedRange.length > 0) {
        return cachedRange;
      }

      return serverRows;
    } catch {
      // Fallback to cache.
    }
  }

  const cached = await readProgressCache(userId);
  return cached
    .filter((row) => row.day_date >= from && row.day_date <= to)
    .filter((row) => (params.routineId ? row.routine_id === params.routineId : true))
    .sort((a, b) => a.day_date.localeCompare(b.day_date));
}

export async function getRoutinesForCurrentUser(params?: { includeInactive?: boolean }): Promise<Routine[]> {
  const includeInactive = params?.includeInactive ?? false;
  const userId = await getCurrentUserId();

  if (isOnline()) {
    try {
      const cached = await readRoutinesCache(userId);

      const { data: links, error: linkErr } = await supabase
        .from("user_routine_progress")
        .select("routine_id")
        .eq("user_id", userId);
      if (linkErr) throw linkErr;

      const ids = Array.from(new Set((links ?? []).map((r: any) => r.routine_id))).filter(
        (v) => typeof v === "number"
      );

      if (ids.length === 0) {
        if (cached.length > 0) {
          return includeInactive ? cached : cached.filter((item) => item.is_active);
        }
        await writeRoutinesCache(userId, []);
        return [];
      }

      let q = supabase
        .from("routines")
        .select("*")
        .in("id", ids)
        .order("id", { ascending: true });
      if (!includeInactive) q = q.eq("is_active", true);

      const { data, error } = await q;
      if (error) throw error;
      const serverRows = (data ?? []) as Routine[];
      await writeRoutinesCache(userId, serverRows);

      if (serverRows.length > 0) {
        return serverRows;
      }

      if (cached.length > 0) {
        return includeInactive ? cached : cached.filter((item) => item.is_active);
      }

      return serverRows;
    } catch {
      // Fallback to cache.
    }
  }

  const cached = await readRoutinesCache(userId);
  return includeInactive ? cached : cached.filter((item) => item.is_active);
}

export async function updateRoutine(
  id: number,
  patch: Partial<Pick<Routine, "name" | "description" | "is_active" | "time" | "imageUrl" | "presetId">>
): Promise<Routine> {
  const userId = await getCurrentUserId();
  const cache = await readRoutinesCache(userId);
  const existing = cache.find((item) => item.id === id);
  const localUpdated: Routine = {
    ...(existing ?? {
      id,
      name: "",
      description: null,
      is_active: true,
      time: "01:00 am",
      imageUrl: null,
      presetId: null,
    }),
    ...patch,
    updated_at: new Date().toISOString(),
  };
  await upsertRoutineInCache(userId, localUpdated);

  const remotePatch = toRemoteRoutinePatch(patch);

  if (isOnline() && id > 0) {
    try {
      const { data, error } = await supabase
        .from("routines")
        .update(remotePatch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      await upsertRoutineInCache(userId, data as Routine);
      return data as Routine;
    } catch {
      // Falls back to queue.
    }
  }

  await enqueueOperation(
    createPendingOperation({
      entity: "routine",
      action: "update",
      userId,
      recordId: String(id),
      payload: remotePatch,
      clientUpdatedAt: new Date().toISOString(),
    })
  );
  return localUpdated;
}

// Unlink a routine from the current user by removing all progress rows for it.
export async function unlinkRoutineForCurrentUser(routineId: number): Promise<number> {
  const userId = await getCurrentUserId();
  const { error, count } = await supabase
    .from("user_routine_progress")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("routine_id", routineId);
  if (error) throw error;
  return count ?? 0;
}

// Delete a routine completely from the database (both routine and progress records)
export async function deleteRoutine(routineId: number): Promise<void> {
  const userId = await getCurrentUserId();
  const cache = await readRoutinesCache(userId);
  const existing = cache.find((item) => item.id === routineId);
  if (existing) {
    await upsertRoutineInCache(userId, {
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    });
  }

  if (isOnline() && routineId > 0) {
    try {
      const { data, error } = await supabase
        .from("routines")
        .update({ is_active: false })
        .eq("id", routineId)
        .select("*")
        .single();
      if (error) throw error;
      await upsertRoutineInCache(userId, data as Routine);
      return;
    } catch {
      // Request failed; falls through to queue.
    }
  }

  if (routineId <= 0 || !isOnline()) {
    await enqueueOperation(
      createPendingOperation({
        entity: "routine",
        action: "delete",
        userId,
        recordId: String(routineId),
        payload: { is_active: false },
        clientUpdatedAt: new Date().toISOString(),
      })
    );
  }
}

// Get the earliest date when the user started tracking routines
// Returns null if no progress data exists
export async function getUserFirstProgressDate(): Promise<Date | null> {
  const userId = await getCurrentUserId();

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from("user_routine_progress")
        .select("day_date")
        .eq("user_id", userId)
        .order("day_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return new Date(data.day_date);
    } catch {
      // Fallback to cache.
    }
  }

  const cached = await readProgressCache(userId);
  if (!cached.length) return null;
  const first = [...cached].sort((a, b) => a.day_date.localeCompare(b.day_date))[0];
  return new Date(first.day_date);
}

// Get earliest progress date per routine for current user
// Returns a mapping of routine_id -> YYYY-MM-DD (string)
export async function getUserFirstProgressDatesByRoutine(): Promise<Record<number, string>> {
  const userId = await getCurrentUserId();

  let rows: Array<{ routine_id: number; day_date: string }> = [];
  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from("user_routine_progress")
        .select("routine_id, day_date")
        .eq("user_id", userId)
        .order("day_date", { ascending: true });
      if (error) throw error;
      rows = (data ?? []) as Array<{ routine_id: number; day_date: string }>;
    } catch {
      // Fallback to cache.
    }
  }

  if (!rows.length) {
    const cached = await readProgressCache(userId);
    rows = cached.map((item) => ({ routine_id: item.routine_id, day_date: item.day_date }));
    rows.sort((a, b) => a.day_date.localeCompare(b.day_date));
  }

  if (!rows.length) {
    return {};
  }

  const result: Record<number, string> = {};
  for (const row of rows) {
    if (row && typeof row.routine_id === 'number' && !result[row.routine_id]) {
      result[row.routine_id] = row.day_date;
    }
  }
  return result;
}