# 🚨 URGENT: Fix Your Supabase Database Constraint NOW

## The Problem
Your Supabase database still has the **OLD constraint** that only allows:
- `'unpaid'` ❌
- `'partially_paid'` ❌  
- `'cleared'` ✅

But your app is now sending:
- `'active'` ✅
- `'paying'` ✅
- `'cleared'` ✅
- `'pending'` ✅

**The app is temporarily fixed** by explicitly sending `status: 'active'`, but you **MUST run the migration** to permanently fix the database.

---

## ⚡ Quick Fix (Run This Now!)

### Step 1: Go to Supabase Dashboard
1. Open: https://app.supabase.com
2. Select your project: **kmmolhbwmmrtwksihnrw**
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Copy and Run This SQL

```sql
-- Fix debts table constraint
ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_status_check;
ALTER TABLE debts ADD CONSTRAINT debts_status_check 
  CHECK (status IN ('active', 'paying', 'cleared', 'pending'));
ALTER TABLE debts ALTER COLUMN status SET DEFAULT 'active';

-- Fix loans table constraint  
ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_status_check;
ALTER TABLE loans ADD CONSTRAINT loans_status_check 
  CHECK (status IN ('active', 'paying', 'cleared', 'pending'));
ALTER TABLE loans ALTER COLUMN status SET DEFAULT 'active';

-- Update any existing 'unpaid' records to 'active'
UPDATE debts SET status = 'active' WHERE status = 'unpaid';
UPDATE loans SET status = 'active' WHERE status = 'unpaid';

-- Update any existing 'partially_paid' records to 'paying'
UPDATE debts SET status = 'paying' WHERE status = 'partially_paid';
UPDATE loans SET status = 'paying' WHERE status = 'partially_paid';
```

### Step 3: Click **RUN** (or press F5)

You should see:
```
Success. No rows returned
```

### Step 4: Verify It Worked

Run this query to check:
```sql
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name IN ('debts_status_check', 'loans_status_check');
```

You should see the new constraint with `('active', 'paying', 'cleared', 'pending')`.

---

## ✅ After Running Migration

1. Try adding a debt in your app
2. It should now work without errors!
3. Status badges will show: **Active**, **Paying**, **Cleared**

---

## 📝 What Changed

### Before:
- Database DEFAULT: `'unpaid'`
- Database CHECK: `IN ('unpaid', 'partially_paid', 'cleared')`
- App sending: `'active'` ❌ **REJECTED BY DATABASE**

### After:
- Database DEFAULT: `'active'` ✅
- Database CHECK: `IN ('active', 'paying', 'cleared', 'pending')` ✅
- App sending: `'active'` ✅ **ACCEPTED**

---

## 🔍 Troubleshooting

### Error: "constraint already exists"
The constraint was already updated. You're good to go!

### Error: "permission denied"
Make sure you're logged in as the database owner in Supabase.

### Still getting constraint errors?
1. Check the exact error message
2. Run the verification query (Step 4)
3. Make sure you selected the correct project in Supabase

---

## 📂 Migration Files

The migration is also saved in:
- `supabase/migrations/20251206000001_update_debt_status_constraint.sql`

You can apply it via Supabase CLI:
```bash
supabase db push
```

---

**Don't skip this!** Your app will continue to have issues until the database is updated.
