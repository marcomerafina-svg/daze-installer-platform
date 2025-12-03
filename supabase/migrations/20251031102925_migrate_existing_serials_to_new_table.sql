/*
  # Migrate Existing Wallbox Serials

  ## Overview
  Migrates any existing serial codes from the legacy `leads.wallbox_serial` column
  to the new `wallbox_serials` table with automatic product recognition.

  ## Migration Steps
  1. Find all leads with non-null wallbox_serial values
  2. For each serial, attempt to parse and identify the product
  3. Insert into wallbox_serials table with proper relationships
  4. Preserve the original serial even if product can't be auto-identified

  ## Important Notes
  - Legacy serials are preserved in leads table for backward compatibility
  - Only serials that can be validated are migrated
  - Installer ID is attempted to be determined from lead_assignments
  - This is a one-time migration and will skip if serials already exist
*/

DO $$
DECLARE
  lead_record RECORD;
  assignment_record RECORD;
  serial_text text;
  product_record RECORD;
  extracted_year integer;
  extracted_prod_num integer;
BEGIN
  -- Loop through all leads with wallbox_serial that haven't been migrated yet
  FOR lead_record IN 
    SELECT l.id as lead_id, l.wallbox_serial
    FROM leads l
    WHERE l.wallbox_serial IS NOT NULL 
    AND l.wallbox_serial != ''
    AND NOT EXISTS (
      SELECT 1 FROM wallbox_serials ws WHERE ws.lead_id = l.id
    )
  LOOP
    serial_text := UPPER(TRIM(lead_record.wallbox_serial));
    
    -- Skip if serial is invalid length
    IF LENGTH(serial_text) != 11 THEN
      CONTINUE;
    END IF;

    -- Try to find the installer for this lead
    SELECT la.installer_id INTO assignment_record
    FROM lead_assignments la
    WHERE la.lead_id = lead_record.lead_id
    LIMIT 1;

    -- Try to match product by code pattern
    -- Extract year (first 2 digits)
    BEGIN
      extracted_year := 2000 + SUBSTRING(serial_text, 1, 2)::integer;
    EXCEPTION WHEN OTHERS THEN
      extracted_year := NULL;
    END;

    -- Extract production number (last 5 digits)
    BEGIN
      extracted_prod_num := SUBSTRING(serial_text, 7, 5)::integer;
    EXCEPTION WHEN OTHERS THEN
      extracted_prod_num := NULL;
    END;

    -- Try to find matching product
    SELECT * INTO product_record FROM products WHERE
      serial_text LIKE '__' || code || '%'
    LIMIT 1;

    -- Insert the serial
    INSERT INTO wallbox_serials (
      lead_id,
      serial_code,
      product_id,
      year,
      production_number,
      installer_id,
      created_at
    ) VALUES (
      lead_record.lead_id,
      serial_text,
      product_record.id,
      extracted_year,
      extracted_prod_num,
      assignment_record.installer_id,
      NOW()
    )
    ON CONFLICT (serial_code) DO NOTHING;

  END LOOP;
END $$;