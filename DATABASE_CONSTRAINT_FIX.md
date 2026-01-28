# 🔧 Database Constraint Fix - Status Values Migration

## Problem

The application was experiencing a database constraint violation error:

```
new row for relation "debts" violates check constraint "debts_status_check"
```

## Root Cause

**Mismatch between database constraints and application code:**

- **Database constraint** (OLD): `CHECK (status IN ('unpaid', 'partially_paid', 'cleared'))`
- **Frontend code** (NEW): Uses status values `('active', 'paying', 'cleared', 'pending')`

When the frontend tried to insert a debt with `status: 'active'`, the database rejected it because 'active' was not in the allowed constraint values.

## Solution Applied

### 1. Created Migration File

**File:** `supabase/migrations/20251206000001_update_debt_status_constraint.sql`

This migration:

- ✅ Drops the old `debts_status_check` constraint
- ✅ Adds new constraint with correct values: `('active', 'paying', 'cleared', 'pending')`
- ✅ Updates default value from `'unpaid'` to `'active'`
- ✅ Migrates existing data (if any): `'unpaid'` → `'active'`, `'partially_paid'` → `'paying'`
- ✅ Does the same for the `loans` table

### 2. Updated Schema Files

Updated the following files to reflect correct constraints:

- `supabase/schema.sql` - Updated debts and loans table definitions
- `supabase/migrations/20251205202034_create_finance_tracker_schema.sql` - Updated initial migration

### 3. Frontend Code Status

✅ Frontend code already correctly uses: `'active'`, `'paying'`, `'cleared'`, `'pending'`
✅ Validation helper function exists: `validateStatus()`
✅ All inserts/updates use validated status values

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**

   - Go to https://app.supabase.com
   - Select your project: `kmmolhbwmmrtwksihnrw`

2. **Open SQL Editor**

   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Run the Migration**

   - Open the file: `supabase/migrations/20251206000001_update_debt_status_constraint.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **"Run"** button

4. **Verify Success**
   - You should see "Success. No rows returned"
   - The migration will execute all statements in order

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Navigate to your project directory
cd D:\Desktop\MyFinance

# Link your project (if not already linked)
supabase link --project-ref kmmolhbwmmrtwksihnrw

# Apply the migration
supabase db push

# Or apply specific migration
supabase migration up
```

## Verification Steps

After applying the migration:

1. **Test Adding a Debt**

   - Open your app: http://localhost:5174
   - Go to "Debts & Loans" section
   - Click "Add Debt"
   - Fill in: Creditor name, Amount, Due date
   - Click "Add Debt"
   - ✅ Should succeed without errors!

2. **Test Making a Payment**

   - Click "Make Payment" on an existing debt
   - Enter payment amount
   - ✅ Should update status to 'paying' without errors!

3. **Check Database Directly**

   ```sql
   -- In Supabase SQL Editor, run:
   SELECT constraint_name, check_clause
   FROM information_schema.check_constraints
   WHERE constraint_name = 'debts_status_check';

   -- Should show: status IN ('active', 'paying', 'cleared', 'pending')
   ```

## Status Values Reference

### Valid Status Values (After Migration)

| Status    | Meaning                          | When Used                  |
| --------- | -------------------------------- | -------------------------- |
| `active`  | Debt/Loan exists, no payment yet | On creation (default)      |
| `paying`  | Partial payment received         | After first payment        |
| `cleared` | Fully paid off                   | When amount_paid >= amount |
| `pending` | Future/scheduled debt/loan       | For planned debts/loans    |

### Old Values (Before Migration) - NO LONGER VALID

| ~~Old Status~~       | Mapped To |
| -------------------- | --------- |
| ~~`unpaid`~~         | `active`  |
| ~~`partially_paid`~~ | `paying`  |

## Files Modified in This Fix

1. ✅ **supabase/migrations/20251206000001_update_debt_status_constraint.sql** (NEW)

   - Migration to update constraints

2. ✅ **supabase/schema.sql**

   - Line 119: Updated debts table constraint
   - Line 184: Updated loans table constraint

3. ✅ **supabase/migrations/20251205202034_create_finance_tracker_schema.sql**

   - Line 157: Updated initial debts table creation

4. ✅ **src/components/Debts.tsx**
   - Already correct (no changes needed)
   - Uses VALID_STATUSES constant
   - Has validateStatus() helper

## What This Migration Does NOT Do

- ❌ Does NOT drop the debts or loans tables
- ❌ Does NOT rename any columns
- ❌ Does NOT delete any existing data
- ❌ Does NOT change table structure (only constraint)
- ✅ ONLY updates the constraint and migrates status values

## Rollback (If Needed)

If you need to rollback (not recommended):

```sql
-- Revert debts table
ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_status_check;
ALTER TABLE debts ADD CONSTRAINT debts_status_check
  CHECK (status IN ('unpaid', 'partially_paid', 'cleared'));
ALTER TABLE debts ALTER COLUMN status SET DEFAULT 'unpaid';

-- Revert loans table
ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_status_check;
ALTER TABLE loans ADD CONSTRAINT loans_status_check
  CHECK (status IN ('unpaid', 'partially_paid', 'cleared'));
ALTER TABLE loans ALTER COLUMN status SET DEFAULT 'unpaid';

-- Revert data
UPDATE debts SET status = 'unpaid' WHERE status = 'active';
UPDATE debts SET status = 'partially_paid' WHERE status = 'paying';
UPDATE loans SET status = 'unpaid' WHERE status = 'active';
UPDATE loans SET status = 'partially_paid' WHERE status = 'paying';
```

## Next Steps

1. ✅ Apply the migration in Supabase Dashboard (see instructions above)
2. ✅ Test adding a new debt
3. ✅ Test recording a payment
4. ✅ Verify no more constraint errors
5. ✅ Continue using your app normally!

## Support

If you encounter any issues:

- Check the Supabase logs in Dashboard → Logs
- Verify the constraint was updated: Run the verification SQL above
- Ensure the migration completed without errors

---

**Status:** Ready to apply
**Impact:** Zero downtime, no data loss
**Risk Level:** Low (only updating constraint, not structure)
