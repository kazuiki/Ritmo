import { readJsonFile, writeJsonFile } from "./jsonStore";
import type { PendingOperation } from "./types";

const QUEUE_PATH = "queue/pending.json";

function makeOpId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createPendingOperation(op: Omit<PendingOperation, "opId" | "status" | "retryCount">): PendingOperation {
  return {
    ...op,
    opId: makeOpId(),
    status: "pending",
    retryCount: 0,
  };
}

export async function readPendingOperations(): Promise<PendingOperation[]> {
  return readJsonFile<PendingOperation[]>(QUEUE_PATH, []);
}

export async function writePendingOperations(ops: PendingOperation[]): Promise<void> {
  await writeJsonFile(QUEUE_PATH, ops);
}

export async function enqueueOperation(op: PendingOperation): Promise<void> {
  const queue = await readPendingOperations();

  // Coalesce repetitive updates so retries stay idempotent and queue stays small.
  if (op.entity === "onboarding" && op.action === "upsert") {
    const idx = queue.findIndex((item) => item.userId === op.userId && item.entity === "onboarding" && item.action === "upsert");
    if (idx >= 0) {
      queue[idx] = {
        ...queue[idx],
        payload: {
          ...queue[idx].payload,
          ...op.payload,
        },
        clientUpdatedAt: op.clientUpdatedAt,
        status: "pending",
      };
      await writePendingOperations(queue);
      return;
    }
  }

  if (op.entity === "routine" && op.action === "update" && op.recordId) {
    const idx = queue.findIndex(
      (item) => item.userId === op.userId && item.entity === "routine" && item.action === "update" && item.recordId === op.recordId
    );
    if (idx >= 0) {
      queue[idx] = {
        ...queue[idx],
        payload: {
          ...queue[idx].payload,
          ...op.payload,
        },
        clientUpdatedAt: op.clientUpdatedAt,
        status: "pending",
      };
      await writePendingOperations(queue);
      return;
    }
  }

  if (op.entity === "routine_progress" && op.action === "upsert" && op.recordId && op.payload?.day_date) {
    const idx = queue.findIndex(
      (item) =>
        item.userId === op.userId &&
        item.entity === "routine_progress" &&
        item.action === "upsert" &&
        item.recordId === op.recordId &&
        item.payload?.day_date === op.payload?.day_date
    );
    if (idx >= 0) {
      queue[idx] = {
        ...queue[idx],
        payload: {
          ...queue[idx].payload,
          ...op.payload,
        },
        clientUpdatedAt: op.clientUpdatedAt,
        status: "pending",
      };
      await writePendingOperations(queue);
      return;
    }
  }

  queue.push(op);
  await writePendingOperations(queue);
}

export async function removeOperation(opId: string): Promise<void> {
  const queue = await readPendingOperations();
  await writePendingOperations(queue.filter((op) => op.opId !== opId));
}

export async function markOperationFailed(opId: string, message: string): Promise<void> {
  const queue = await readPendingOperations();
  const next = queue.map((op) => {
    if (op.opId !== opId) return op;
    return {
      ...op,
      status: "failed" as const,
      retryCount: op.retryCount + 1,
      lastError: message,
    };
  });
  await writePendingOperations(next);
}

export async function markOperationPending(opId: string): Promise<void> {
  const queue = await readPendingOperations();
  const next = queue.map((op) => {
    if (op.opId !== opId) return op;
    return {
      ...op,
      status: "pending" as const,
      retryCount: op.retryCount,
    };
  });
  await writePendingOperations(next);
}

export async function replaceRecordIdInQueue(userId: string, oldId: string, newId: string): Promise<void> {
  const queue = await readPendingOperations();
  const next = queue.map((op) => {
    if (op.userId !== userId) return op;
    if (op.recordId === oldId) {
      return { ...op, recordId: newId };
    }
    return op;
  });
  await writePendingOperations(next);
}

export async function removeUserOperations(userId: string): Promise<void> {
  const queue = await readPendingOperations();
  await writePendingOperations(queue.filter((op) => op.userId !== userId));
}
