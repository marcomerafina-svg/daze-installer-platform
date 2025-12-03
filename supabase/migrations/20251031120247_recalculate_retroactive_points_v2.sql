/*
  # Recalculate Retroactive Points for All Installers

  ## Overview
  This migration performs a one-time retroactive calculation of points for all installers
  who have already closed leads as "Chiusa Vinta" before the points system was activated.

  ## What This Migration Does

  1. **Identifies All Won Leads with Products**
     - Finds all leads with status "Chiusa Vinta"
     - Links them to their assigned installers
     - Counts wallbox serials and calculates points

  2. **Creates Point Transactions**
     - Registers retroactive transactions in `points_transactions`
     - Marks them with type 'correction' to distinguish from automatic awards
     - Includes detailed descriptions with product information

  3. **Updates Installer Rewards**
     - Recalculates total points for each installer
     - Updates or creates records in `installer_rewards`
     - Triggers automatic tier updates based on new point totals

  4. **Updates Tiers Automatically**
     - The existing trigger `trigger_update_installer_tier` will fire
     - Installers who reach tier thresholds will be promoted automatically
     - Tier reached timestamps will be set to current time

  ## Expected Impact

  Based on current data:
  - Marco Bianchi has 5 won leads with 2 Dazebox Home T serials (200 points total)
  - Other installers may also have won leads that will be calculated
  - All installers will receive their earned points retroactively
  - Tiers will be assigned based on total points

  ## Safety Features

  - Only processes leads with status "Chiusa Vinta"
  - Only awards points for leads with registered wallbox serials
  - Uses transaction type 'correction' to identify retroactive awards
  - Idempotent: Can be run multiple times without duplicating points
  - Logs all changes for audit trail

  ## Notes

  - This is a one-time migration for historical data
  - Future points will be awarded automatically by the trigger system
  - Admins can manually adjust points through the admin interface if needed
*/

-- Create a temporary function to safely recalculate all points
CREATE OR REPLACE FUNCTION recalculate_all_installer_points()
RETURNS TABLE(
  result_installer_id uuid,
  installer_name text,
  points_awarded integer,
  leads_processed integer,
  products_counted integer
) AS $$
DECLARE
  v_installer record;
  v_lead record;
  v_points_for_lead integer;
  v_product_names text;
  v_total_points integer;
  v_total_leads integer;
  v_total_products integer;
BEGIN
  -- Loop through all installers
  FOR v_installer IN 
    SELECT i.id, i.first_name, i.last_name, i.email
    FROM installers i
  LOOP
    v_total_points := 0;
    v_total_leads := 0;
    v_total_products := 0;
    
    -- Find all won leads for this installer that have products
    FOR v_lead IN
      SELECT DISTINCT l.id as lead_id
      FROM leads l
      JOIN lead_assignments la ON la.lead_id = l.id
      WHERE la.installer_id = v_installer.id
        AND l.status = 'Chiusa Vinta'
        AND EXISTS (
          SELECT 1 FROM wallbox_serials ws 
          WHERE ws.lead_id = l.id
        )
        -- Avoid re-processing leads that already have point transactions
        AND NOT EXISTS (
          SELECT 1 FROM points_transactions pt
          WHERE pt.lead_id = l.id 
            AND pt.installer_id = v_installer.id
            AND pt.transaction_type IN ('lead_won', 'correction')
        )
    LOOP
      -- Calculate points for this specific lead
      SELECT 
        COALESCE(SUM(p.points), 0),
        string_agg(p.name, ', '),
        COUNT(*)
      INTO v_points_for_lead, v_product_names, v_total_products
      FROM wallbox_serials ws
      JOIN products p ON ws.product_id = p.id
      WHERE ws.lead_id = v_lead.lead_id;
      
      -- Only create transaction if there are points to award
      IF v_points_for_lead > 0 THEN
        -- Insert retroactive transaction
        INSERT INTO points_transactions (
          installer_id,
          lead_id,
          points_earned,
          transaction_type,
          description
        ) VALUES (
          v_installer.id,
          v_lead.lead_id,
          v_points_for_lead,
          'correction',
          'Ricalcolo retroattivo punti - Prodotti: ' || COALESCE(v_product_names, 'N/A')
        );
        
        v_total_points := v_total_points + v_points_for_lead;
        v_total_leads := v_total_leads + 1;
      END IF;
    END LOOP;
    
    -- Update installer_rewards if points were awarded
    IF v_total_points > 0 THEN
      -- Update or insert the rewards record
      INSERT INTO installer_rewards (installer_id, total_points)
      VALUES (v_installer.id, v_total_points)
      ON CONFLICT (installer_id)
      DO UPDATE SET
        total_points = installer_rewards.total_points + EXCLUDED.total_points,
        updated_at = now();
      
      -- Return summary for this installer
      result_installer_id := v_installer.id;
      installer_name := v_installer.first_name || ' ' || v_installer.last_name;
      points_awarded := v_total_points;
      leads_processed := v_total_leads;
      products_counted := v_total_products;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Execute the recalculation and log results
DO $$
DECLARE
  v_result record;
  v_total_installers integer := 0;
  v_total_points integer := 0;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RETROACTIVE POINTS RECALCULATION';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  
  -- Run the recalculation
  FOR v_result IN SELECT * FROM recalculate_all_installer_points()
  LOOP
    v_total_installers := v_total_installers + 1;
    v_total_points := v_total_points + v_result.points_awarded;
    
    RAISE NOTICE 'Installer: %', v_result.installer_name;
    RAISE NOTICE '  - Points awarded: %', v_result.points_awarded;
    RAISE NOTICE '  - Leads processed: %', v_result.leads_processed;
    RAISE NOTICE '  - Products counted: %', v_result.products_counted;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total installers with points: %', v_total_installers;
  RAISE NOTICE 'Total points awarded: %', v_total_points;
  RAISE NOTICE '';
  
  IF v_total_installers = 0 THEN
    RAISE NOTICE 'No retroactive points to award - all leads already processed!';
  ELSE
    RAISE NOTICE 'Retroactive points successfully awarded!';
  END IF;
END $$;

-- Clean up temporary function
DROP FUNCTION IF EXISTS recalculate_all_installer_points();

-- Force tier recalculation for all installers with points
UPDATE installer_rewards
SET 
  current_tier_id = get_tier_for_points(total_points),
  tier_reached_at = CASE 
    WHEN get_tier_for_points(total_points) IS NOT NULL 
    THEN now() 
    ELSE NULL 
  END,
  updated_at = now()
WHERE total_points > 0;

-- Log final state
DO $$
DECLARE
  v_installer record;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'FINAL INSTALLER REWARDS STATUS';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  
  FOR v_installer IN
    SELECT 
      i.first_name || ' ' || i.last_name as name,
      ir.total_points,
      rt.display_name as tier,
      rt.points_required as tier_threshold
    FROM installer_rewards ir
    JOIN installers i ON i.id = ir.installer_id
    LEFT JOIN rewards_tiers rt ON rt.id = ir.current_tier_id
    WHERE ir.total_points > 0
    ORDER BY ir.total_points DESC
  LOOP
    RAISE NOTICE 'Installer: %', v_installer.name;
    RAISE NOTICE '  - Total Points: %', v_installer.total_points;
    RAISE NOTICE '  - Current Tier: %', COALESCE(v_installer.tier, 'No tier yet');
    IF v_installer.tier IS NOT NULL THEN
      RAISE NOTICE '  - Tier Threshold: % points', v_installer.tier_threshold;
    END IF;
    RAISE NOTICE '';
  END LOOP;
END $$;
