/*
  # Add Company Support to Lead Assignments

  ## Overview
  Modify lead_assignments to support assigning leads to companies (not just individual installers).
  A lead can be assigned to a company, then internally assigned to specific installers.

  ## Changes Made

  ### 1. Modify `lead_assignments` Table
  - Add `assigned_to_company_id` (uuid, nullable) - Company the lead is assigned to
  - Keep `installer_id` (nullable now) - Specific installer working the lead
  - Constraint: at least one of company_id or installer_id must be NOT NULL
  - A lead assigned to company can later be assigned to specific installer

  ### 2. Add Tracking Fields
  - `internally_assigned_at` (timestamptz) - When assigned internally to installer
  - `internally_assigned_by` (uuid) - Which owner/admin assigned internally

  ## Important Notes
  - Lead workflow: Daze Admin → Company → (Owner/Admin) → Specific Installer
  - Or: Daze Admin → Independent Installer (direct, as before)
  - Existing assignments remain valid (assigned_to_company_id will be NULL)
*/

-- Step 1: Add new columns to lead_assignments
DO $$
BEGIN
  -- assigned_to_company_id: which company gets the lead
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_assignments' AND column_name = 'assigned_to_company_id'
  ) THEN
    ALTER TABLE lead_assignments ADD COLUMN assigned_to_company_id uuid REFERENCES installation_companies(id) ON DELETE CASCADE;
  END IF;

  -- internally_assigned_at: when company owner/admin assigned to specific installer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_assignments' AND column_name = 'internally_assigned_at'
  ) THEN
    ALTER TABLE lead_assignments ADD COLUMN internally_assigned_at timestamptz;
  END IF;

  -- internally_assigned_by: which company manager did the internal assignment
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_assignments' AND column_name = 'internally_assigned_by'
  ) THEN
    ALTER TABLE lead_assignments ADD COLUMN internally_assigned_by uuid REFERENCES installers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 2: Make installer_id nullable (since lead can be assigned to company without specific installer yet)
ALTER TABLE lead_assignments ALTER COLUMN installer_id DROP NOT NULL;

-- Step 3: Add constraint that at least one of company or installer must be assigned
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_assignments_must_have_assignee'
  ) THEN
    ALTER TABLE lead_assignments ADD CONSTRAINT lead_assignments_must_have_assignee
    CHECK (assigned_to_company_id IS NOT NULL OR installer_id IS NOT NULL);
  END IF;
END $$;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_assignments_company_id ON lead_assignments(assigned_to_company_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_company_installer ON lead_assignments(assigned_to_company_id, installer_id);

-- Step 5: Update RLS policies for lead_assignments

-- Admin can see all
DROP POLICY IF EXISTS "Admin can manage all lead assignments" ON lead_assignments;
CREATE POLICY "Admin can manage all lead assignments"
  ON lead_assignments FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Company owners/admins can view leads assigned to their company
DROP POLICY IF EXISTS "Company managers can view company leads" ON lead_assignments;
CREATE POLICY "Company managers can view company leads"
  ON lead_assignments FOR SELECT
  TO authenticated
  USING (
    assigned_to_company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company IN ('owner', 'admin')
    )
  );

-- Company owners/admins can update lead assignments (internal assignment)
DROP POLICY IF EXISTS "Company managers can assign leads internally" ON lead_assignments;
CREATE POLICY "Company managers can assign leads internally"
  ON lead_assignments FOR UPDATE
  TO authenticated
  USING (
    assigned_to_company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    assigned_to_company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company IN ('owner', 'admin')
    )
  );

-- Installers can view their assigned leads
DROP POLICY IF EXISTS "Installers can view assigned leads" ON lead_assignments;
CREATE POLICY "Installers can view assigned leads"
  ON lead_assignments FOR SELECT
  TO authenticated
  USING (
    installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    )
  );

-- Installers can update their own assignments (mark as viewed, etc)
DROP POLICY IF EXISTS "Installers can update own assignments" ON lead_assignments;
CREATE POLICY "Installers can update own assignments"
  ON lead_assignments FOR UPDATE
  TO authenticated
  USING (
    installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    )
  );

-- Step 6: Populate assigned_to_company_id for existing assignments where installer has company
UPDATE lead_assignments la
SET assigned_to_company_id = i.company_id
FROM installers i
WHERE la.installer_id = i.id
AND la.assigned_to_company_id IS NULL
AND i.company_id IS NOT NULL;

-- Step 7: Add comments
COMMENT ON COLUMN lead_assignments.assigned_to_company_id IS 'Company the lead is assigned to (NULL if assigned to independent installer)';
COMMENT ON COLUMN lead_assignments.internally_assigned_at IS 'When company owner/admin assigned lead to specific installer';
COMMENT ON COLUMN lead_assignments.internally_assigned_by IS 'Which company manager performed the internal assignment';
