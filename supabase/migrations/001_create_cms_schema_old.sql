-- =====================================================
-- CLIENT MANAGEMENT SYSTEM - DATABASE SCHEMA
-- =====================================================
-- Migration: Transform finance app to CMS
-- Created: December 16, 2025
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CLIENTS TABLE (Master)
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Client Information
  client_name TEXT NOT NULL,
  client_code TEXT UNIQUE NOT NULL, -- e.g., CLT-001
  email TEXT,
  phone TEXT,
  address TEXT,
  
  -- Business Details
  business_name TEXT,
  tax_id TEXT,
  
  -- Status & Metadata
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'archived')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_transaction_date DATE
);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Clients policies
CREATE POLICY "Users can view own clients" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON clients
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_client_code ON clients(client_code);
CREATE INDEX idx_clients_status ON clients(user_id, status);
CREATE INDEX idx_clients_name_search ON clients USING gin(to_tsvector('english', client_name));
CREATE INDEX idx_clients_tags ON clients USING GIN(tags);

-- =====================================================
-- CLIENT TRANSACTIONS - KENYAN SHILLINGS (KES)
-- =====================================================
CREATE TABLE IF NOT EXISTS client_transactions_kes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction Details
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice', 'payment', 'expense', 'refund', 'credit', 'debit')),
  category TEXT,
  description TEXT NOT NULL,
  
  -- References
  reference_number TEXT,
  invoice_number TEXT,
  
  -- Payment Info
  payment_method TEXT CHECK (payment_method IN ('cash', 'mpesa', 'bank_transfer', 'cheque', 'card', 'other')),
  payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- Dates
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  
  -- Metadata
  notes TEXT,
  attachments TEXT[], -- URLs to documents/receipts
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE client_transactions_kes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own client transactions KES" ON client_transactions_kes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own client transactions KES" ON client_transactions_kes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own client transactions KES" ON client_transactions_kes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own client transactions KES" ON client_transactions_kes
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_transactions_kes_client ON client_transactions_kes(client_id, transaction_date DESC);
CREATE INDEX idx_transactions_kes_user ON client_transactions_kes(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_kes_type ON client_transactions_kes(client_id, transaction_type);
CREATE INDEX idx_transactions_kes_reference ON client_transactions_kes(reference_number);

-- =====================================================
-- CLIENT TRANSACTIONS - US DOLLARS (USD)
-- =====================================================
CREATE TABLE IF NOT EXISTS client_transactions_usd (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction Details
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice', 'payment', 'expense', 'refund', 'credit', 'debit')),
  category TEXT,
  description TEXT NOT NULL,
  
  -- References
  reference_number TEXT,
  invoice_number TEXT,
  
  -- Payment Info
  payment_method TEXT CHECK (payment_method IN ('cash', 'wire_transfer', 'bank_transfer', 'cheque', 'card', 'paypal', 'other')),
  payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- Dates
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  
  -- Metadata
  notes TEXT,
  attachments TEXT[], -- URLs to documents/receipts
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE client_transactions_usd ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own client transactions USD" ON client_transactions_usd
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own client transactions USD" ON client_transactions_usd
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own client transactions USD" ON client_transactions_usd
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own client transactions USD" ON client_transactions_usd
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_transactions_usd_client ON client_transactions_usd(client_id, transaction_date DESC);
CREATE INDEX idx_transactions_usd_user ON client_transactions_usd(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_usd_type ON client_transactions_usd(client_id, transaction_type);
CREATE INDEX idx_transactions_usd_reference ON client_transactions_usd(reference_number);

-- =====================================================
-- VEHICLES/TRUCKS TABLE (Optional Asset Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- Optional client association
  
  -- Vehicle Details
  vehicle_number TEXT NOT NULL, -- License plate or ID
  make TEXT,
  model TEXT,
  year INTEGER,
  vin TEXT, -- Vehicle Identification Number
  
  -- Status & Type
  vehicle_type TEXT CHECK (vehicle_type IN ('truck', 'van', 'car', 'trailer', 'other')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'sold', 'retired')),
  
  -- Financial
  purchase_price DECIMAL(15, 2),
  current_value DECIMAL(15, 2),
  
  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_service_date DATE,
  next_service_date DATE
);

-- Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own vehicles" ON vehicles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicles" ON vehicles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles" ON vehicles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles" ON vehicles
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_vehicles_user ON vehicles(user_id);
CREATE INDEX idx_vehicles_client ON vehicles(client_id);
CREATE INDEX idx_vehicles_number ON vehicles(vehicle_number);
CREATE INDEX idx_vehicles_status ON vehicles(user_id, status);

-- =====================================================
-- CLIENT DOCUMENTS TABLE (Optional)
-- =====================================================
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Document Details
  document_name TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('contract', 'invoice', 'receipt', 'agreement', 'id', 'other')),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Metadata
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own client documents" ON client_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own client documents" ON client_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own client documents" ON client_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own client documents" ON client_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_documents_client ON client_documents(client_id);
CREATE INDEX idx_documents_user ON client_documents(user_id);

-- =====================================================
-- HELPER FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_kes_updated_at BEFORE UPDATE ON client_transactions_kes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_usd_updated_at BEFORE UPDATE ON client_transactions_usd
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON client_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update client's last transaction date
CREATE OR REPLACE FUNCTION update_client_last_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clients 
  SET last_transaction_date = NEW.transaction_date
  WHERE id = NEW.client_id AND (last_transaction_date IS NULL OR last_transaction_date < NEW.transaction_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to both transaction tables
CREATE TRIGGER update_client_last_transaction_kes 
  AFTER INSERT OR UPDATE ON client_transactions_kes
  FOR EACH ROW EXECUTE FUNCTION update_client_last_transaction();

CREATE TRIGGER update_client_last_transaction_usd 
  AFTER INSERT OR UPDATE ON client_transactions_usd
  FOR EACH ROW EXECUTE FUNCTION update_client_last_transaction();

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Client Summary View (KES)
CREATE OR REPLACE VIEW client_summary_kes AS
SELECT 
  c.id as client_id,
  c.client_name,
  c.client_code,
  COUNT(t.id) as transaction_count,
  SUM(CASE WHEN t.transaction_type IN ('invoice', 'credit') THEN t.amount ELSE 0 END) as total_receivable,
  SUM(CASE WHEN t.transaction_type IN ('payment', 'debit') THEN t.amount ELSE 0 END) as total_paid,
  SUM(CASE WHEN t.transaction_type IN ('invoice', 'credit') THEN t.amount ELSE 0 END) - 
  SUM(CASE WHEN t.transaction_type IN ('payment', 'debit') THEN t.amount ELSE 0 END) as balance,
  MAX(t.transaction_date) as last_transaction_date
FROM clients c
LEFT JOIN client_transactions_kes t ON c.id = t.client_id
GROUP BY c.id, c.client_name, c.client_code;

-- Client Summary View (USD)
CREATE OR REPLACE VIEW client_summary_usd AS
SELECT 
  c.id as client_id,
  c.client_name,
  c.client_code,
  COUNT(t.id) as transaction_count,
  SUM(CASE WHEN t.transaction_type IN ('invoice', 'credit') THEN t.amount ELSE 0 END) as total_receivable,
  SUM(CASE WHEN t.transaction_type IN ('payment', 'debit') THEN t.amount ELSE 0 END) as total_paid,
  SUM(CASE WHEN t.transaction_type IN ('invoice', 'credit') THEN t.amount ELSE 0 END) - 
  SUM(CASE WHEN t.transaction_type IN ('payment', 'debit') THEN t.amount ELSE 0 END) as balance,
  MAX(t.transaction_date) as last_transaction_date
FROM clients c
LEFT JOIN client_transactions_usd t ON c.id = t.client_id
GROUP BY c.id, c.client_name, c.client_code;

-- =====================================================
-- INITIAL DATA / CLIENT CODE SEQUENCE
-- =====================================================

-- Function to generate next client code
CREATE OR REPLACE FUNCTION generate_client_code()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  next_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(client_code FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM clients;
  
  next_code := 'CLT-' || LPAD(next_number::TEXT, 4, '0');
  RETURN next_code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE clients IS 'Master table for all clients in the CMS';
COMMENT ON TABLE client_transactions_kes IS 'All financial transactions in Kenyan Shillings';
COMMENT ON TABLE client_transactions_usd IS 'All financial transactions in US Dollars';
COMMENT ON TABLE vehicles IS 'Optional vehicle/truck tracking for business assets';
COMMENT ON TABLE client_documents IS 'Document storage references for client files';

COMMENT ON COLUMN clients.client_code IS 'Unique identifier like CLT-0001';
COMMENT ON COLUMN client_transactions_kes.transaction_type IS 'invoice=money owed to you, payment=money received';
COMMENT ON COLUMN client_transactions_usd.transaction_type IS 'invoice=money owed to you, payment=money received';
