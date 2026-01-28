# 🔌 Offline Integration Guide

## For Developers: How to Use Offline Features

This guide shows you how to integrate offline capabilities into other components.

---

## 📦 Import the Offline Tools

```typescript
// At top of your component
import { offlineSupabase } from "../lib/offlineSupabase";
import { syncManager } from "../lib/syncManager";
import { offlineDB } from "../lib/offlineDB";
import { useToast } from "../contexts/ToastContext";
```

---

## 🔨 Basic Usage Patterns

### **1. Insert Data with Offline Support**

```typescript
// OLD WAY (no offline support):
const { error } = await supabase.from("clients").insert(data);
if (error) throw error;

// NEW WAY (offline support):
const result = await offlineSupabase.insert("clients", data);

if (result.error) {
  toast.error(`Failed: ${result.error.message}`);
} else if (result.offline) {
  toast.success("Saved offline, will sync when online");
} else {
  toast.success("Saved successfully!");
}
```

### **2. Update Data**

```typescript
// Update with offline queue
const result = await offlineSupabase.update(
  "clients", // table
  { name: "New Name" }, // data to update
  { id: clientId } // match condition
);

if (result.offline) {
  toast.info("Update queued for sync");
}
```

### **3. Delete Data**

```typescript
// Delete with offline queue
const result = await offlineSupabase.delete(
  "clients", // table
  { id: clientId } // match condition
);

if (!result.error) {
  toast.success(result.offline ? "Queued for deletion" : "Deleted!");
}
```

### **4. Read Data (with Cache)**

```typescript
// Try online first, fallback to cache
const { data, cached, error } = await offlineSupabase.select("clients", {
  useCache: true,
});

if (cached) {
  toast.info("Showing cached data (offline)");
}
```

---

## 🎯 Complete Component Example

```typescript
import { useState, useEffect } from "react";
import { offlineSupabase } from "../lib/offlineSupabase";
import { useToast } from "../contexts/ToastContext";

export default function MyComponent() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data with cache fallback
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data, cached, error } = await offlineSupabase.select("clients", {
        useCache: true,
      });

      if (error) throw error;

      setData(data);

      if (cached) {
        toast.info("Viewing offline data");
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  // Add new item
  async function handleAdd(formData) {
    try {
      toast.info("Saving...");

      const result = await offlineSupabase.insert("clients", formData);

      if (result.error) throw result.error;

      loadData(); // Refresh list

      if (result.offline) {
        toast.success("Saved offline, will sync later");
      } else {
        toast.success("Saved successfully!");
      }
    } catch (error) {
      toast.error(`Failed: ${error.message}`);
    }
  }

  // Update item
  async function handleUpdate(id, updates) {
    try {
      const result = await offlineSupabase.update("clients", updates, { id });

      if (result.error) throw result.error;

      loadData();
      toast.success(result.offline ? "Queued for sync" : "Updated!");
    } catch (error) {
      toast.error(`Failed: ${error.message}`);
    }
  }

  // Delete item
  async function handleDelete(id) {
    if (!confirm("Delete this item?")) return;

    try {
      const result = await offlineSupabase.delete("clients", { id });

      if (result.error) throw result.error;

      loadData();
      toast.success(result.offline ? "Queued for deletion" : "Deleted!");
    } catch (error) {
      toast.error(`Failed: ${error.message}`);
    }
  }

  return <div>{/* Your component UI */}</div>;
}
```

---

## 🔄 Manual Sync Integration

### **Add Sync Button to Your Component**

```typescript
import { syncManager } from "../lib/syncManager";

function MyComponent() {
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Load pending count
    syncManager.getPendingCount().then(setPendingCount);

    // Listen for changes
    const unsubscribe = syncManager.onSyncStatusChange((status) => {
      setSyncing(status.type === "syncing");
      setPendingCount(status.pending);
    });

    return unsubscribe;
  }, []);

  async function handleSync() {
    const result = await syncManager.syncPendingTransactions();

    if (result.success) {
      toast.success(`Synced ${result.synced} items!`);
    } else {
      toast.error(result.message);
    }
  }

  return (
    <button onClick={handleSync} disabled={syncing}>
      {syncing ? "Syncing..." : `Sync (${pendingCount})`}
    </button>
  );
}
```

---

## 🎨 UI Patterns

### **Pattern 1: Loading State**

```typescript
if (loading) {
  return <div>Loading...</div>;
}

if (offline && !data.length) {
  return <div>No cached data available</div>;
}
```

### **Pattern 2: Optimistic Updates**

```typescript
async function handleLike(id) {
  // Update UI immediately
  setItems(
    items.map((item) => (item.id === id ? { ...item, liked: true } : item))
  );

  // Queue backend update
  await offlineSupabase.update("items", { liked: true }, { id });
}
```

### **Pattern 3: Status Indicators**

```typescript
function ItemCard({ item }) {
  const isPending = item.id.startsWith("pending_");

  return (
    <div className={isPending ? "opacity-60" : ""}>
      {item.name}
      {isPending && <Badge>Pending Sync</Badge>}
    </div>
  );
}
```

---

## 🚦 Error Handling Best Practices

### **Pattern 1: Detailed Errors**

```typescript
try {
  const result = await offlineSupabase.insert("clients", data);
  if (result.error) throw result.error;
} catch (error) {
  // Show specific error message
  toast.error(
    `Failed to save: ${
      error instanceof Error ? error.message : "Unknown error"
    }`
  );

  // Log for debugging
  console.error("Save error:", error);
}
```

### **Pattern 2: Retry Logic**

```typescript
async function saveWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await offlineSupabase.insert("clients", data);
      if (!result.error) return result;

      if (i < maxRetries - 1) {
        toast.info(`Retrying... (${i + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### **Pattern 3: Graceful Degradation**

```typescript
async function loadData() {
  try {
    // Try online first
    const { data } = await offlineSupabase.select("clients");
    return data;
  } catch (error) {
    // Fall back to cache
    toast.warning("Using cached data");
    const cached = await offlineDB.getCachedClients();
    return cached;
  }
}
```

---

## 📊 Monitoring Sync Status

### **Global Sync Status Component**

```typescript
function SyncStatusBar() {
  const [status, setStatus] = useState({ type: "idle", pending: 0 });

  useEffect(() => {
    return syncManager.onSyncStatusChange(setStatus);
  }, []);

  if (status.type === "idle" && status.pending === 0) return null;

  return (
    <div className="sync-status-bar">
      {status.type === "syncing" && "⏳ Syncing..."}
      {status.pending > 0 && `📤 ${status.pending} pending`}
      {status.type === "error" && "❌ Sync failed"}
    </div>
  );
}
```

---

## 🔐 Security Considerations

### **Authentication Still Required**

```typescript
// Offline operations still respect auth
const result = await offlineSupabase.insert("clients", {
  user_id: user.id, // ✅ Always include user_id
  ...data,
});

// RLS policies still apply during sync
// Unauthenticated operations will fail sync
```

### **Data Validation**

```typescript
// Validate before queuing
function validateData(data) {
  if (!data.name) throw new Error("Name required");
  if (!data.email) throw new Error("Email required");
  return true;
}

try {
  validateData(formData);
  await offlineSupabase.insert("clients", formData);
} catch (error) {
  toast.error(error.message);
}
```

---

## 🧪 Testing Offline Features

### **Simulate Offline**

```typescript
// In browser DevTools Console:
// 1. Open Network tab
// 2. Select "Offline" from throttling dropdown

// Or programmatically:
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.controller?.postMessage({
    type: "SIMULATE_OFFLINE",
  });
}
```

### **Test Sync**

```typescript
// Check pending items
const pending = await offlineDB.getPendingTransactions();
console.log("Pending:", pending);

// Force sync
const result = await syncManager.syncPendingTransactions();
console.log("Sync result:", result);

// Check sync status
syncManager.onSyncStatusChange(console.log);
```

---

## 📝 Migration Checklist

To migrate an existing component:

- [ ] Import `offlineSupabase` instead of `supabase`
- [ ] Replace `supabase.from().insert()` with `offlineSupabase.insert()`
- [ ] Replace `supabase.from().update()` with `offlineSupabase.update()`
- [ ] Replace `supabase.from().delete()` with `offlineSupabase.delete()`
- [ ] Add `useCache: true` to `.select()` calls
- [ ] Handle `result.offline` flag in responses
- [ ] Update toast messages for offline scenarios
- [ ] Add loading states during operations
- [ ] Test offline functionality

---

## 🎓 Learn More

- **Full Documentation**: [OFFLINE_PWA_IMPLEMENTATION.md](./OFFLINE_PWA_IMPLEMENTATION.md)
- **Quick Start**: [OFFLINE_QUICK_START.md](./OFFLINE_QUICK_START.md)
- **Service Worker**: [public/sw.js](../public/sw.js)
- **Offline DB**: [src/lib/offlineDB.ts](../src/lib/offlineDB.ts)
- **Sync Manager**: [src/lib/syncManager.ts](../src/lib/syncManager.ts)

---

**Happy Coding! 🚀**
