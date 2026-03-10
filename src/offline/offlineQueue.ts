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
