/*
  # Seed Products Data

  ## Overview
  Inserts all 11 Daze wallbox/charger product models with their specifications.
  Each product has a unique code that matches the serial number format.

  ## Products Being Added

  ### Dazebox Line
  1. **Dazebox C** (DB07) - Special model with code 07
  2. **Dazebox Home T** (DT01) - Home line with cable
  3. **Dazebox Home S** (DS01) - Home line with socket
  4. **Dazebox Home TK** (DK01) - Home line TK variant
  5. **Dazebox Share T** (DT02) - Share line with cable
  6. **Dazebox Share S** (DS02) - Share line with socket
  7. **Dazebox Share TK** (DK02) - Share line TK variant

  ### Urban Line
  8. **Urban T** (UT01) - Urban with cable
  9. **Urban S** (US01) - Urban with socket

  ### Duo Line
  10. **Duo T** (OT01) - Duo with cable
  11. **Duo S** (OS01) - Duo with socket

  ## Serial Format Reference
  Format: AABBCCNNNNN
  - AA = Year (2 digits)
  - BB = Product type code (2 letters)
  - CC = Category code (2 digits: 01=Home, 02=Share, 07=C)
  - NNNNN = Production progressive (5 digits)

  ## Points System
  Points set to 0 for now - will be configured during gamification implementation.
  Different point values can be assigned based on:
  - Product complexity
  - Sales margins
  - Strategic priorities
  - Installation difficulty
*/

-- Insert all 11 products
INSERT INTO products (code, name, category, type, points, is_active) VALUES
  -- Dazebox C (special code 07)
  ('DB07', 'Dazebox C', 'C', 'C', 0, true),
  
  -- Dazebox Home line (code 01)
  ('DT01', 'Dazebox Home T', 'Home', 'T', 0, true),
  ('DS01', 'Dazebox Home S', 'Home', 'S', 0, true),
  ('DK01', 'Dazebox Home TK', 'Home', 'K', 0, true),
  
  -- Dazebox Share line (code 02)
  ('DT02', 'Dazebox Share T', 'Share', 'T', 0, true),
  ('DS02', 'Dazebox Share S', 'Share', 'S', 0, true),
  ('DK02', 'Dazebox Share TK', 'Share', 'K', 0, true),
  
  -- Urban line (code 01)
  ('UT01', 'Urban T', 'Urban', 'T', 0, true),
  ('US01', 'Urban S', 'Urban', 'S', 0, true),
  
  -- Duo line (code 01)
  ('OT01', 'Duo T', 'Duo', 'T', 0, true),
  ('OS01', 'Duo S', 'Duo', 'S', 0, true)
ON CONFLICT (code) DO NOTHING;