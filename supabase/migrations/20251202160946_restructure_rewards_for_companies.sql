/*
  # Restructure Rewards System for Company-Based Points

  ## Overview
  Major restructuring of the rewards system to support company-level point accumulation
  instead of individual installer points. Companies compete for tiers, while individual
  installer contributions are tracked separately for internal stats.

  ## Changes Made

  ### 1. Create `company_rewards` Table
  New table for company-level rewards (similar to old installer_rewards but for companies):
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key to installation_companies)
  - `total_points` (integer) - Aggregate points from all company installers
  - `current_tier_id` (uuid) - Company's current tier
  - `tier_reached_at` (timestamptz) - When company reached current tier
  - `created_at`, `updated_at`

  ### 2. Modify `installer_rewards` Table
  Keep for independent installers (company_id = NULL) only:
  - These installers continue with individual points and tiers
  - Add constraint: installer must NOT have company_id

  ### 3. Modify `points_transactions` Table
  Add company_id to track which company gets the points:
  - Keep `installer_id` (who did the work)
  - Add `company_id` (which company gets credit)
  - If company_id NULL = independent installer gets individual credit

  ### 4. Create View `installer_contributions`
  For internal company stats showing individual contributions:
  - installer_id, company_id, total_points_contributed
  - Does NOT affect tier (tier is company-level only)

  ## Important Notes
  - Existing installer_rewards records remain valid for independent installers
  - Company members no longer have individual tiers (company has the tier)
  - Points flow: installation → installer (who did it) → company (aggregated)
  - Independent installers (company_id=NULL) maintain individual system
*/

-- Step 1: Create company_rewards table
CREATE TABLE IF NOT EXISTS company_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES installation_companies(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_points integer DEFAULT 0,
  current_tier_id uuid REFERENCES rewards_tiers(id),
  tier_reached_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_company_rewards_company_id ON company_rewards(company_id);
CREATE INDEX IF NOT EXISTS idx_company_rewards_tier ON company_rewards(current_tier_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_company_rewards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_company_rewards_timestamp ON company_rewards;
CREATE TRIGGER trigger_update_company_rewards_timestamp
  BEFORE UPDATE ON company_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_company_rewards_updated_at();

-- Step 2: Add company_id to points_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_transactions' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE points_transactions ADD COLUMN company_id uuid REFERENCES installation_companies(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_points_transactions_company_id ON points_transactions(company_id);

-- Step 3: Add company_id to wallbox_serials for easier aggregation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN company_id uuid REFERENCES installation_companies(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallbox_serials_company_id ON wallbox_serials(company_id);

-- Step 4: Trigger to auto-populate company_id in wallbox_serials from installer
CREATE OR REPLACE FUNCTION populate_serial_company_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get company_id from installer if exists
  IF NEW.installer_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM installers
    WHERE id = NEW.installer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_populate_serial_company_id ON wallbox_serials;
CREATE TRIGGER trigger_populate_serial_company_id
  BEFORE INSERT OR UPDATE OF installer_id ON wallbox_serials
  FOR EACH ROW
  EXECUTE FUNCTION populate_serial_company_id();

-- Step 5: Update existing wallbox_serials with company_id
UPDATE wallbox_serials ws
SET company_id = i.company_id
FROM installers i
WHERE ws.installer_id = i.id
AND ws.company_id IS NULL
AND i.company_id IS NOT NULL;

-- Step 6: Create view for installer contributions (internal company stats)
CREATE OR REPLACE VIEW installer_contributions AS
SELECT 
  i.id as installer_id,
  i.company_id,
  i.first_name,
  i.last_name,
  COALESCE(SUM(p.points), 0) as total_points_contributed,
  COUNT(DISTINCT ws.id) as installations_count,
  COUNT(DISTINCT CASE WHEN ws.approval_status = 'approved' THEN ws.id END) as approved_installations_count
FROM installers i
LEFT JOIN wallbox_serials ws ON ws.installer_id = i.id AND ws.approval_status = 'approved'
LEFT JOIN products p ON p.id = ws.product_id
WHERE i.company_id IS NOT NULL
GROUP BY i.id, i.company_id, i.first_name, i.last_name;

-- Step 7: RLS for company_rewards
ALTER TABLE company_rewards ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY "Admin can manage all company rewards"
  ON company_rewards FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Company members can view their company rewards
CREATE POLICY "Company members can view company rewards"
  ON company_rewards FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
    )
  );

-- Step 8: Add constraint to installer_rewards 
-- This ensures that installers with company_id don't have individual rewards
-- We'll enforce this at application level to avoid breaking existing data
-- Add comment explaining the logic
COMMENT ON TABLE installer_rewards IS 'Individual rewards for independent installers only (company_id = NULL). Company members earn points for their company in company_rewards table.';

-- Step 9: Add comments
COMMENT ON TABLE company_rewards IS 'Aggregate rewards and tier tracking for installation companies';
COMMENT ON COLUMN company_rewards.total_points IS 'Sum of all points earned by company installers';
COMMENT ON COLUMN company_rewards.current_tier_id IS 'Current tier level achieved by the company';
COMMENT ON COLUMN points_transactions.company_id IS 'Company receiving the points (NULL if independent installer)';
COMMENT ON COLUMN wallbox_serials.company_id IS 'Company of the installer who performed installation (denormalized for performance)';
