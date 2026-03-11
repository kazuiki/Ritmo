import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../supabaseClient";
import { clearUserScopedCache, markUserLastSeen, pruneInactiveUserCaches } from "./cacheLifecycle";
import { isOnline, onNetworkChange } from "./networkService";
import {
    readOnboardingCache,
    replaceRoutineIdInCache,
    upsertOnboardingInCache,
    upsertProgressInCache,
    upsertRoutineInCache,
    writeOnboardingCache,
} from "./offlineData";
import {
    markOperationFailed,
    markOperationPending,
    readPendingOperations,
    removeOperation,
    removeUserOperations,
    replaceRecordIdInQueue,
} from "./offlineQueue";
import type { PendingOperation, SyncRunSummary } from "./types";

const MAX_RETRIES = 5;
const LAST_USER_ID_KEY = "@ritmo_last_user_id";
const SYNC_METRICS_KEY = "@ritmo_sync_metrics";
const PERIODIC_SYNC_MS = 2 * 60 * 1000;
let syncInFlight = false;
let stopNetworkListener: (() => void) | null = null;
let periodicSyncTimer: ReturnType<typeof setInterval> | null = null;
let consecutiveSyncFailures = 0;

type SyncMetrics = {
  lastRunAt: string;
  lastSuccessAt?: string;
  processed: number;
  succeeded: number;
  failed: number;
  queueLength: number;
  consecutiveFailures: number;
  lastError?: string;
};

async function writeSyncMetrics(metrics: SyncMetrics): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_METRICS_KEY, JSON.stringify(metrics));
  } catch {
    // Metrics are best-effort diagnostics.
  }
}

function sanitizeRoutinePayloadForServer(payload: Record<string, any> | undefined) {
  const next = { ...(payload ?? {}) };
  delete next.imageUrl;
  delete next.presetId;
  return next;
}

async function hydrateCacheFromServer(userId: string, hasPendingOnboardingOps: boolean): Promise<void> {
  const { data: links, error: linksError } = await supabase
    .from("user_routine_progress")
    .select("routine_id")
    .eq("user_id", userId);

  if (linksError) {
    throw linksError;
  }

  const routineIds = Array.from(new Set((links ?? []).map((item: any) => item.routine_id))).filter(
    (value) => typeof value === "number"
  ) as number[];

  if (routineIds.length > 0) {
    const { data: routines, error: routinesError } = await supabase
      .from("routines")
      .select("*")
      .in("id", routineIds)
      .order("id", { ascending: true });

    if (routinesError) {
      throw routinesError;
    }

    for (const routine of routines ?? []) {
      await upsertRoutineInCache(userId, routine as any);
    }
  }

  const { data: progress, error: progressError } = await supabase
    .from("user_routine_progress")
    .select("*")
    .eq("user_id", userId)
    .order("day_date", { ascending: true });

  if (progressError) {
    throw progressError;
  }

  for (const row of progress ?? []) {
    await upsertProgressInCache(userId, row as any);
  }

  if (!hasPendingOnboardingOps) {
    const { data: onboarding, error: onboardingError } = await supabase
      .from("user_onboarding_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (onboardingError && onboardingError.code !== "PGRST116") {
      throw onboardingError;
    }

    if (onboarding) {
      await upsertOnboardingInCache(userId, onboarding as any);
    }
  }
}

async function resolveRoutineUpdateConflict(op: PendingOperation): Promise<void> {
  const routineId = Number(op.recordId);
  const updatePayload = sanitizeRoutinePayloadForServer(op.payload as Record<string, any>);
  const { data: remote, error: fetchError } = await supabase
    .from("routines")
    .select("*")
    .eq("id", routineId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const serverTs = new Date(remote?.updated_at ?? 0).getTime();
  const clientTs = new Date(op.clientUpdatedAt).getTime();

  if (clientTs >= serverTs) {
    const { data, error } = await supabase
      .from("routines")
      .update(updatePayload)
      .eq("id", routineId)
      .select("*")
      .single();

    if (error) throw error;
    await upsertRoutineInCache(op.userId, data);
    return;
  }

  await upsertRoutineInCache(op.userId, remote);
}

async function processOperation(op: PendingOperation): Promise<void> {
  if (op.entity === "routine") {
    if (op.action === "create") {
      const insertPayload = sanitizeRoutinePayloadForServer(op.payload as Record<string, any>);
      const { data, error } = await supabase
        .from("routines")
        .insert(insertPayload)
        .select("*")
        .single();
      if (error) throw error;

      await replaceRoutineIdInCache(op.userId, Number(op.clientTempId), data);
      if (op.clientTempId) {
        await replaceRecordIdInQueue(op.userId, op.clientTempId, String(data.id));
      }
      return;
    }

    if (op.action === "update") {
      await resolveRoutineUpdateConflict(op);
      return;
    }

    if (op.action === "delete") {
      const { data, error } = await supabase
        .from("routines")
        .update(op.payload)
        .eq("id", Number(op.recordId))
        .select("*")
        .single();
      if (error) throw error;
      await upsertRoutineInCache(op.userId, data);
      return;
    }
  }

  if (op.entity === "routine_progress") {
    const routineId = Number(op.recordId);
    const dayDate = String(op.payload.day_date);

    const { data: existing } = await supabase
      .from("user_routine_progress")
      .select("*")
      .eq("user_id", op.userId)
      .eq("routine_id", routineId)
      .eq("day_date", dayDate)
      .maybeSingle();

    if (existing) {
      const serverTs = new Date(existing.completed_at ?? 0).getTime();
      const clientTs = new Date(op.clientUpdatedAt).getTime();
      if (serverTs > clientTs) {
        await upsertProgressInCache(op.userId, existing as any);
        return;
      }

      const { data, error } = await supabase
        .from("user_routine_progress")
        .update({
          completed: Boolean(op.payload.completed),
          completed_at: op.payload.completed ? op.clientUpdatedAt : null,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      await upsertProgressInCache(op.userId, data);
      return;
    }

    const { data, error } = await supabase
      .from("user_routine_progress")
      .insert({
        user_id: op.userId,
        routine_id: routineId,
        day_date: dayDate,
        completed: Boolean(op.payload.completed),
        completed_at: op.payload.completed ? op.clientUpdatedAt : null,
      })
      .select("*")
      .single();

    if (error) throw error;
    await upsertProgressInCache(op.userId, data);
    return;
  }

  if (op.entity === "onboarding" && op.action === "upsert") {
    const { data: remote, error: fetchError } = await supabase
      .from("user_onboarding_preferences")
      .select("*")
      .eq("user_id", op.userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    const incoming = op.payload as Record<string, any>;
    const onboardingFlagKeys = [
      "main_tour_completed",
      "parental_lock_completed",
      "add_routine_completed",
      "add_routine_modal_completed",
      "routine_preset_completed",
      "progress_completed",
    ] as const;

    const isExplicitResetPayload = onboardingFlagKeys.every((key) => incoming[key] === false);
    const serverTs = new Date(remote?.updated_at ?? 0).getTime();
    const clientTs = new Date(op.clientUpdatedAt).getTime();

    if (remote && serverTs > clientTs) {
      await writeOnboardingCache(op.userId, remote);
      return;
    }

    const monotonicIncoming = { ...incoming };
    if (remote && !isExplicitResetPayload) {
      for (const key of onboardingFlagKeys) {
        if (monotonicIncoming[key] === undefined) continue;
        monotonicIncoming[key] = Boolean(remote[key]) || Boolean(monotonicIncoming[key]);
      }
    }

    const updatePayload = {
      ...monotonicIncoming,
      updated_at: op.clientUpdatedAt,
    };

    if (!remote) {
      const { data, error } = await supabase
        .from("user_onboarding_preferences")
        .insert({ user_id: op.userId, ...updatePayload })
        .select("*")
        .single();
      if (error) throw error;
      await writeOnboardingCache(op.userId, data);
      return;
    }

    const { data, error } = await supabase
      .from("user_onboarding_preferences")
      .update(updatePayload)
      .eq("user_id", op.userId)
      .select("*")
      .single();

    if (error) throw error;
    await writeOnboardingCache(op.userId, data);
  }
}

async function handleMissingRemoteUserCleanup(): Promise<void> {
  if (!isOnline()) return;

  const [{ data: sessionData }, { data: userData, error: userError }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  const hasSession = Boolean(sessionData?.session);
  const hasRemoteUser = Boolean(userData?.user);
  if (!hasSession || hasRemoteUser || userError?.message?.toLowerCase?.().includes("network")) {
    return;
  }

  const cachedUserId = await AsyncStorage.getItem(LAST_USER_ID_KEY);
  if (!cachedUserId) return;

  await removeUserOperations(cachedUserId);
  await clearUserScopedCache(cachedUserId, { clearShared: false });
  await supabase.auth.signOut();
}

export async function runSyncNow(): Promise<SyncRunSummary> {
  if (!isOnline() || syncInFlight) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  syncInFlight = true;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let queueLength = 0;
  let lastError: string | undefined;

  try {
    await handleMissingRemoteUserCleanup();
    const queue = await readPendingOperations();
    queueLength = queue.length;
    const hasPendingOnboardingOps = queue.some(
      (op) => op.entity === "onboarding" && (op.status === "pending" || op.status === "failed")
    );
    for (const op of queue) {
      if (op.status === "failed" && op.retryCount >= MAX_RETRIES) {
        continue;
      }

      processed += 1;
      try {
        await markOperationPending(op.opId);
        await processOperation(op);
        await removeOperation(op.opId);
        succeeded += 1;
      } catch (error: any) {
        failed += 1;
        lastError = error?.message ?? "Sync failed";
        await markOperationFailed(op.opId, error?.message ?? "Sync failed");
      }
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (userId) {
      await markUserLastSeen(userId);
      await hydrateCacheFromServer(userId, hasPendingOnboardingOps);

      const onboarding = await readOnboardingCache(userId);
      if (onboarding) {
        await writeOnboardingCache(userId, onboarding);
      }
    }

    if (failed === 0) {
      consecutiveSyncFailures = 0;
    } else {
      consecutiveSyncFailures += 1;
    }

    await writeSyncMetrics({
      lastRunAt: new Date().toISOString(),
      lastSuccessAt: failed === 0 ? new Date().toISOString() : undefined,
      processed,
      succeeded,
      failed,
      queueLength,
      consecutiveFailures: consecutiveSyncFailures,
      lastError,
    });

    await pruneInactiveUserCaches(30);

    return { processed, succeeded, failed };
  } finally {
    syncInFlight = false;
  }
}

export function startAutoSyncService(): () => void {
  if (stopNetworkListener) {
    return stopNetworkListener;
  }

  stopNetworkListener = onNetworkChange((online) => {
    if (online) {
      runSyncNow().catch((err) => {
        console.log("Sync run failed", err?.message ?? err);
      });
    }
  });

  if (!periodicSyncTimer) {
    periodicSyncTimer = setInterval(() => {
      if (!isOnline()) return;
      runSyncNow().catch(() => {
        // Ignore periodic failures.
      });
    }, PERIODIC_SYNC_MS);
  }

  runSyncNow().catch(() => {
    // Ignore initial failures.
  });

  return () => {
    if (stopNetworkListener) {
      stopNetworkListener();
      stopNetworkListener = null;
    }
    if (periodicSyncTimer) {
      clearInterval(periodicSyncTimer);
      periodicSyncTimer = null;
    }
  };
}
