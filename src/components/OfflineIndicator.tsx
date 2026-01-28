import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { syncManager, SyncStatus } from "../lib/syncManager";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    type: "idle",
    pending: 0,
  });
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  useEffect(() => {
    // Load initial pending count
    syncManager.getPendingCount().then((count) => {
      setSyncStatus({ type: "idle", pending: count });
    });

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncManager.syncPendingTransactions().then((result) => {
        if (result.success && result.synced && result.synced > 0) {
          setShowSyncSuccess(true);
          setTimeout(() => setShowSyncSuccess(false), 3000);
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Subscribe to sync status updates
    const unsubscribe = syncManager.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    const result = await syncManager.syncPendingTransactions();
    if (result.success && result.synced && result.synced > 0) {
      setShowSyncSuccess(true);
      setTimeout(() => setShowSyncSuccess(false), 3000);
    }
  };

  if (isOnline && syncStatus.pending === 0 && syncStatus.type === "idle") {
    return null; // Don't show anything when online and no pending items
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 mb-2">
          <WifiOff className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-800">Offline Mode</p>
            <p className="text-xs text-red-600">
              Changes will sync when reconnected
            </p>
          </div>
        </div>
      )}

      {/* Pending sync indicator */}
      {syncStatus.pending > 0 && syncStatus.type !== "syncing" && (
        <button
          onClick={handleManualSync}
          disabled={!isOnline}
          className={`bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 mb-2 transition-all hover:shadow-xl ${
            !isOnline ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-100"
          }`}
        >
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div className="text-left">
            <p className="text-sm font-semibold text-amber-800">
              {syncStatus.pending} Pending Change
              {syncStatus.pending !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-amber-600">
              {isOnline ? "Click to sync now" : "Waiting for connection"}
            </p>
          </div>
          {isOnline && <RefreshCw className="w-4 h-4 text-amber-600 ml-2" />}
        </button>
      )}

      {/* Syncing indicator */}
      {syncStatus.type === "syncing" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 mb-2">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Syncing...</p>
            <p className="text-xs text-blue-600">
              {syncStatus.pending > 0
                ? `${syncStatus.pending} remaining`
                : "Almost done"}
            </p>
          </div>
        </div>
      )}

      {/* Success indicator */}
      {showSyncSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 animate-slide-in-right">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Synced Successfully!
            </p>
            <p className="text-xs text-emerald-600">All changes saved</p>
          </div>
        </div>
      )}

      {/* Error indicator */}
      {syncStatus.type === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-800">Sync Failed</p>
            <p className="text-xs text-red-600">Will retry automatically</p>
          </div>
        </div>
      )}
    </div>
  );
}
