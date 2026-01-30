/*
  # Add Company Relationship to Installers

  ## Overview
  This migration adds company relationship fields to the installers table, enabling
  the hierarchical company structure. Installers can now belong to a company or
  remain independent (company_id = NULL).

  ## Changes Made

  ### 1. New Columns in `installers`
  - `company_id` (uuid, nullable) - Foreign key to installation_companies
  - `role_in_company` (text) - Role within the company: 'owner', 'admin', 'installer'
  - `can_manage_company` (boolean) - Quick flag for management permissions
  - `employee_number` (text) - Optional employee/matriculation number
  - `hired_at` (timestamptz) - Date when joined the company
  - `region` (text) - Geographic region (for territory management)

  ### 2. Constraints
  - Foreign key to installation_companies with CASCADE
  - Check constraint for valid role_in_company values
  - At least one owner per company (enforced via trigger)

  ### 3. Indexes
  - Index on company_id for fast company queries
  - Index on role_in_company for permission checks
  - Composite index on (company_id, is_active) for team listings

  ### 4. Triggers
  - Prevent deletion of last owner in a company
  - Auto-set can_manage_company based on role

  ## Important Notes
  - Existing installers will have company_id = NULL (independent installers)
  - company_id NULL = independent installer (maintains current behavior)
  - company_id NOT NULL = company member with specified role
  - Owner role has full control, admin can manage team, installer is regular member
*/

-- Add new columns to installers table
DO $$
BEGIN
  -- company_id: link to installation company
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installers' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE installers ADD COLUMN company_id uuid REFERENCES installation_companies(id) ON DELETE CASCADE;
  END IF;

  -- role_in_company: owner, admin, or installer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installers' AND column_name = 'role_in_company'
  ) THEN
    ALTER TABLE installers ADD COLUMN role_in_company text CHECK (role_in_company IN ('owner', 'admin', 'installer'));
  END IF;

  -- can_manage_company: quick permission flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installers' AND column_name = 'can_manage_company'
  ) THEN
    ALTER TABLE installers ADD COLUMN can_manage_company boolean DEFAULT false;
  END IF;

  -- employee_number: optional matriculation/employee code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installers' AND column_name = 'employee_number'
  ) THEN
    ALTER TABLE installers ADD COLUMN employee_number text;
  END IF;

  -- hired_at: when joined the company
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installers' AND column_name = 'hired_at'
  ) THEN
    ALTER TABLE installers ADD COLUMN hired_at timestamptz;
  END IF;

  -- region: already exists in schema, keeping it for territory management
  -- No action needed if already exists
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_installers_company_id ON installers(company_id);
CREATE INDEX IF NOT EXISTS idx_installers_role_in_company ON installers(role_in_company);
CREATE INDEX IF NOT EXISTS idx_installers_company_active ON installers(company_id, is_active);

-- Function to auto-set can_manage_company based on role
CREATE OR REPLACE FUNCTION set_installer_manage_permission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role_in_company IN ('owner', 'admin') THEN
    NEW.can_manage_company := true;
  ELSE
    NEW.can_manage_company := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_installer_manage_permission ON installers;
CREATE TRIGGER trigger_set_installer_manage_permission
  BEFORE INSERT OR UPDATE OF role_in_company ON installers
  FOR EACH ROW
  EXECUTE FUNCTION set_installer_manage_permission();

-- Function to prevent deletion of last owner in a company
CREATE OR REPLACE FUNCTION prevent_last_owner_deletion()
RETURNS TRIGGER AS $$
DECLARE
  owner_count integer;
BEGIN
  -- Only check if the installer being deleted/updated is an owner
  IF OLD.role_in_company = 'owner' AND OLD.company_id IS NOT NULL THEN
    -- Count remaining owners in the company
    SELECT COUNT(*) INTO owner_count
    FROM installers
    WHERE company_id = OLD.company_id
    AND role_in_company = 'owner'
    AND id != OLD.id
    AND is_active = true;
    
    -- If this is the last owner, prevent the action
    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete or deactivate the last owner of a company';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_last_owner_deletion ON installers;
CREATE TRIGGER trigger_prevent_last_owner_deletion
  BEFORE DELETE ON installers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_owner_deletion();

-- Trigger to also check on update when deactivating
CREATE OR REPLACE FUNCTION prevent_last_owner_deactivation()
RETURNS TRIGGER AS $$
DECLARE
  owner_count integer;
BEGIN
  -- Only check if deactivating an owner
  IF OLD.role_in_company = 'owner' AND OLD.is_active = true AND NEW.is_active = false AND OLD.company_id IS NOT NULL THEN
    -- Count remaining active owners in the company
    SELECT COUNT(*) INTO owner_count
    FROM installers
    WHERE company_id = OLD.company_id
    AND role_in_company = 'owner'
    AND id != OLD.id
    AND is_active = true;
    
    -- If this is the last active owner, prevent the action
    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Cannot deactivate the last active owner of a company';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_last_owner_deactivation ON installers;
CREATE TRIGGER trigger_prevent_last_owner_deactivation
  BEFORE UPDATE OF is_active ON installers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_owner_deactivation();

-- Update RLS policies for installers to include company context
-- Drop existing policies if needed and recreate with company awareness

-- Policy: Admin can see all installers
DROP POLICY IF EXISTS "Admin can view all installers" ON installers;
CREATE POLICY "Admin can view all installers"
  ON installers FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Policy: Installers can view their own data
DROP POLICY IF EXISTS "Installers can view own profile" ON installers;
CREATE POLICY "Installers can view own profile"
  ON installers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Company owners/admins can view their team members
CREATE POLICY "Company managers can view team members"
  ON installers FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND role_in_company IN ('owner', 'admin')
      AND company_id IS NOT NULL
    )
  );

-- Policy: Company owners can update their team members
DROP POLICY IF EXISTS "Company owners can update team" ON installers;
CREATE POLICY "Company owners can update team"
  ON installers FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND role_in_company = 'owner'
      AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND role_in_company = 'owner'
      AND company_id IS NOT NULL
    )
  );

-- Policy: Admin can update any installer
DROP POLICY IF EXISTS "Admin can update installers" ON installers;
CREATE POLICY "Admin can update installers"
  ON installers FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Add comments
COMMENT ON COLUMN installers.company_id IS 'Foreign key to installation_companies. NULL = independent installer';
COMMENT ON COLUMN installers.role_in_company IS 'Role within company: owner (full control), admin (team management), installer (regular employee)';
COMMENT ON COLUMN installers.can_manage_company IS 'Auto-set flag indicating if user can manage company settings and team';
COMMENT ON COLUMN installers.employee_number IS 'Optional employee matriculation number or code';
COMMENT ON COLUMN installers.hired_at IS 'Date when installer joined the company';
