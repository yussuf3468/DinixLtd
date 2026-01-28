# 🔧 Setup Debts & Loans Tables in Supabase

## The Issue

When you click "Add Debt" and nothing happens, it's because the `debts` and `loans` tables don't exist in your Supabase database yet.

## ✅ Solution - Run the SQL Schema

Follow these steps to create the required tables:

### Step 1: Go to Supabase Dashboard

1. Open your browser and go to: https://app.supabase.com
2. Sign in to your account
3. Select your project: **kmmolhbwmmrtwksihnrw**

### Step 2: Open SQL Editor

1. In the left sidebar, click on **"SQL Editor"**
2. Click **"New query"** button

### Step 3: Copy and Run the SQL for Debts Table

Copy this SQL and paste it into the editor, then click **RUN**:

```sql
-- =====================================================
-- DEBTS TABLE (What I owe)
-- =====================================================
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creditor_name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  amount_paid DECIMAL(12, 2) DEFAULT 0 CHECK (amount_paid >= 0),
  due_date DATE,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'cleared')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Debts policies
CREATE POLICY "Users can view own debts" ON debts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debts" ON debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debts" ON debts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts" ON debts
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_debts_user_status ON debts(user_id, status);
CREATE INDEX idx_debts_user_due_date ON debts(user_id, due_date);
```

### Step 4: Copy and Run the SQL for Loans Table

Create a **new query**, paste this SQL, and click **RUN**:

```sql
-- =====================================================
-- LOANS TABLE (What others owe me)
-- =====================================================
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debtor_name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  amount_received DECIMAL(12, 2) DEFAULT 0 CHECK (amount_received >= 0),
  due_date DATE,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'cleared')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Loans policies
CREATE POLICY "Users can view own loans" ON loans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans" ON loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans" ON loans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans" ON loans
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_loans_user_status ON loans(user_id, status);
CREATE INDEX idx_loans_user_due_date ON loans(user_id, due_date);
```

### Step 5: Verify Tables Were Created

1. In the left sidebar, click on **"Table Editor"**
2. You should now see two new tables:
   - ✅ **debts**
   - ✅ **loans**

### Step 6: Test the App

1. Go back to your KeshaTrack app: http://localhost:5174
2. Click on **"Debts"** in the navigation
3. Click **"Add Debt"** - it should now work!
4. Fill in:
   - Creditor Name: Guy1
   - Amount: 100,000
   - Click **"Add Debt"**
5. You should see it appear in the list!

## 🎯 Quick Test Scenario

After setting up, test with your real scenario:

### Add Your Debts:

1. Guy1: KES 100,000
2. Shop1: KES 20,000

### Add Your Loans:

1. Guy2: KES 67,000
2. Guy3: KES 10,000

### Check Overview:

- Total I Owe: **KES 120,000**
- Owed to Me: **KES 77,000**
- Net Position: **-KES 43,000** (you owe more than you're owed)

## 🆘 Still Having Issues?

If you get an error when clicking "Add Debt", now you'll see an alert with the actual error message that will help us fix it!

Common errors:

- **"relation 'debts' does not exist"** → Run the SQL above
- **"permission denied"** → Check RLS policies are created
- **"violates check constraint"** → Make sure amount is a positive number
