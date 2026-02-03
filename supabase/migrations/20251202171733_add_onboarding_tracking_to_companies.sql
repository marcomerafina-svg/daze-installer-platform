/*
  # Add Onboarding Tracking to Installation Companies

  ## Overview
  This migration adds onboarding tracking fields to the installation_companies table.
  These fields allow the system to track whether a company has completed the initial
  onboarding process and what step they're currently on.

  ## Changes Made

  ### 1. New Columns in `installation_companies`
  - `onboarding_completed` (boolean) - Whether the company has completed onboarding
  - `onboarding_step` (integer) - Current step in the onboarding process (0-6)
  - `onboarding_started_at` (timestamptz) - When the company first started onboarding
  - `onboarding_completed_at` (timestamptz) - When the company completed onboarding
  - `onboarding_skipped` (boolean) - Whether the company chose to skip onboarding

  ### 2. Default Values
  - New companies start with onboarding_completed = false
  - onboarding_step defaults to 0
  - Timestamps are set automatically when relevant actions occur

  ## Important Notes
  - Existing companies will have onboarding_completed = true (assumed already onboarded)
  - New companies created after this migration will need to complete onboarding
  - Onboarding can be skipped or resumed at any time
*/

-- Add onboarding tracking columns
DO $$
BEGIN
  -- onboarding_completed: tracks if company finished onboarding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installation_companies' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE installation_companies 
    ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  -- onboarding_step: current step (0 = not started, 1-6 = steps, 7+ = completed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installation_companies' AND column_name = 'onboarding_step'
  ) THEN
    ALTER TABLE installation_companies 
    ADD COLUMN onboarding_step integer DEFAULT 0;
  END IF;

  -- onboarding_started_at: when onboarding was first opened
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installation_companies' AND column_name = 'onboarding_started_at'
  ) THEN
    ALTER TABLE installation_companies 
    ADD COLUMN onboarding_started_at timestamptz;
  END IF;

  -- onboarding_completed_at: when onboarding was finished
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installation_companies' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE installation_companies 
    ADD COLUMN onboarding_completed_at timestamptz;
  END IF;

  -- onboarding_skipped: whether user chose to skip
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installation_companies' AND column_name = 'onboarding_skipped'
  ) THEN
    ALTER TABLE installation_companies 
    ADD COLUMN onboarding_skipped boolean DEFAULT false;
  END IF;
END $$;

-- Set existing companies as already onboarded (grandfather clause)
UPDATE installation_companies 
SET 
  onboarding_completed = true,
  onboarding_step = 99,
  onboarding_completed_at = created_at
WHERE onboarding_completed IS NULL OR onboarding_completed = false;

-- Add comments
COMMENT ON COLUMN installation_companies.onboarding_completed IS 'Whether the company has completed the initial onboarding wizard';
COMMENT ON COLUMN installation_companies.onboarding_step IS 'Current step in onboarding process (0=not started, 1-6=in progress, 99=completed)';
COMMENT ON COLUMN installation_companies.onboarding_started_at IS 'Timestamp when company first opened the onboarding wizard';
COMMENT ON COLUMN installation_companies.onboarding_completed_at IS 'Timestamp when company completed or skipped onboarding';
COMMENT ON COLUMN installation_companies.onboarding_skipped IS 'Whether the company chose to skip the onboarding process';
