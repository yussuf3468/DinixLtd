-- =====================================================
-- MyFinance Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- INCOME TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'monthly', 'yearly', 'one-time')),
  category TEXT DEFAULT 'salary',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE income ENABLE ROW LEVEL SECURITY;

-- Income policies
CREATE POLICY "Users can view own income" ON income
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income" ON income
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income" ON income
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income" ON income
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_income_user_date ON income(user_id, date DESC);
CREATE INDEX idx_income_user_type ON income(user_id, type);

-- =====================================================
-- EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  is_recurring BOOLEAN DEFAULT false,
  receipt_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Expenses policies
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX idx_expenses_user_category ON expenses(user_id, category);
CREATE INDEX idx_expenses_tags ON expenses USING GIN(tags);

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
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paying', 'cleared', 'pending')),
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

-- =====================================================
-- DEBT PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

-- Debt payments policies
CREATE POLICY "Users can view own debt payments" ON debt_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debt payments" ON debt_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own debt payments" ON debt_payments
  FOR DELETE USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_debt_payments_debt ON debt_payments(debt_id, payment_date DESC);

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
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paying', 'cleared', 'pending')),
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

-- =====================================================
-- RENT SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS rent_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_amount DECIMAL(12, 2) NOT NULL CHECK (monthly_amount >= 0),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  landlord_name TEXT,
  landlord_contact TEXT,
  property_address TEXT,
  lease_start_date DATE,
  lease_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE rent_settings ENABLE ROW LEVEL SECURITY;

-- Rent settings policies
CREATE POLICY "Users can view own rent settings" ON rent_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rent settings" ON rent_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rent settings" ON rent_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rent settings" ON rent_settings
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- RENT PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS rent_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  month TEXT NOT NULL, -- Format: YYYY-MM
  payment_method TEXT DEFAULT 'bank_transfer',
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

-- Rent payments policies
CREATE POLICY "Users can view own rent payments" ON rent_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rent payments" ON rent_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rent payments" ON rent_payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rent payments" ON rent_payments
  FOR DELETE USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_rent_payments_user_month ON rent_payments(user_id, month DESC);

-- =====================================================
-- SAVINGS GOALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12, 2) DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE,
  category TEXT DEFAULT 'general',
  description TEXT,
  is_achieved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- Savings goals policies
CREATE POLICY "Users can view own savings goals" ON savings_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings goals" ON savings_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings goals" ON savings_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings goals" ON savings_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_savings_goals_user ON savings_goals(user_id, is_achieved);

-- =====================================================
-- BUDGETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold BETWEEN 0 AND 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, period, start_date)
);

-- Enable Row Level Security
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Budgets policies
CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_budgets_user_period ON budgets(user_id, period, start_date);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_income_updated_at BEFORE UPDATE ON income
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rent_settings_updated_at BEFORE UPDATE ON rent_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update debt amount_paid when payment is made
CREATE OR REPLACE FUNCTION update_debt_amount_paid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE debts
  SET amount_paid = amount_paid + NEW.amount,
      status = CASE
        WHEN amount_paid + NEW.amount >= amount THEN 'cleared'
        WHEN amount_paid + NEW.amount > 0 THEN 'paying'
        ELSE status
      END
  WHERE id = NEW.debt_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_debt_on_payment AFTER INSERT ON debt_payments
  FOR EACH ROW EXECUTE FUNCTION update_debt_amount_paid();

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Monthly income summary view
CREATE OR REPLACE VIEW monthly_income_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', date) AS month,
  SUM(amount) AS total_income,
  COUNT(*) AS transaction_count,
  AVG(amount) AS average_income
FROM income
GROUP BY user_id, DATE_TRUNC('month', date);

-- Monthly expenses summary view
CREATE OR REPLACE VIEW monthly_expenses_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', date) AS month,
  category,
  SUM(amount) AS total_expenses,
  COUNT(*) AS transaction_count,
  AVG(amount) AS average_expense
FROM expenses
GROUP BY user_id, DATE_TRUNC('month', date), category;

-- User financial snapshot view
CREATE OR REPLACE VIEW user_financial_snapshot AS
SELECT
  u.id AS user_id,
  u.email,
  COALESCE(income_total.total, 0) AS total_income,
  COALESCE(expenses_total.total, 0) AS total_expenses,
  COALESCE(income_total.total, 0) - COALESCE(expenses_total.total, 0) AS net_balance,
  COALESCE(debt_total.total, 0) AS total_debt,
  COALESCE(debt_total.paid, 0) AS total_debt_paid
FROM auth.users u
LEFT JOIN (
  SELECT user_id, SUM(amount) AS total
  FROM income
  WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY user_id
) income_total ON u.id = income_total.user_id
LEFT JOIN (
  SELECT user_id, SUM(amount) AS total
  FROM expenses
  WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY user_id
) expenses_total ON u.id = expenses_total.user_id
LEFT JOIN (
  SELECT user_id, SUM(amount) AS total, SUM(amount_paid) AS paid
  FROM debts
  WHERE status != 'cleared'
  GROUP BY user_id
) debt_total ON u.id = debt_total.user_id;

-- =====================================================
-- SAMPLE DATA (Optional - Remove in production)
-- =====================================================
-- Uncomment to insert sample categories
-- INSERT INTO expense_categories (name, icon, color) VALUES
--   ('Food & Dining', 'utensils', 'emerald'),
--   ('Transportation', 'car', 'blue'),
--   ('Shopping', 'shopping-bag', 'purple'),
--   ('Entertainment', 'film', 'pink'),
--   ('Healthcare', 'heart', 'red'),
--   ('Bills & Utilities', 'zap', 'orange'),
--   ('Education', 'book', 'indigo'),
--   ('Other', 'tag', 'gray');
