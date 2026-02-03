/*
  # Update Rewards System to Handle Approval Status

  ## Overview
  This migration updates the rewards calculation system to only count points from
  approved installations. Self-reported installations must be approved by admin
  before points are awarded.

  ## Changes Made

  ### 1. Updated Points Calculation Function
  - Modified `calculate_installer_points` to only count approved serials
  - Filter wallbox_serials WHERE approval_status = 'approved'

  ### 2. Updated Trigger Functions
  - Modified `track_points_on_lead_won` to check approval status
  - Only create points transaction for approved installations

  ## Important Notes
  - Existing points from daze_lead installations remain unchanged (they're auto-approved)
  - Self-reported installations start as 'pending' and require admin approval
  - Points are only awarded after approval
  - Retroactive calculation respects approval status
*/

-- Drop existing function and recreate with approval status filter
CREATE OR REPLACE FUNCTION calculate_installer_points(p_installer_id uuid)
RETURNS integer AS $$
DECLARE
  total_points integer;
BEGIN
  SELECT COALESCE(SUM(p.points), 0)
  INTO total_points
  FROM wallbox_serials ws
  JOIN products p ON p.id = ws.product_id
  WHERE ws.installer_id = p_installer_id
    AND ws.approval_status = 'approved';

  RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Update trigger function to only award points for approved installations
CREATE OR REPLACE FUNCTION track_points_on_lead_won()
RETURNS TRIGGER AS $$
DECLARE
  v_installer_id uuid;
  v_total_points integer;
  v_lead_serials_points integer;
BEGIN
  IF (NEW.status = 'Chiusa Vinta' AND OLD.status != 'Chiusa Vinta') THEN
    SELECT installer_id INTO v_installer_id
    FROM lead_assignments
    WHERE lead_id = NEW.id
    LIMIT 1;

    IF v_installer_id IS NOT NULL THEN
      SELECT COALESCE(SUM(p.points), 0)
      INTO v_lead_serials_points
      FROM wallbox_serials ws
      JOIN products p ON p.id = ws.product_id
      WHERE ws.lead_id = NEW.id
        AND ws.installer_id = v_installer_id
        AND ws.approval_status = 'approved';

      IF v_lead_serials_points > 0 THEN
        INSERT INTO points_transactions (
          installer_id,
          lead_id,
          points_earned,
          transaction_type,
          description
        ) VALUES (
          v_installer_id,
          NEW.id,
          v_lead_serials_points,
          'lead_won',
          'Lead chiusa vinta con ' || v_lead_serials_points || ' punti da prodotti installati'
        );

        v_total_points := calculate_installer_points(v_installer_id);

        INSERT INTO installer_rewards (installer_id, total_points)
        VALUES (v_installer_id, v_total_points)
        ON CONFLICT (installer_id)
        DO UPDATE SET
          total_points = v_total_points,
          updated_at = now();
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger for when installations are approved
CREATE OR REPLACE FUNCTION award_points_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_total_points integer;
  v_serial_points integer;
BEGIN
  IF (NEW.approval_status = 'approved' AND OLD.approval_status = 'pending') THEN
    IF NEW.installer_id IS NOT NULL AND NEW.product_id IS NOT NULL THEN
      SELECT points INTO v_serial_points
      FROM products
      WHERE id = NEW.product_id;

      IF v_serial_points > 0 THEN
        INSERT INTO points_transactions (
          installer_id,
          lead_id,
          points_earned,
          transaction_type,
          description
        ) VALUES (
          NEW.installer_id,
          NEW.lead_id,
          v_serial_points,
          CASE
            WHEN NEW.source_type = 'self_reported' THEN 'lead_won'
            ELSE 'lead_won'
          END,
          CASE
            WHEN NEW.source_type = 'self_reported' THEN 'Installazione autonoma approvata: ' || NEW.serial_code
            ELSE 'Installazione da lead approvata: ' || NEW.serial_code
          END
        );

        v_total_points := calculate_installer_points(NEW.installer_id);

        INSERT INTO installer_rewards (installer_id, total_points)
        VALUES (NEW.installer_id, v_total_points)
        ON CONFLICT (installer_id)
        DO UPDATE SET
          total_points = v_total_points,
          updated_at = now();
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on wallbox_serials for approval
DROP TRIGGER IF EXISTS trigger_award_points_on_approval ON wallbox_serials;
CREATE TRIGGER trigger_award_points_on_approval
  AFTER UPDATE ON wallbox_serials
  FOR EACH ROW
  EXECUTE FUNCTION award_points_on_approval();

-- Recalculate all installer points with approval status filter
DO $$
DECLARE
  installer_record RECORD;
  new_total integer;
BEGIN
  FOR installer_record IN SELECT id FROM installers LOOP
    new_total := calculate_installer_points(installer_record.id);

    INSERT INTO installer_rewards (installer_id, total_points)
    VALUES (installer_record.id, new_total)
    ON CONFLICT (installer_id)
    DO UPDATE SET
      total_points = new_total,
      updated_at = now();
  END LOOP;
END $$;
