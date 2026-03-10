export type OfflineEntity = "routine" | "routine_progress" | "onboarding";

export type OfflineAction = "create" | "update" | "delete" | "upsert";

export type PendingOperationStatus = "pending" | "failed";

export interface PendingOperation {
  opId: string;
  entity: OfflineEntity;
  action: OfflineAction;
  userId: string;
  recordId?: string;
  clientTempId?: string;
  payload: Record<string, any>;
  baseVersion?: string;
  clientUpdatedAt: string;
  status: PendingOperationStatus;
  retryCount: number;
  lastError?: string;
}

export interface SyncRunSummary {
  processed: number;
  succeeded: number;
  failed: number;
}
