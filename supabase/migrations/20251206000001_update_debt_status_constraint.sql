-- Migration: Update debts and loans status constraint to match frontend values
-- This migration fixes the constraint violation error by aligning database constraints with the application code

-- =====================================================
-- DEBTS TABLE - Update status constraint
-- =====================================================

-- Step 1: Drop the old constraint on debts table
ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_status_check;

-- Step 2: Add the new constraint with updated status values
ALTER TABLE debts ADD CONSTRAINT debts_status_check 
  CHECK (status IN ('active', 'paying', 'cleared', 'pending'));

-- Step 3: Update the default value from 'unpaid' to 'active'
ALTER TABLE debts ALTER COLUMN status SET DEFAULT 'active';

-- Step 4: Update any existing data that has old status values (if any exist)
UPDATE debts SET status = 'active' WHERE status = 'unpaid';
UPDATE debts SET status = 'paying' WHERE status = 'partially_paid';

-- =====================================================
-- LOANS TABLE - Update status constraint
-- =====================================================

-- Step 1: Drop the old constraint on loans table
ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_status_check;

-- Step 2: Add the new constraint with updated status values
ALTER TABLE loans ADD CONSTRAINT loans_status_check 
  CHECK (status IN ('active', 'paying', 'cleared', 'pending'));

-- Step 3: Update the default value from 'unpaid' to 'active'
ALTER TABLE loans ALTER COLUMN status SET DEFAULT 'active';

-- Step 4: Update any existing data that has old status values (if any exist)
UPDATE loans SET status = 'active' WHERE status = 'unpaid';
UPDATE loans SET status = 'paying' WHERE status = 'partially_paid';
