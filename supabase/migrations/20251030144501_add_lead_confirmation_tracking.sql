/*
  # Add Lead Confirmation Tracking System

  ## Description
  This migration adds fields to track when installers confirm they have contacted a lead
  and automatically sends email notifications to the admin when confirmation happens.

  ## 1. New Columns in `lead_assignments` Table

  ### `confirmed_by_installer` (boolean, default false)
  - Tracks whether the installer has confirmed they contacted the lead
  - Set to true when installer clicks "Conferma di aver contattato la lead"
  - Used to trigger automatic status change from 'Nuova' to 'In lavorazione'

  ### `confirmed_at` (timestamptz, nullable)
  - Timestamp of when the installer confirmed contact
  - Set automatically when confirmed_by_installer becomes true
  - Used for audit trail and tracking response times

  ## 2. Database Trigger

  ### `notify_admin_on_lead_confirmation`
  Automatically triggers when confirmed_by_installer changes from false to true
  - Calls the `send-lead-confirmation-notification` Edge Function via HTTP
  - Sends email to admin (marco.merafina@daze.eu) with confirmation details
  - Logs notification attempt in `notification_logs` table
  - Does NOT block the confirmation if notification fails

  ## 3. Important Notes
  - Confirmation automatically changes lead status from 'Nuova' to 'In lavorazione'
  - Status change is handled in the application layer, not by trigger
  - Email notification is sent asynchronously and won't block the UI
  - Failed notifications are logged but don't prevent confirmation
*/

-- Step 1: Add new columns to lead_assignments table
ALTER TABLE lead_assignments
ADD COLUMN IF NOT EXISTS confirmed_by_installer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- Step 2: Add index for performance on new columns
CREATE INDEX IF NOT EXISTS idx_lead_assignments_confirmed ON lead_assignments(confirmed_by_installer) WHERE confirmed_by_installer = true;
CREATE INDEX IF NOT EXISTS idx_lead_assignments_confirmed_at ON lead_assignments(confirmed_at) WHERE confirmed_at IS NOT NULL;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN lead_assignments.confirmed_by_installer IS 'True when installer confirms they have contacted the lead';
COMMENT ON COLUMN lead_assignments.confirmed_at IS 'Timestamp when installer confirmed contact with the lead';

-- Step 4: Create function to send notification when installer confirms lead
CREATE OR REPLACE FUNCTION notify_admin_on_lead_confirmation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_installer_record RECORD;
  v_lead_record RECORD;
  v_supabase_url text;
  v_notification_log_id uuid;
BEGIN
  -- Only proceed if confirmed_by_installer changed from false to true
  IF NEW.confirmed_by_installer = true AND (OLD.confirmed_by_installer IS NULL OR OLD.confirmed_by_installer = false) THEN

    -- Get Supabase URL from environment or use default
    v_supabase_url := current_setting('app.settings.supabase_url', true);

    IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
      v_supabase_url := 'https://lrkkdastqrlxlyjewabg.supabase.co';
    END IF;

    -- Get installer details
    SELECT i.id, i.email, i.first_name, i.last_name
    INTO v_installer_record
    FROM installers i
    WHERE i.id = NEW.installer_id;

    -- Get lead details
    SELECT l.id, l.first_name, l.last_name, l.phone, l.email, l.address
    INTO v_lead_record
    FROM leads l
    WHERE l.id = NEW.lead_id;

    -- Create notification log entry
    INSERT INTO notification_logs (
      assignment_id,
      installer_id,
      lead_id,
      email_sent_to,
      status
    ) VALUES (
      NEW.id,
      v_installer_record.id,
      v_lead_record.id,
      'marco.merafina@daze.eu',
      'pending'
    )
    RETURNING id INTO v_notification_log_id;

    -- Send notification asynchronously via pg_net
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-lead-confirmation-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'token'
      ),
      body := jsonb_build_object(
        'assignmentId', NEW.id,
        'installerName', v_installer_record.first_name || ' ' || v_installer_record.last_name,
        'installerEmail', v_installer_record.email,
        'leadName', v_lead_record.first_name || ' ' || v_lead_record.last_name,
        'leadPhone', v_lead_record.phone,
        'leadEmail', v_lead_record.email,
        'leadAddress', v_lead_record.address,
        'confirmedAt', NEW.confirmed_at,
        'notificationLogId', v_notification_log_id
      )
    );

    -- Log success
    RAISE NOTICE 'Confirmation notification queued for admin - Installer: % has confirmed lead: %',
      v_installer_record.first_name || ' ' || v_installer_record.last_name,
      v_lead_record.first_name || ' ' || v_lead_record.last_name;

  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the confirmation
    RAISE WARNING 'Failed to queue confirmation notification: %', SQLERRM;

    -- Update notification log with error if it was created
    IF v_notification_log_id IS NOT NULL THEN
      UPDATE notification_logs
      SET status = 'failed',
          error_message = SQLERRM
      WHERE id = v_notification_log_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Step 5: Create trigger on lead_assignments for confirmation notifications
DROP TRIGGER IF EXISTS trigger_notify_admin_on_confirmation ON lead_assignments;

CREATE TRIGGER trigger_notify_admin_on_confirmation
  AFTER UPDATE OF confirmed_by_installer ON lead_assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_lead_confirmation();

-- Step 6: Add RLS policies for the new columns (inherit from existing table policies)
-- No additional policies needed as lead_assignments already has proper RLS
