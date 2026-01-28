-- Add UPDATE policies for transaction tables
-- This allows users to edit their own transactions

-- KES transactions UPDATE policy
CREATE POLICY "Users can update own KES transactions" 
ON client_transactions_kes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- USD transactions UPDATE policy
CREATE POLICY "Users can update own USD transactions" 
ON client_transactions_usd 
FOR UPDATE 
USING (auth.uid() = user_id);
