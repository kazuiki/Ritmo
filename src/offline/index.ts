import { startNetworkMonitor } from "./networkService";
import { startAutoSyncService } from "./syncService";

let stopNetwork: (() => void) | null = null;
let stopSync: (() => void) | null = null;

export function startOfflineInfrastructure(): () => void {
  if (!stopNetwork) {
    stopNetwork = startNetworkMonitor();
  }

  if (!stopSync) {
    stopSync = startAutoSyncService();
  }

  return () => {
    stopSync?.();
    stopNetwork?.();
    stopSync = null;
    stopNetwork = null;
  };
}
