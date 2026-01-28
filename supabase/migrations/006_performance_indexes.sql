-- Performance optimization indexes for Ezary CMS
-- Run these in Supabase SQL Editor to speed up queries

-- Client indexes
CREATE INDEX IF NOT EXISTS idx_clients_user_status ON clients(user_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_user_created ON clients(user_id, created_at DESC);

-- Transaction indexes  
CREATE INDEX IF NOT EXISTS idx_kes_txn_client_user ON client_transactions_kes(client_id, user_id);
CREATE INDEX IF NOT EXISTS idx_kes_txn_date ON client_transactions_kes(user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_usd_txn_client_user ON client_transactions_usd(client_id, user_id);
CREATE INDEX IF NOT EXISTS idx_usd_txn_date ON client_transactions_usd(user_id, transaction_date DESC);

-- Debt indexes
CREATE INDEX IF NOT EXISTS idx_debts_user_status ON client_debts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_debts_user_due ON client_debts(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_debts_debtor_name ON client_debts(user_id, debtor_name);
