/*
  # Update Points Calculation for Company-Based System

  ## Overview
  Completely restructure the points calculation logic to support both:
  - Company-level points (for installers with company_id)
  - Individual installer points (for independent installers with company_id = NULL)

  ## Changes Made

  ### 1. New Function: calculate_company_points
  Calculates total points for a company from all its installers' approved installations

  ### 2. Update Function: calculate_installer_points
  Keep for independent installers only (company_id = NULL)

  ### 3. New Function: update_company_tier
  Auto-update company tier when points change

  ### 4. Update Trigger: award_points_on_approval
  Modified to:
  - Add points to company if installer has company_id
  - Add points to individual if installer has no company_id
  - Create transaction with correct company_id

  ### 5. Update Trigger: track_points_on_lead_won
  Modified to handle both company and individual scenarios

  ## Important Notes
  - Points flow differently based on installer.company_id
  - Company members' points aggregate to company_rewards
  - Independent installers' points go to installer_rewards
  - All transactions maintain installer_id (who did the work) + company_id (who gets credit)
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS update_installer_tier CASCADE;
DROP FUNCTION IF EXISTS update_installer_tier_if_needed CASCADE;

-- Function 1: Calculate total points for a company
CREATE OR REPLACE FUNCTION calculate_company_points(p_company_id uuid)
RETURNS integer AS $$
DECLARE
  total_points integer;
BEGIN
  -- Sum all points from approved installations by company installers
  SELECT COALESCE(SUM(p.points), 0)
  INTO total_points
  FROM wallbox_serials ws
  JOIN products p ON p.id = ws.product_id
  JOIN installers i ON i.id = ws.installer_id
  WHERE i.company_id = p_company_id
    AND ws.approval_status = 'approved';

  RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Get appropriate tier for given points
CREATE OR REPLACE FUNCTION get_tier_for_points(p_points integer)
RETURNS uuid AS $$
DECLARE
  tier_id uuid;
BEGIN
  SELECT id INTO tier_id
  FROM rewards_tiers
  WHERE points_required <= p_points
  ORDER BY points_required DESC
  LIMIT 1;
  
  RETURN tier_id;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Update company tier based on current points
CREATE OR REPLACE FUNCTION update_company_tier(p_company_id uuid)
RETURNS void AS $$
DECLARE
  current_points integer;
  new_tier_id uuid;
  old_tier_id uuid;
BEGIN
  -- Get current points and tier
  SELECT total_points, current_tier_id INTO current_points, old_tier_id
  FROM company_rewards
  WHERE company_id = p_company_id;
  
  -- Get new tier based on points
  new_tier_id := get_tier_for_points(current_points);
  
  -- Update if tier changed
  IF new_tier_id IS DISTINCT FROM old_tier_id THEN
    UPDATE company_rewards
    SET current_tier_id = new_tier_id,
        tier_reached_at = now(),
        updated_at = now()
    WHERE company_id = p_company_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Update individual installer tier (for independents only)
CREATE OR REPLACE FUNCTION update_independent_installer_tier(p_installer_id uuid)
RETURNS void AS $$
DECLARE
  current_points integer;
  new_tier_id uuid;
  old_tier_id uuid;
BEGIN
  -- Get current points and tier
  SELECT total_points, current_tier_id INTO current_points, old_tier_id
  FROM installer_rewards
  WHERE installer_id = p_installer_id;
  
  -- Get new tier based on points
  new_tier_id := get_tier_for_points(current_points);
  
  -- Update if tier changed
  IF new_tier_id IS DISTINCT FROM old_tier_id THEN
    UPDATE installer_rewards
    SET current_tier_id = new_tier_id,
        tier_reached_at = now(),
        updated_at = now()
    WHERE installer_id = p_installer_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate award_points_on_approval with company logic
CREATE OR REPLACE FUNCTION award_points_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_total_points integer;
  v_serial_points integer;
  v_company_id uuid;
BEGIN
  -- Only when status changes from pending to approved
  IF (NEW.approval_status = 'approved' AND OLD.approval_status = 'pending') THEN
    IF NEW.installer_id IS NOT NULL AND NEW.product_id IS NOT NULL THEN
      
      -- Get installer's company_id
      SELECT company_id INTO v_company_id
      FROM installers
      WHERE id = NEW.installer_id;
      
      -- Get points for this product
      SELECT points INTO v_serial_points
      FROM products
      WHERE id = NEW.product_id;

      IF v_serial_points > 0 THEN
        -- Create points transaction
        INSERT INTO points_transactions (
          installer_id,
          company_id,
          lead_id,
          points_earned,
          transaction_type,
          description
        ) VALUES (
          NEW.installer_id,
          v_company_id,
          NEW.lead_id,
          v_serial_points,
          'lead_won',
          CASE
            WHEN NEW.source_type = 'self_reported' THEN 'Installazione autonoma approvata: ' || NEW.serial_code
            ELSE 'Installazione da lead approvata: ' || NEW.serial_code
          END
        );

        -- Update rewards based on company membership
        IF v_company_id IS NOT NULL THEN
          -- Company member: update company_rewards
          v_total_points := calculate_company_points(v_company_id);
          
          INSERT INTO company_rewards (company_id, total_points)
          VALUES (v_company_id, v_total_points)
          ON CONFLICT (company_id)
          DO UPDATE SET
            total_points = v_total_points,
            updated_at = now();
          
          -- Update company tier
          PERFORM update_company_tier(v_company_id);
          
        ELSE
          -- Independent installer: update installer_rewards
          v_total_points := calculate_installer_points(NEW.installer_id);
          
          INSERT INTO installer_rewards (installer_id, total_points)
          VALUES (NEW.installer_id, v_total_points)
          ON CONFLICT (installer_id)
          DO UPDATE SET
            total_points = v_total_points,
            updated_at = now();
          
          -- Update installer tier
          PERFORM update_independent_installer_tier(NEW.installer_id);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate track_points_on_lead_won with company logic
CREATE OR REPLACE FUNCTION track_points_on_lead_won()
RETURNS TRIGGER AS $$
DECLARE
  v_installer_id uuid;
  v_company_id uuid;
  v_total_points integer;
  v_lead_serials_points integer;
BEGIN
  -- Only when status changes to "Chiusa Vinta"
  IF (NEW.status = 'Chiusa Vinta' AND OLD.status != 'Chiusa Vinta') THEN
    
    -- Get installer assigned to this lead
    SELECT installer_id INTO v_installer_id
    FROM lead_assignments
    WHERE lead_id = NEW.id
    LIMIT 1;

    IF v_installer_id IS NOT NULL THEN
      -- Get installer's company
      SELECT company_id INTO v_company_id
      FROM installers
      WHERE id = v_installer_id;
      
      -- Calculate points from approved serials for this lead
      SELECT COALESCE(SUM(p.points), 0)
      INTO v_lead_serials_points
      FROM wallbox_serials ws
      JOIN products p ON p.id = ws.product_id
      WHERE ws.lead_id = NEW.id
        AND ws.installer_id = v_installer_id
        AND ws.approval_status = 'approved';

      IF v_lead_serials_points > 0 THEN
        -- Create transaction
        INSERT INTO points_transactions (
          installer_id,
          company_id,
          lead_id,
          points_earned,
          transaction_type,
          description
        ) VALUES (
          v_installer_id,
          v_company_id,
          NEW.id,
          v_lead_serials_points,
          'lead_won',
          'Lead chiusa vinta con ' || v_lead_serials_points || ' punti da prodotti installati'
        );

        -- Update rewards
        IF v_company_id IS NOT NULL THEN
          -- Company member
          v_total_points := calculate_company_points(v_company_id);
          
          INSERT INTO company_rewards (company_id, total_points)
          VALUES (v_company_id, v_total_points)
          ON CONFLICT (company_id)
          DO UPDATE SET
            total_points = v_total_points,
            updated_at = now();
          
          PERFORM update_company_tier(v_company_id);
          
        ELSE
          -- Independent installer
          v_total_points := calculate_installer_points(v_installer_id);
          
          INSERT INTO installer_rewards (installer_id, total_points)
          VALUES (v_installer_id, v_total_points)
          ON CONFLICT (installer_id)
          DO UPDATE SET
            total_points = v_total_points,
            updated_at = now();
          
          PERFORM update_independent_installer_tier(v_installer_id);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers (drop and create to ensure clean state)
DROP TRIGGER IF EXISTS trigger_award_points_on_approval ON wallbox_serials;
CREATE TRIGGER trigger_award_points_on_approval
  AFTER UPDATE ON wallbox_serials
  FOR EACH ROW
  EXECUTE FUNCTION award_points_on_approval();

DROP TRIGGER IF EXISTS trigger_track_points_on_lead_won ON leads;
CREATE TRIGGER trigger_track_points_on_lead_won
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_points_on_lead_won();

-- Add comments
COMMENT ON FUNCTION calculate_company_points IS 'Calculates total points for a company from all approved installations by company installers';
COMMENT ON FUNCTION update_company_tier IS 'Updates company tier based on current total points';
COMMENT ON FUNCTION update_independent_installer_tier IS 'Updates individual installer tier (for independent installers only)';
