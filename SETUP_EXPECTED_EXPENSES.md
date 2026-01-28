# Setup Expected Expenses Feature

## Run This SQL in Supabase

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Create expected_expenses table
CREATE TABLE IF NOT EXISTS expected_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tuition', 'rent', 'utilities', 'insurance', 'subscription', 'loan_payment', 'tax', 'medical', 'other')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE expected_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for expected_expenses
CREATE POLICY "Users can view own expected expenses" ON expected_expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expected expenses" ON expected_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expected expenses" ON expected_expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expected expenses" ON expected_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_expected_expenses_user_id ON expected_expenses(user_id);
CREATE INDEX idx_expected_expenses_due_date ON expected_expenses(due_date);
CREATE INDEX idx_expected_expenses_status ON expected_expenses(status);
```

5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

## Done!

Now rebuild and the Expected Expenses page will work:

```powershell
npm run build
git add .
git commit -m "Add Expected Expenses feature for tracking upcoming bills"
git push
```

Clear your iPhone PWA cache to see the new "Expected" tab in navigation.
