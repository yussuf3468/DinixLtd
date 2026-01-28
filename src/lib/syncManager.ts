import { supabase } from "./supabase";
import { offlineDB, PendingTransaction } from "./offlineDB";

class SyncManager {
  private isSyncing = false;
  private syncCallbacks: Array<(status: SyncStatus) => void> = [];

  async syncPendingTransactions(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, message: "Sync already in progress" };
    }

    this.isSyncing = true;
    this.notifyCallbacks({ type: "syncing", pending: 0 });

    try {
      const pending = await offlineDB.getPendingTransactions();

      if (pending.length === 0) {
        this.isSyncing = false;
        this.notifyCallbacks({ type: "idle", pending: 0 });
        return { success: true, synced: 0, failed: 0 };
      }

      let synced = 0;
      let failed = 0;

      for (const transaction of pending) {
        try {
          await this.syncTransaction(transaction);
          await offlineDB.deletePendingTransaction(transaction.id);
          synced++;
        } catch (error) {
          console.error("Sync failed:", error);
          await offlineDB.updateTransactionStatus(
            transaction.id,
            "failed",
            error instanceof Error ? error.message : "Unknown error"
          );
          failed++;
        }

        this.notifyCallbacks({
          type: "syncing",
          pending: pending.length - synced - failed,
        });
      }

      this.isSyncing = false;
      this.notifyCallbacks({ type: "idle", pending: 0 });

      return {
        success: true,
        synced,
        failed,
        message: `Synced ${synced} transactions${
          failed > 0 ? `, ${failed} failed` : ""
        }`,
      };
    } catch (error) {
      this.isSyncing = false;
      this.notifyCallbacks({ type: "error", pending: 0 });
      return {
        success: false,
        message: error instanceof Error ? error.message : "Sync failed",
      };
    }
  }

  private async syncTransaction(
    transaction: PendingTransaction
  ): Promise<void> {
    switch (transaction.type) {
      case "insert":
        const { error: insertError } = await supabase
          .from(transaction.table)
          .insert(transaction.data);
        if (insertError) throw insertError;
        break;

      case "update":
        const { error: updateError } = await supabase
          .from(transaction.table)
          .update(transaction.data)
          .eq("id", transaction.data.id);
        if (updateError) throw updateError;
        break;

      case "delete":
        const { error: deleteError } = await supabase
          .from(transaction.table)
          .delete()
          .eq("id", transaction.data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncCallbacks.push(callback);
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter((cb) => cb !== callback);
    };
  }

  private notifyCallbacks(status: SyncStatus): void {
    this.syncCallbacks.forEach((callback) => callback(status));
  }

  async getPendingCount(): Promise<number> {
    return offlineDB.getPendingCount();
  }
}

export interface SyncStatus {
  type: "idle" | "syncing" | "error";
  pending: number;
}

export interface SyncResult {
  success: boolean;
  synced?: number;
  failed?: number;
  message?: string;
}

export const syncManager = new SyncManager();
