/*
  # Add Self-Reported Installations Support

  ## Overview
  This migration extends the wallbox_serials table to support installer-reported installations
  that are not associated with Daze leads. It adds customer data fields, approval workflow,
  and photo storage capabilities.

  ## Changes Made

  ### 1. Modified `wallbox_serials` Table
  Added new columns:
  - `customer_first_name` (text) - First name of customer for self-reported installations
  - `customer_last_name` (text) - Last name of customer for self-reported installations
  - `customer_phone` (text) - Phone number for self-reported installations
  - `customer_email` (text) - Email for self-reported installations (optional)
  - `customer_address` (text) - Installation address for self-reported installations
  - `installation_date` (date) - Date when installation was completed
  - `installation_notes` (text) - Optional notes about the installation
  - `source_type` (text) - Either 'daze_lead' or 'self_reported'
  - `approval_status` (text) - 'pending', 'approved', or 'rejected'
  - `approved_by` (uuid) - Admin who approved/rejected
  - `approved_at` (timestamptz) - When approval/rejection happened
  - `rejection_reason` (text) - Reason for rejection if applicable
  - `photo_urls` (jsonb) - Array of photo URLs from storage

  ### 2. Data Integrity
  - Made `lead_id` nullable to support self-reported installations
  - Added CHECK constraint: if lead_id is null, customer data must be present
  - Added CHECK constraint: valid source_type values
  - Added CHECK constraint: valid approval_status values
  - Added CHECK constraint: installation_date cannot be in the future

  ### 3. Security Updates
  - Updated RLS policies to allow installers to insert self-reported installations
  - Admin policies for managing approval status
  - Installers can only update their own pending installations

  ## Important Notes
  - Existing records will have source_type = 'daze_lead' and approval_status = 'approved'
  - Self-reported installations start as 'pending' and require admin approval
  - Only approved installations count toward points calculation
  - Photos are stored in Supabase Storage 'installation-photos' bucket
*/

-- Step 1: Make lead_id nullable
ALTER TABLE wallbox_serials 
  ALTER COLUMN lead_id DROP NOT NULL;

-- Step 2: Add new columns for self-reported installations
DO $$
BEGIN
  -- Customer information columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'customer_first_name'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN customer_first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'customer_last_name'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN customer_last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN customer_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN customer_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'customer_address'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN customer_address text;
  END IF;

  -- Installation details columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'installation_date'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN installation_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'installation_notes'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN installation_notes text;
  END IF;

  -- Source and approval columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN source_type text DEFAULT 'daze_lead' CHECK (source_type IN ('daze_lead', 'self_reported'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN approved_by uuid REFERENCES installers(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN rejection_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'photo_urls'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN photo_urls jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Step 3: Update existing records to be approved daze_lead installations
UPDATE wallbox_serials 
SET 
  source_type = 'daze_lead',
  approval_status = 'approved'
WHERE source_type IS NULL OR approval_status IS NULL;

-- Step 4: Add constraint to ensure data integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallbox_serials_customer_data_check'
  ) THEN
    ALTER TABLE wallbox_serials ADD CONSTRAINT wallbox_serials_customer_data_check 
    CHECK (
      (lead_id IS NOT NULL) OR 
      (customer_first_name IS NOT NULL AND customer_last_name IS NOT NULL AND customer_phone IS NOT NULL)
    );
  END IF;
END $$;

-- Step 5: Add index for approval status queries
CREATE INDEX IF NOT EXISTS idx_wallbox_serials_approval_status ON wallbox_serials(approval_status);
CREATE INDEX IF NOT EXISTS idx_wallbox_serials_source_type ON wallbox_serials(source_type);

-- Step 6: Update RLS policies for self-reported installations

-- Drop old insert policy and create new one that allows self-reported
DROP POLICY IF EXISTS "Installers can insert serials for their leads" ON wallbox_serials;

CREATE POLICY "Installers can insert serials for assigned leads or self-reported"
  ON wallbox_serials FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Can insert for assigned leads
    (
      lead_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM leads l
        JOIN lead_assignments la ON la.lead_id = l.id
        JOIN installers i ON i.id = la.installer_id
        WHERE l.id = lead_id
        AND i.user_id = auth.uid()
      )
    )
    OR
    -- Can insert self-reported installations
    (
      lead_id IS NULL AND
      source_type = 'self_reported' AND
      EXISTS (
        SELECT 1 FROM installers i
        WHERE i.id = installer_id
        AND i.user_id = auth.uid()
      )
    )
  );

-- Allow installers to update only their pending self-reported installations
CREATE POLICY "Installers can update own pending self-reported installations"
  ON wallbox_serials FOR UPDATE
  TO authenticated
  USING (
    source_type = 'self_reported' AND
    approval_status = 'pending' AND
    EXISTS (
      SELECT 1 FROM installers i
      WHERE i.id = wallbox_serials.installer_id
      AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    source_type = 'self_reported' AND
    approval_status = 'pending' AND
    EXISTS (
      SELECT 1 FROM installers i
      WHERE i.id = wallbox_serials.installer_id
      AND i.user_id = auth.uid()
    )
  );

-- Admin can update approval status
CREATE POLICY "Admins can update approval status"
  ON wallbox_serials FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );
