-- =====================================================
-- CLIENT MANAGEMENT SYSTEM - DATABASE SCHEMA V2
-- =====================================================
-- Migration: Add Debts & Staff Tracking
-- Updated: December 16, 2025
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STAFF TABLE (For tracking who makes updates)
-- =====================================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff', 'accountant')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their staff" ON staff FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_staff_user_id ON staff(user_id);

-- =====================================================
-- CLIENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_code TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  business_name TEXT,
  tax_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'archived')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES staff(id),
  updated_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_transaction_date DATE
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_client_code ON clients(client_code);
CREATE INDEX idx_clients_status ON clients(user_id, status);

-- =====================================================
-- CLIENT DEBTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS client_debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KES' CHECK (currency IN ('KES', 'USD')),
  amount_paid DECIMAL(15, 2) DEFAULT 0 CHECK (amount_paid >= 0),
  balance DECIMAL(15, 2) GENERATED ALWAYS AS (amount - amount_paid) STORED,
  description TEXT NOT NULL,
  reference_number TEXT,
  debt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'paid', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  payment_plan TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  last_reminder_date DATE,
  created_by UUID REFERENCES staff(id),
  updated_by UUID REFERENCES staff(id),
  notes TEXT,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE client_debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own client debts" ON client_debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own client debts" ON client_debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own client debts" ON client_debts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own client debts" ON client_debts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_debts_user_id ON client_debts(user_id);
CREATE INDEX idx_debts_client_id ON client_debts(client_id);
CREATE INDEX idx_debts_due_date ON client_debts(user_id, due_date);
CREATE INDEX idx_debts_status ON client_debts(user_id, status);

-- =====================================================
-- DEBT PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id UUID NOT NULL REFERENCES client_debts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'mpesa', 'bank_transfer', 'cheque', 'card', 'other')),
  reference_number TEXT,
  receipt_number TEXT,
  recorded_by UUID REFERENCES staff(id),
  notes TEXT,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own debt payments" ON debt_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own debt payments" ON debt_payments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX idx_debt_payments_user_id ON debt_payments(user_id);

-- =====================================================
-- CLIENT TRANSACTIONS - KES
-- =====================================================
CREATE TABLE IF NOT EXISTS client_transactions_kes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debit DECIMAL(15, 2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15, 2) DEFAULT 0 CHECK (credit >= 0),
  description TEXT NOT NULL,
  reference_number TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash', 'mpesa', 'bank_transfer', 'cheque', 'card', 'other')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES staff(id),
  notes TEXT,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE client_transactions_kes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own KES transactions" ON client_transactions_kes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own KES transactions" ON client_transactions_kes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own KES transactions" ON client_transactions_kes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_trans_kes_client_id ON client_transactions_kes(client_id);
CREATE INDEX idx_trans_kes_user_id ON client_transactions_kes(user_id);
CREATE INDEX idx_trans_kes_date ON client_transactions_kes(transaction_date DESC);

-- =====================================================
-- CLIENT TRANSACTIONS - USD
-- =====================================================
CREATE TABLE IF NOT EXISTS client_transactions_usd (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debit DECIMAL(15, 2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15, 2) DEFAULT 0 CHECK (credit >= 0),
  description TEXT NOT NULL,
  reference_number TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash', 'mpesa', 'bank_transfer', 'cheque', 'card', 'other')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES staff(id),
  notes TEXT,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE client_transactions_usd ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own USD transactions" ON client_transactions_usd FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own USD transactions" ON client_transactions_usd FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own USD transactions" ON client_transactions_usd FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_trans_usd_client_id ON client_transactions_usd(client_id);
CREATE INDEX idx_trans_usd_user_id ON client_transactions_usd(user_id);
CREATE INDEX idx_trans_usd_date ON client_transactions_usd(transaction_date DESC);

-- =====================================================
-- VEHICLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  registration_number TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vehicle_type TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'sold')),
  purchase_price DECIMAL(15, 2),
  current_value DECIMAL(15, 2),
  created_by UUID REFERENCES staff(id),
  updated_by UUID REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own vehicles" ON vehicles FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_client_id ON vehicles(client_id);

-- =====================================================
-- CLIENT DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES staff(id),
  notes TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own client documents" ON client_documents FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_documents_client_id ON client_documents(client_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION generate_client_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  new_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(client_code FROM 'CLT-(.*)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM clients
  WHERE user_id = NEW.user_id;
  
  new_code := 'CLT-' || LPAD(next_num::TEXT, 4, '0');
  NEW.client_code := new_code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_client_code
  BEFORE INSERT ON clients
  FOR EACH ROW
  WHEN (NEW.client_code IS NULL OR NEW.client_code = '')
  EXECUTE FUNCTION generate_client_code();

CREATE OR REPLACE FUNCTION update_client_last_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clients
  SET last_transaction_date = NEW.transaction_date
  WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_last_trans_kes
  AFTER INSERT ON client_transactions_kes
  FOR EACH ROW
  EXECUTE FUNCTION update_client_last_transaction();

CREATE TRIGGER trigger_update_client_last_trans_usd
  AFTER INSERT ON client_transactions_usd
  FOR EACH ROW
  EXECUTE FUNCTION update_client_last_transaction();

CREATE OR REPLACE FUNCTION update_debt_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.balance <= 0 THEN
    NEW.status := 'paid';
    NEW.paid_date := CURRENT_DATE;
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.status = 'pending' THEN
    NEW.status := 'overdue';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_debt_status
  BEFORE INSERT OR UPDATE ON client_debts
  FOR EACH ROW
  EXECUTE FUNCTION update_debt_status();

CREATE OR REPLACE FUNCTION update_debt_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE client_debts
  SET 
    amount_paid = amount_paid + NEW.amount,
    updated_at = NOW()
  WHERE id = NEW.debt_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_debt_payment
  AFTER INSERT ON debt_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_debt_payment();
