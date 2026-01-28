-- Make client_debts independent from clients table
-- This allows tracking debts for people who are not clients

-- Drop the foreign key constraint
ALTER TABLE client_debts DROP CONSTRAINT IF EXISTS client_debts_client_id_fkey;

-- Make client_id nullable
ALTER TABLE client_debts ALTER COLUMN client_id DROP NOT NULL;

-- Add direct fields for debtor information
ALTER TABLE client_debts ADD COLUMN IF NOT EXISTS debtor_name TEXT;
ALTER TABLE client_debts ADD COLUMN IF NOT EXISTS debtor_phone TEXT;

-- Update existing records to copy client info to debtor fields
UPDATE client_debts
SET debtor_name = c.client_name,
    debtor_phone = c.phone
FROM clients c
WHERE client_debts.client_id = c.id
  AND client_debts.debtor_name IS NULL;
