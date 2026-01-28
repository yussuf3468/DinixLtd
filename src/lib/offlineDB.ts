// IndexedDB wrapper for offline storage
const DB_NAME = "Dinix";
const DB_VERSION = 1;
const STORES = {
  PENDING_TRANSACTIONS: "pendingTransactions",
  CACHED_CLIENTS: "cachedClients",
  CACHED_TRANSACTIONS: "cachedTransactions",
  SYNC_QUEUE: "syncQueue",
};

export interface PendingTransaction {
  id: string;
  timestamp: number;
  type: "insert" | "update" | "delete";
  table: string;
  data: any;
  status: "pending" | "syncing" | "failed";
  retryCount: number;
  error?: string;
}

class OfflineDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Pending transactions store
        if (!db.objectStoreNames.contains(STORES.PENDING_TRANSACTIONS)) {
          const store = db.createObjectStore(STORES.PENDING_TRANSACTIONS, {
            keyPath: "id",
          });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Cached clients store
        if (!db.objectStoreNames.contains(STORES.CACHED_CLIENTS)) {
          db.createObjectStore(STORES.CACHED_CLIENTS, { keyPath: "id" });
        }

        // Cached transactions store
        if (!db.objectStoreNames.contains(STORES.CACHED_TRANSACTIONS)) {
          const store = db.createObjectStore(STORES.CACHED_TRANSACTIONS, {
            keyPath: "id",
          });
          store.createIndex("client_id", "client_id", { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          db.createObjectStore(STORES.SYNC_QUEUE, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      };
    });
  }

  // Add pending transaction
  async addPendingTransaction(
    type: PendingTransaction["type"],
    table: string,
    data: any,
  ): Promise<string> {
    if (!this.db) await this.init();

    const transaction: PendingTransaction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      table,
      data,
      status: "pending",
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(
        [STORES.PENDING_TRANSACTIONS],
        "readwrite",
      );
      const store = tx.objectStore(STORES.PENDING_TRANSACTIONS);
      const request = store.add(transaction);

      request.onsuccess = () => resolve(transaction.id);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all pending transactions
  async getPendingTransactions(): Promise<PendingTransaction[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(
        [STORES.PENDING_TRANSACTIONS],
        "readonly",
      );
      const store = tx.objectStore(STORES.PENDING_TRANSACTIONS);
      const index = store.index("status");
      const request = index.getAll("pending");

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Update transaction status
  async updateTransactionStatus(
    id: string,
    status: PendingTransaction["status"],
    error?: string,
  ): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(
        [STORES.PENDING_TRANSACTIONS],
        "readwrite",
      );
      const store = tx.objectStore(STORES.PENDING_TRANSACTIONS);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const transaction = getRequest.result;
        if (transaction) {
          transaction.status = status;
          if (error) transaction.error = error;
          if (status === "failed") transaction.retryCount++;

          const updateRequest = store.put(transaction);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Delete synced transaction
  async deletePendingTransaction(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(
        [STORES.PENDING_TRANSACTIONS],
        "readwrite",
      );
      const store = tx.objectStore(STORES.PENDING_TRANSACTIONS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Cache clients
  async cacheClients(clients: any[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.CACHED_CLIENTS], "readwrite");
      const store = tx.objectStore(STORES.CACHED_CLIENTS);

      // Clear existing cache
      store.clear();

      // Add all clients
      clients.forEach((client) => {
        store.put(client);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Get cached clients
  async getCachedClients(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.CACHED_CLIENTS], "readonly");
      const store = tx.objectStore(STORES.CACHED_CLIENTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get pending count
  async getPendingCount(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(
        [STORES.PENDING_TRANSACTIONS],
        "readonly",
      );
      const store = tx.objectStore(STORES.PENDING_TRANSACTIONS);
      const index = store.index("status");
      const request = index.count("pending");

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineDB = new OfflineDB();
