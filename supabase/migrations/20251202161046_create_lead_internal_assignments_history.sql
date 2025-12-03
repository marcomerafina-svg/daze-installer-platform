/*
  # Create Lead Internal Assignments History Table

  ## Overview
  Track the complete history of internal lead assignments within a company.
  When a company owner/admin reassigns a lead from one installer to another,
  this creates an audit trail.

  ## Changes Made

  ### 1. New Table `lead_internal_assignments`
  Tracks all internal reassignments within a company:
  - `id` (uuid, primary key)
  - `lead_id` (uuid) - The lead being reassigned
  - `assignment_id` (uuid) - Reference to lead_assignments record
  - `company_id` (uuid) - Company where reassignment happened
  - `from_installer_id` (uuid, nullable) - Previous installer (NULL if first assignment)
  - `to_installer_id` (uuid) - New installer assigned
  - `assigned_by` (uuid) - Owner/admin who made the assignment
  - `notes` (text) - Optional notes about why reassigned
  - `created_at` (timestamptz)

  ### 2. Trigger
  - Auto-create record when lead_assignments.installer_id changes within a company

  ## Important Notes
  - Only tracks changes within company-assigned leads
  - Independent installer assignments don't create records here
  - Provides complete audit trail for company lead management
*/

-- Create lead_internal_assignments table
CREATE TABLE IF NOT EXISTS lead_internal_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  assignment_id uuid REFERENCES lead_assignments(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES installation_companies(id) ON DELETE CASCADE NOT NULL,
  from_installer_id uuid REFERENCES installers(id) ON DELETE SET NULL,
  to_installer_id uuid REFERENCES installers(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES installers(id) ON DELETE SET NULL NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_internal_assignments_lead ON lead_internal_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_internal_assignments_company ON lead_internal_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_internal_assignments_to_installer ON lead_internal_assignments(to_installer_id);
CREATE INDEX IF NOT EXISTS idx_lead_internal_assignments_date ON lead_internal_assignments(created_at DESC);

-- Trigger to auto-create internal assignment record when installer changes
CREATE OR REPLACE FUNCTION track_internal_lead_assignment()
RETURNS TRIGGER AS $$
DECLARE
  assigning_installer_id uuid;
BEGIN
  -- Only track if this is a company lead being reassigned internally
  IF NEW.assigned_to_company_id IS NOT NULL AND 
     (OLD.installer_id IS NULL OR OLD.installer_id != NEW.installer_id) AND
     NEW.installer_id IS NOT NULL THEN
    
    -- Get the installer making the change (from auth context)
    SELECT id INTO assigning_installer_id
    FROM installers
    WHERE user_id = auth.uid()
    AND company_id = NEW.assigned_to_company_id
    AND role_in_company IN ('owner', 'admin')
    LIMIT 1;
    
    -- Create internal assignment record if we found an assigning user
    IF assigning_installer_id IS NOT NULL THEN
      INSERT INTO lead_internal_assignments (
        lead_id,
        assignment_id,
        company_id,
        from_installer_id,
        to_installer_id,
        assigned_by
      ) VALUES (
        NEW.lead_id,
        NEW.id,
        NEW.assigned_to_company_id,
        OLD.installer_id,
        NEW.installer_id,
        assigning_installer_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_internal_lead_assignment ON lead_assignments;
CREATE TRIGGER trigger_track_internal_lead_assignment
  AFTER UPDATE OF installer_id ON lead_assignments
  FOR EACH ROW
  WHEN (NEW.assigned_to_company_id IS NOT NULL)
  EXECUTE FUNCTION track_internal_lead_assignment();

-- RLS for lead_internal_assignments
ALTER TABLE lead_internal_assignments ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY "Admin can view all internal assignments"
  ON lead_internal_assignments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Company owners/admins can view their company's internal assignments
CREATE POLICY "Company managers can view company internal assignments"
  ON lead_internal_assignments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company IN ('owner', 'admin')
    )
  );

-- Installers can view internal assignments related to their leads
CREATE POLICY "Installers can view their lead assignments"
  ON lead_internal_assignments FOR SELECT
  TO authenticated
  USING (
    to_installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    ) OR
    from_installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE lead_internal_assignments IS 'Audit trail of internal lead reassignments within companies';
COMMENT ON COLUMN lead_internal_assignments.from_installer_id IS 'Previous installer (NULL if this is the first internal assignment)';
COMMENT ON COLUMN lead_internal_assignments.to_installer_id IS 'New installer receiving the lead';
COMMENT ON COLUMN lead_internal_assignments.assigned_by IS 'Company owner/admin who performed the reassignment';
