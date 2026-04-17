import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabaseClient";

const LAST_USER_ID_KEY = "@ritmo_last_user_id";
const LOGS_KEY_PREFIX = "@ritmo_routine_execution_logs_";
const ACTIVE_SESSION_KEY_PREFIX = "@ritmo_active_routine_execution_";

export type RoutineExecutionSource = "book_guide" | "mini_game" | "manual" | "direct";
export type RoutineExecutionStatus = "completed" | "missed" | "pending" | "abandoned";

export interface RoutineExecutionLog {
  id: string;
  user_id: string;
  routine_id: number;
  routine_name: string;
  routine_time: string;
  day_date: string;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  status: RoutineExecutionStatus;
  source: RoutineExecutionSource;
  created_at: string;
}

export interface RoutineExecutionSession {
  routine_id: number;
  routine_name: string;
  routine_time: string;
  started_at: string;
  source: RoutineExecutionSource;
}

type RangeFilter = {
  from: string | Date;
  to: string | Date;
  routineId?: number | null;
  routineName?: string | null;
  statuses?: RoutineExecutionStatus[];
};

function toDateOnly(input: string | Date): string {
  if (typeof input === "string") {
    return input.slice(0, 10);
  }

  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

async function readLogs(userId: string): Promise<RoutineExecutionLog[]> {
  const raw = await AsyncStorage.getItem(`${LOGS_KEY_PREFIX}${userId}`);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item?.routine_id === "number");
  } catch {
    return [];
  }
}

async function writeLogs(userId: string, logs: RoutineExecutionLog[]): Promise<void> {
  await AsyncStorage.setItem(`${LOGS_KEY_PREFIX}${userId}`, JSON.stringify(logs));
}

async function readActiveSession(userId: string): Promise<RoutineExecutionSession | null> {
  const raw = await AsyncStorage.getItem(`${ACTIVE_SESSION_KEY_PREFIX}${userId}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.routine_id !== "number") return null;
    return parsed as RoutineExecutionSession;
  } catch {
    return null;
  }
}

async function writeActiveSession(userId: string, session: RoutineExecutionSession | null): Promise<void> {
  const key = `${ACTIVE_SESSION_KEY_PREFIX}${userId}`;
  if (!session) {
    await AsyncStorage.removeItem(key);
    return;
  }

  await AsyncStorage.setItem(key, JSON.stringify(session));
}

function getDayDateFromTimestamp(timestamp: string): string {
  return timestamp.slice(0, 10);
}

export async function startRoutineExecution(params: {
  routineId: number;
  routineName: string;
  routineTime: string;
  source?: RoutineExecutionSource;
  startedAt?: Date;
}): Promise<RoutineExecutionSession> {
  const userId = await getCurrentUserId();
  const startedAt = params.startedAt ?? new Date();
  const session: RoutineExecutionSession = {
    routine_id: params.routineId,
    routine_name: params.routineName,
    routine_time: params.routineTime,
    started_at: startedAt.toISOString(),
    source: params.source ?? "direct",
  };

  await writeActiveSession(userId, session);
  return session;
}

export async function completeRoutineExecution(params: {
  routineId: number;
  routineName: string;
  routineTime: string;
  status?: RoutineExecutionStatus;
  source?: RoutineExecutionSource;
  finishedAt?: Date;
}): Promise<RoutineExecutionLog | null> {
  const userId = await getCurrentUserId();
  const finishedAt = params.finishedAt ?? new Date();
  const activeSession = await readActiveSession(userId);
  const startedAt = activeSession?.routine_id === params.routineId
    ? new Date(activeSession.started_at)
    : finishedAt;

  const createdAt = finishedAt.toISOString();
  const durationSeconds = Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));
  const log: RoutineExecutionLog = {
    id: `${params.routineId}-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    routine_id: params.routineId,
    routine_name: params.routineName,
    routine_time: params.routineTime,
    day_date: getDayDateFromTimestamp(startedAt.toISOString()),
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: durationSeconds,
    status: params.status ?? "completed",
    source: params.source ?? activeSession?.source ?? "direct",
    created_at: createdAt,
  };

  const logs = await readLogs(userId);
  const existingIndex = logs.findIndex(
    (item) =>
      item.routine_id === params.routineId &&
      item.day_date === log.day_date &&
      item.status === log.status &&
      item.started_at === log.started_at
  );

  if (existingIndex >= 0) {
    logs[existingIndex] = log;
  } else {
    logs.push(log);
  }

  await writeLogs(userId, logs);
  await writeActiveSession(userId, null);
  return log;
}

export async function clearRoutineExecutionState(): Promise<void> {
  const userId = await getCurrentUserId().catch(() => null);
  if (!userId) return;

  await AsyncStorage.multiRemove([
    `${LOGS_KEY_PREFIX}${userId}`,
    `${ACTIVE_SESSION_KEY_PREFIX}${userId}`,
  ]);
}

export async function getRoutineExecutionLogsForRange(params: RangeFilter): Promise<RoutineExecutionLog[]> {
  const userId = await getCurrentUserId();
  const logs = await readLogs(userId);
  const from = toDateOnly(params.from);
  const to = toDateOnly(params.to);

  return logs
    .filter((item) => item.day_date >= from && item.day_date <= to)
    .filter((item) => (params.routineId ? item.routine_id === params.routineId : true))
    .filter((item) => (params.routineName ? item.routine_name === params.routineName : true))
    .filter((item) => (params.statuses && params.statuses.length > 0 ? params.statuses.includes(item.status) : true))
    .sort((a, b) => {
      const aTime = a.started_at ?? a.created_at;
      const bTime = b.started_at ?? b.created_at;
      return aTime.localeCompare(bTime);
    });
}

export async function getAverageDurationSecondsByRoutineForRange(params: RangeFilter): Promise<Record<number, number>> {
  const logs = await getRoutineExecutionLogsForRange({
    from: params.from,
    to: params.to,
    statuses: ["completed"],
  });

  const groups = new Map<number, number[]>();
  for (const log of logs) {
    if (typeof log.duration_seconds !== "number") continue;
    const list = groups.get(log.routine_id) ?? [];
    list.push(log.duration_seconds);
    groups.set(log.routine_id, list);
  }

  const result: Record<number, number> = {};
  groups.forEach((values, routineId) => {
    if (values.length === 0) return;
    const total = values.reduce((sum, value) => sum + value, 0);
    result[routineId] = Math.round(total / values.length);
  });

  return result;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0s";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
  }

  return `${secs}s`;
}

export function formatClockTime(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "—";
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
