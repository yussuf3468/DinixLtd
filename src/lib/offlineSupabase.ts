import { supabase } from "./supabase";
import { offlineDB } from "./offlineDB";
import { syncManager } from "./syncManager";

export interface OfflineSupabaseOptions {
  enableOffline?: boolean;
  autoSync?: boolean;
}

/**
 * Offline-aware wrapper for Supabase operations
 * Queues operations when offline and syncs when back online
 */
export class OfflineSupabase {
  private isOnline = navigator.onLine;

  constructor() {
    // Listen for online/offline events
    window.addEventListener("online", () => {
      this.isOnline = true;
      // Auto-sync when coming back online
      syncManager.syncPendingTransactions();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  /**
   * Insert data with offline support
   * If offline, queues the operation for later sync
   */
  async insert(
    table: string,
    data: any,
    options: OfflineSupabaseOptions = { enableOffline: true }
  ) {
    try {
      if (this.isOnline) {
        // Try online insert first
        const { data: result, error } = await supabase
          .from(table)
          .insert(data)
          .select();
        if (error) throw error;
        return { data: result, error: null };
      } else if (options.enableOffline) {
        // Queue for offline sync
        const id = await offlineDB.addPendingTransaction("insert", table, data);
        return {
          data: [{ ...data, id: `pending_${id}` }],
          error: null,
          offline: true,
        };
      } else {
        throw new Error("Operation requires internet connection");
      }
    } catch (error) {
      // If online insert fails, try offline queue
      if (options.enableOffline) {
        const id = await offlineDB.addPendingTransaction("insert", table, data);
        return {
          data: [{ ...data, id: `pending_${id}` }],
          error: null,
          offline: true,
        };
      }
      return { data: null, error };
    }
  }

  /**
   * Update data with offline support
   */
  async update(
    table: string,
    data: any,
    match: Record<string, any>,
    options: OfflineSupabaseOptions = { enableOffline: true }
  ) {
    try {
      if (this.isOnline) {
        let query = supabase.from(table).update(data);

        // Apply match conditions
        Object.entries(match).forEach(([key, value]) => {
          query = query.eq(key, value) as any;
        });

        const { data: result, error } = await query.select();
        if (error) throw error;
        return { data: result, error: null };
      } else if (options.enableOffline) {
        await offlineDB.addPendingTransaction("update", table, {
          ...data,
          ...match,
        });
        return { data: [data], error: null, offline: true };
      } else {
        throw new Error("Operation requires internet connection");
      }
    } catch (error) {
      if (options.enableOffline) {
        await offlineDB.addPendingTransaction("update", table, {
          ...data,
          ...match,
        });
        return { data: [data], error: null, offline: true };
      }
      return { data: null, error };
    }
  }

  /**
   * Delete data with offline support
   */
  async delete(
    table: string,
    match: Record<string, any>,
    options: OfflineSupabaseOptions = { enableOffline: true }
  ) {
    try {
      if (this.isOnline) {
        let query = supabase.from(table).delete();

        Object.entries(match).forEach(([key, value]) => {
          query = query.eq(key, value) as any;
        });

        const { error } = await query;
        if (error) throw error;
        return { error: null };
      } else if (options.enableOffline) {
        await offlineDB.addPendingTransaction("delete", table, match);
        return { error: null, offline: true };
      } else {
        throw new Error("Operation requires internet connection");
      }
    } catch (error) {
      if (options.enableOffline) {
        await offlineDB.addPendingTransaction("delete", table, match);
        return { error: null, offline: true };
      }
      return { error };
    }
  }

  /**
   * Select/query data (read-only, uses cache when offline)
   */
  async select(table: string, options: { useCache?: boolean } = {}) {
    try {
      if (this.isOnline) {
        const { data, error } = await supabase.from(table).select();
        if (error) throw error;

        // Cache data for offline use
        if (table === "clients" && data) {
          await offlineDB.cacheClients(data);
        }

        return { data, error: null };
      } else if (options.useCache) {
        // Return cached data when offline
        if (table === "clients") {
          const cachedData = await offlineDB.getCachedClients();
          return { data: cachedData, error: null, cached: true };
        }
        throw new Error("No cached data available");
      } else {
        throw new Error("Operation requires internet connection");
      }
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Check if currently online
   */
  get online() {
    return this.isOnline;
  }
}

// Export singleton instance
export const offlineSupabase = new OfflineSupabase();
