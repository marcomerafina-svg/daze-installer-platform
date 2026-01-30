/*
  # Update Product Points Values for Gamification System

  ## Overview
  This migration updates the points values for all products in the `products` table
  to enable the gamification system. Previously all products had 0 points, preventing
  installers from earning points when closing won leads.

  ## Points Assignment Strategy

  ### Dazebox C (50 points)
  - DB07: Dazebox C - 50 points

  ### Dazebox Home Line (100 points each)
  - DT01: Dazebox Home T - 100 points
  - DS01: Dazebox Home S - 100 points
  - DK01: Dazebox Home TK - 100 points

  ### Dazebox Share Line (100 points each)
  - DT02: Dazebox Share T - 100 points
  - DS02: Dazebox Share S - 100 points
  - DK02: Dazebox Share TK - 100 points

  ### Urban Line (500 points each)
  - UT01: Urban T - 500 points
  - US01: Urban S - 500 points

  ### Duo Line (250 points each)
  - OT01: Duo T - 250 points
  - OS01: Duo S - 250 points

  ## Impact
  After this migration:
  1. All products will have their correct point values
  2. The trigger `track_points_on_lead_won` will start assigning points automatically
  3. Existing won leads will need retroactive point calculation (next migration)
  4. Installers will earn points when closing leads as "Chiusa Vinta"

  ## Notes
  - This migration only updates the product points values
  - Retroactive point calculation for existing won leads will be handled separately
  - The gamification trigger system is already in place and will work automatically
*/

-- Update Dazebox C (50 points)
UPDATE products SET points = 50 WHERE code = 'DB07';

-- Update Dazebox Home line (100 points each)
UPDATE products SET points = 100 WHERE code IN ('DT01', 'DS01', 'DK01');

-- Update Dazebox Share line (100 points each)
UPDATE products SET points = 100 WHERE code IN ('DT02', 'DS02', 'DK02');

-- Update Urban line (500 points each)
UPDATE products SET points = 500 WHERE code IN ('UT01', 'US01');

-- Update Duo line (250 points each)
UPDATE products SET points = 250 WHERE code IN ('OT01', 'OS01');

-- Verify the updates
DO $$
DECLARE
  v_product_count integer;
  v_zero_points_count integer;
BEGIN
  -- Count total products
  SELECT COUNT(*) INTO v_product_count FROM products;
  
  -- Count products still with 0 points
  SELECT COUNT(*) INTO v_zero_points_count FROM products WHERE points = 0;
  
  -- Log results
  RAISE NOTICE 'Total products: %', v_product_count;
  RAISE NOTICE 'Products with 0 points: %', v_zero_points_count;
  RAISE NOTICE 'Products with assigned points: %', v_product_count - v_zero_points_count;
  
  -- Verify all products have points assigned
  IF v_zero_points_count > 0 THEN
    RAISE WARNING 'Some products still have 0 points!';
  ELSE
    RAISE NOTICE 'All products have points assigned successfully!';
  END IF;
END $$;
