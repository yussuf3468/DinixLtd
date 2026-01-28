# 🎨 Quick Design Update Reference

## Copy-Paste Snippets for Enhancing Components

### 1. Import Statements (Add to top of file)

```typescript
import Modal from "./Modal";
import { DollarSign, Calendar, Icon } from "lucide-react";
```

### 2. Replace useState for Form Display

```typescript
// OLD:
const [showForm, setShowForm] = useState(false);

// NEW:
const [showModal, setShowModal] = useState(false);
```

### 3. Replace Form Submit Close

```typescript
// In handleSubmit, replace:
setShowForm(false);

// With:
setShowModal(false);
```

### 4. Enhanced Loading State

```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading data...</p>
      </div>
    </div>
  );
}
```

### 5. Page Header Pattern

```tsx
<div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
        <IconComponent className="w-7 h-7 sm:w-8 sm:h-8 text-primary-600" />
        Page Title
      </h1>
      <p className="text-sm sm:text-base text-gray-600 mt-1">Page description</p>
    </div>
    <button
      onClick={() => setShowModal(true)}
      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-600 text-white rounded-xl hover:from-primary-600 hover:to-secondary-700 transition-all shadow-lg hover:shadow-xl active:scale-95 font-medium"
    >
      <Plus className="w-5 h-5" />
      <span>Add Item</span>
    </button>
  </div>
```

### 6. Summary Card with Gradient

```tsx
<div className="bg-gradient-to-br from-primary-500 to-secondary-600 rounded-2xl shadow-xl p-6 sm:p-8 text-white">
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
        <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
      </div>
      <div>
        <p className="text-sm sm:text-base text-primary-50 font-medium">
          Label
        </p>
        <p className="text-xs text-primary-100">Subtitle</p>
      </div>
    </div>
  </div>
  <p className="text-3xl sm:text-5xl font-bold mb-2">${total.toFixed(2)}</p>
  <div className="flex items-center gap-2 text-sm text-primary-100">
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-primary-200 animate-pulse"></div>
      <span>{count} items</span>
    </div>
  </div>
</div>
```

### 7. Empty State

```tsx
<div className="p-8 sm:p-12 text-center">
  <div className="bg-gray-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4">
    <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
  </div>
  <p className="text-gray-500 font-medium mb-2">No items yet</p>
  <p className="text-sm text-gray-400">Add your first item to get started!</p>
</div>
```

### 8. List Item Card

```tsx
<div className="p-4 hover:bg-gradient-to-r hover:from-primary-50 hover:to-secondary-50 transition-all group">
  <div className="flex items-start gap-3">
    <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-2.5 rounded-xl group-hover:shadow-md transition-shadow shrink-0">
      <IconComponent className="w-5 h-5 text-gray-600" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-bold text-lg text-gray-800 mb-1">
            ${amount.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mb-1">{description}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-md font-medium">
              {category}
            </span>
            <span className="text-gray-500">
              {new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
        <button
          onClick={() => handleDelete(id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
          aria-label="Delete item"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</div>
```

### 9. Modal Form Structure

```tsx
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Add New Item"
  size="md"
>
  <form onSubmit={handleSubmit} className="space-y-5">
    {/* Amount Field */}
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Amount ($)
      </label>
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
          placeholder="0.00"
        />
      </div>
    </div>

    {/* Description Field */}
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Description
      </label>
      <input
        type="text"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        required
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
        placeholder="Enter description"
      />
    </div>

    {/* Date Field */}
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Date
      </label>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
        />
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-3 pt-2">
      <button
        type="submit"
        className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-600 text-white py-3 rounded-xl font-semibold hover:from-primary-600 hover:to-secondary-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
      >
        Add Item
      </button>
      <button
        type="button"
        onClick={() => setShowModal(false)}
        className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold active:scale-95"
      >
        Cancel
      </button>
    </div>
  </form>
</Modal>
```

### 10. Card Container

```tsx
<div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
  <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
    <h2 className="text-lg sm:text-xl font-bold text-gray-800">
      Section Title
    </h2>
    <p className="text-xs sm:text-sm text-gray-600 mt-1">Section description</p>
  </div>
  <div className="divide-y divide-gray-100">{/* Content */}</div>
</div>
```

## Color Palettes by Component

### Income (Emerald/Teal)

- `from-emerald-500 to-teal-600`
- `hover:from-emerald-600 hover:to-teal-700`
- `bg-emerald-100 text-emerald-700`
- `focus:ring-emerald-500`

### Expenses (Red/Pink)

- `from-red-500 to-pink-600`
- `hover:from-red-600 hover:to-pink-700`
- `bg-red-100 text-red-700`
- `focus:ring-red-500`

### Debts (Orange/Red)

- `from-orange-500 to-red-600`
- `hover:from-orange-600 hover:to-red-700`
- `bg-orange-100 text-orange-700`
- `focus:ring-orange-500`

### Rent (Blue/Indigo)

- `from-blue-500 to-indigo-600`
- `hover:from-blue-600 hover:to-indigo-700`
- `bg-blue-100 text-blue-700`
- `focus:ring-blue-500`

### Reports (Purple/Pink)

- `from-purple-500 to-pink-600`
- `hover:from-purple-600 hover:to-pink-700`
- `bg-purple-100 text-purple-700`
- `focus:ring-purple-500`

### Dashboard (Multi-color)

- Use different colors for each metric card
- Income: emerald/teal
- Expenses: red/pink
- Balance: blue/cyan
- Debts: orange/amber

## Quick Find & Replace

1. **Show Form → Show Modal**

   - Find: `showForm`
   - Replace: `showModal`

2. **Old Button Style**

   - Find: `className="...px-4 py-2...rounded-lg..."`
   - Replace: `className="...px-4 sm:px-6 py-3...rounded-xl...active:scale-95..."`

3. **Old Card Style**

   - Find: `rounded-xl shadow-lg`
   - Replace: `rounded-2xl shadow-lg`

4. **Old Input Style**
   - Find: `border border-gray-300 rounded-lg`
   - Replace: `border-2 border-gray-200 rounded-xl`

## Testing Checklist

- [ ] Mobile view (< 640px)
- [ ] Tablet view (640px - 1024px)
- [ ] Desktop view (> 1024px)
- [ ] Modal opens and closes
- [ ] Form validation works
- [ ] Data loads correctly
- [ ] CRUD operations work
- [ ] Loading states display
- [ ] Empty states display
- [ ] Animations are smooth
- [ ] Touch targets are 44px+
- [ ] Colors are accessible (WCAG AA)

---

**Pro Tip**: Open the enhanced `Income.tsx` component as reference while updating other components!
