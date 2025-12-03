/*
  # Fix Installers RLS - Remove Recursive Policy

  ## Problem
  The policy "Company managers can view team members" on the installers table
  contains a subquery that queries the installers table itself:
  
  ```sql
  company_id IN (
    SELECT company_id FROM installers  -- <-- THIS IS THE PROBLEM
    WHERE user_id = auth.uid() ...
  )
  ```
  
  When AuthContext loads installer data with a JOIN to installation_companies,
  this creates a recursive loop:
  - Query installers with JOIN to installation_companies
  - RLS policy queries installers again
  - That query's RLS policy queries installers again
  - Infinite recursion = 500 error

  ## Solution
  Drop the recursive policy. Company managers will access team data through
  dedicated API queries that don't cause recursion, not through the auth flow.
  
  The auth flow only needs to load the user's own installer record, which is
  already covered by "Installers can view own profile" policy.

  ## Changes
  1. Drop the problematic "Company managers can view team members" policy
  2. Keep other policies that don't cause recursion
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "Company managers can view team members" ON installers;

-- The remaining policies are safe:
-- - "Admin can view all installers" - checks JWT only
-- - "Installers can view own profile" - checks user_id = auth.uid() only
-- - "Installer can view own profile" - duplicate, also safe

-- Company managers will query team members through separate queries
-- that don't happen during auth, so no recursion issue
