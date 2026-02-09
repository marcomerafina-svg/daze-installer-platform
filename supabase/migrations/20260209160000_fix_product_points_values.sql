/*
  # Fix Product Points + Trigger Functions (SECURITY DEFINER)

  ## Overview
  1. Corrects points values for Urban (500→300) and Duo (250→200) in products table
  2. Recreates trigger functions with SECURITY DEFINER to bypass RLS
  3. Both triggers now update installer_rewards AND company_rewards

  ## Correct Points
  - Dazebox C (DB07): 50 pts
  - Dazebox Home (DT01, DS01, DK01): 100 pts each
  - Dazebox Share (DT02, DS02, DK02): 100 pts each
  - Duo (OT01, OS01): 200 pts each (was 250)
  - Urban (UT01, US01): 300 pts each (was 500)

  ## Key Fix: SECURITY DEFINER
  Trigger functions must run as superuser (SECURITY DEFINER) because:
  - RLS on points_transactions only allows admin INSERT
  - RLS on installer_rewards only allows admin UPDATE
  - Without SECURITY DEFINER, triggers fail with 403 when called by installers
*/

-- ============================================
-- STEP 1: Fix products table
-- ============================================

UPDATE products SET points = 200 WHERE code IN ('OT01', 'OS01');
UPDATE products SET points = 300 WHERE code IN ('UT01', 'US01');

-- ============================================
-- STEP 2: Ensure helper function exists
-- ============================================

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

-- ============================================
-- STEP 3: Recreate track_points_on_lead_won
-- ============================================

CREATE OR REPLACE FUNCTION track_points_on_lead_won()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_installer_id uuid;
  v_company_id uuid;
  v_lead_serials_points integer;
  v_installer_total integer;
  v_company_total integer;
  v_new_tier_id uuid;
BEGIN
  IF (NEW.status = 'Chiusa Vinta' AND OLD.status != 'Chiusa Vinta') THEN
    
    SELECT installer_id INTO v_installer_id
    FROM lead_assignments WHERE lead_id = NEW.id LIMIT 1;

    IF v_installer_id IS NOT NULL THEN
      SELECT company_id INTO v_company_id
      FROM installers WHERE id = v_installer_id;
      
      SELECT COALESCE(SUM(p.points), 0) INTO v_lead_serials_points
      FROM wallbox_serials ws
      JOIN products p ON p.id = ws.product_id
      WHERE ws.lead_id = NEW.id
        AND ws.installer_id = v_installer_id
        AND ws.approval_status = 'approved';

      IF v_lead_serials_points > 0 THEN
        -- Registra transazione
        INSERT INTO points_transactions (
          installer_id, company_id, lead_id,
          points_earned, transaction_type, description
        ) VALUES (
          v_installer_id, v_company_id, NEW.id,
          v_lead_serials_points, 'lead_won',
          'Lead chiusa vinta con ' || v_lead_serials_points || ' punti'
        );

        -- SEMPRE aggiorna installer_rewards (punti individuali)
        SELECT COALESCE(SUM(p.points), 0) INTO v_installer_total
        FROM wallbox_serials ws
        JOIN products p ON p.id = ws.product_id
        WHERE ws.installer_id = v_installer_id
          AND ws.approval_status = 'approved';

        INSERT INTO installer_rewards (installer_id, total_points)
        VALUES (v_installer_id, v_installer_total)
        ON CONFLICT (installer_id)
        DO UPDATE SET total_points = v_installer_total, updated_at = now();

        SELECT id INTO v_new_tier_id FROM rewards_tiers
        WHERE points_required <= v_installer_total ORDER BY points_required DESC LIMIT 1;

        UPDATE installer_rewards
        SET current_tier_id = v_new_tier_id,
            tier_reached_at = CASE WHEN v_new_tier_id IS NOT NULL THEN now() ELSE NULL END
        WHERE installer_id = v_installer_id;

        -- SE ha company, aggiorna ANCHE company_rewards
        IF v_company_id IS NOT NULL THEN
          SELECT COALESCE(SUM(p.points), 0) INTO v_company_total
          FROM wallbox_serials ws
          JOIN products p ON p.id = ws.product_id
          JOIN installers i ON i.id = ws.installer_id
          WHERE i.company_id = v_company_id
            AND ws.approval_status = 'approved';

          INSERT INTO company_rewards (company_id, total_points)
          VALUES (v_company_id, v_company_total)
          ON CONFLICT (company_id)
          DO UPDATE SET total_points = v_company_total, updated_at = now();

          SELECT id INTO v_new_tier_id FROM rewards_tiers
          WHERE points_required <= v_company_total ORDER BY points_required DESC LIMIT 1;

          UPDATE company_rewards
          SET current_tier_id = v_new_tier_id,
              tier_reached_at = CASE WHEN v_new_tier_id IS NOT NULL THEN now() ELSE NULL END
          WHERE company_id = v_company_id;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_track_points_on_lead_won ON leads;
CREATE TRIGGER trigger_track_points_on_lead_won
  AFTER UPDATE OF status ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_points_on_lead_won();

-- ============================================
-- STEP 4: Recreate award_points_on_approval
-- ============================================

CREATE OR REPLACE FUNCTION award_points_on_approval()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_serial_points integer;
  v_company_id uuid;
  v_installer_total integer;
  v_company_total integer;
  v_new_tier_id uuid;
BEGIN
  IF (NEW.approval_status = 'approved' AND OLD.approval_status = 'pending') THEN
    IF NEW.installer_id IS NOT NULL AND NEW.product_id IS NOT NULL THEN
      
      SELECT company_id INTO v_company_id
      FROM installers WHERE id = NEW.installer_id;

      SELECT points INTO v_serial_points
      FROM products WHERE id = NEW.product_id;

      IF v_serial_points > 0 THEN
        INSERT INTO points_transactions (
          installer_id, company_id, lead_id,
          points_earned, transaction_type, description
        ) VALUES (
          NEW.installer_id, v_company_id, NEW.lead_id,
          v_serial_points, 'lead_won',
          CASE
            WHEN NEW.source_type = 'self_reported' THEN 'Installazione autonoma approvata: ' || NEW.serial_code
            ELSE 'Installazione da lead approvata: ' || NEW.serial_code
          END
        );

        SELECT COALESCE(SUM(p.points), 0) INTO v_installer_total
        FROM wallbox_serials ws
        JOIN products p ON p.id = ws.product_id
        WHERE ws.installer_id = NEW.installer_id
          AND ws.approval_status = 'approved';

        INSERT INTO installer_rewards (installer_id, total_points)
        VALUES (NEW.installer_id, v_installer_total)
        ON CONFLICT (installer_id)
        DO UPDATE SET total_points = v_installer_total, updated_at = now();

        SELECT id INTO v_new_tier_id FROM rewards_tiers
        WHERE points_required <= v_installer_total ORDER BY points_required DESC LIMIT 1;

        UPDATE installer_rewards
        SET current_tier_id = v_new_tier_id,
            tier_reached_at = CASE WHEN v_new_tier_id IS NOT NULL THEN now() ELSE NULL END
        WHERE installer_id = NEW.installer_id;

        IF v_company_id IS NOT NULL THEN
          SELECT COALESCE(SUM(p.points), 0) INTO v_company_total
          FROM wallbox_serials ws
          JOIN products p ON p.id = ws.product_id
          JOIN installers i ON i.id = ws.installer_id
          WHERE i.company_id = v_company_id
            AND ws.approval_status = 'approved';

          INSERT INTO company_rewards (company_id, total_points)
          VALUES (v_company_id, v_company_total)
          ON CONFLICT (company_id)
          DO UPDATE SET total_points = v_company_total, updated_at = now();

          SELECT id INTO v_new_tier_id FROM rewards_tiers
          WHERE points_required <= v_company_total ORDER BY points_required DESC LIMIT 1;

          UPDATE company_rewards
          SET current_tier_id = v_new_tier_id,
              tier_reached_at = CASE WHEN v_new_tier_id IS NOT NULL THEN now() ELSE NULL END
          WHERE company_id = v_company_id;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_award_points_on_approval ON wallbox_serials;
CREATE TRIGGER trigger_award_points_on_approval
  AFTER UPDATE ON wallbox_serials
  FOR EACH ROW
  EXECUTE FUNCTION award_points_on_approval();

-- ============================================
-- STEP 5: Verify products
-- ============================================

SELECT code, name, points FROM products ORDER BY points, code;
