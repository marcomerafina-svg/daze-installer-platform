/*
  # Add Complete RLS Policies for Installation Companies

  ## Overview
  Now that installers table has company_id and role_in_company fields,
  we can add the complete RLS policies for installation_companies table.

  ## Changes Made

  ### RLS Policies Added
  - Company owners can read and update their company
  - Company admins can read their company (but not update)
  - All company members (including regular installers) can read basic company info
  - Admin (Daze) maintains full access

  ## Important Notes
  - Policies leverage the installers.company_id and installers.role_in_company fields
  - Only owners can update company settings
  - All members can view their company information
*/

-- Policy: Company owners and admins can read their company
DROP POLICY IF EXISTS "Company managers can read their company" ON installation_companies;
CREATE POLICY "Company managers can read their company"
  ON installation_companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company IN ('owner', 'admin')
    )
  );

-- Policy: Company owners can update their company (not delete)
DROP POLICY IF EXISTS "Company owners can update company" ON installation_companies;
CREATE POLICY "Company owners can update company"
  ON installation_companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company = 'owner'
    )
  );

-- Policy: All company members can read basic company info
DROP POLICY IF EXISTS "Company members can read company info" ON installation_companies;
CREATE POLICY "Company members can read company info"
  ON installation_companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
    )
  );
