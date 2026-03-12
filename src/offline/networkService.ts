import NetInfo from "@react-native-community/netinfo";

let currentOnline = true;
const listeners = new Set<(online: boolean) => void>();
let unsubscribeInternal: (() => void) | null = null;

export function isOnline(): boolean {
  return currentOnline;
}

export async function refreshNetworkState(): Promise<boolean> {
  const state = await NetInfo.fetch();
  const online = Boolean(state.isConnected && state.isInternetReachable !== false);
  if (online !== currentOnline) {
    currentOnline = online;
    listeners.forEach((cb) => cb(currentOnline));
  }
  return currentOnline;
}

export function startNetworkMonitor(): () => void {
  if (unsubscribeInternal) {
    return unsubscribeInternal;
  }

  unsubscribeInternal = NetInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    if (online !== currentOnline) {
      currentOnline = online;
      listeners.forEach((cb) => cb(currentOnline));
    }
  });

  refreshNetworkState().catch(() => {
    // Keep the previous state if initial refresh fails.
  });

  return () => {
    if (unsubscribeInternal) {
      unsubscribeInternal();
      unsubscribeInternal = null;
    }
  };
}

export function onNetworkChange(cb: (online: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
