/*
  # Add policy for company members visibility

  1. Security Changes
    - Add new SELECT policy allowing installers to view other members of their company
    - This enables the Team Management page to display all team members

  2. Notes
    - Policy checks that both the viewer and the target member belong to the same company
    - Only active installers with a company_id can see other company members
*/

CREATE POLICY "Installers can view company members"
  ON installers
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id IN (
      SELECT i.company_id 
      FROM installers i 
      WHERE i.user_id = auth.uid() 
      AND i.company_id IS NOT NULL
    )
  );