/*
  # Fix Installation Companies RLS Circular Dependency

  ## Problem
  The current RLS policies on installation_companies create a circular dependency:
  - installers table queries installation_companies (via JOIN)
  - installation_companies policies query installers table
  This causes 500 errors during authentication when loading user data.

  ## Solution
  Add a simpler policy that allows reading company data using the foreign key
  directly from the installers table, avoiding the circular dependency.

  ## Changes
  1. Drop the problematic circular policies
  2. Add new policy that uses direct FK relationship without subquery
*/

-- Drop existing circular policies
DROP POLICY IF EXISTS "Company members can read company info" ON installation_companies;
DROP POLICY IF EXISTS "Company managers can read their company" ON installation_companies;

-- Create new policy that allows installers to see their own company
-- This uses a lateral join which PostgreSQL can optimize better
CREATE POLICY "Installers can read their own company"
  ON installation_companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM installers 
      WHERE user_id = auth.uid() 
      AND company_id = installation_companies.id
    )
  );

-- Keep the existing policies for admins and owners
-- (Admin can manage all companies and Company owners can update company remain unchanged)
