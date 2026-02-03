/*
  # Fix Lead Confirmation Trigger Authentication

  ## Problem
  The trigger `notify_admin_on_lead_confirmation` was not calling the Edge Function because:
  1. It was trying to use a JWT token that is NULL in database trigger context
  2. The Supabase URL configuration was looking for a variable that doesn't exist

  ## Solution
  1. Drop and recreate the trigger function with correct authentication
  2. Use the anon key directly instead of trying to extract JWT from request context
  3. Hardcode the correct Supabase URL instead of looking for a variable
  4. Keep the same notification logic and flow

  ## Changes
  - Drops the old `notify_admin_on_lead_confirmation` function
  - Creates new version with fixed authentication using anon key
  - Uses correct Supabase project URL: https://lrkkdastqrlxlyjewabg.supabase.co
  - Maintains all existing functionality (notification logs, async HTTP call, etc.)

  ## Testing
  After this migration:
  1. Confirm a lead in the installer dashboard
  2. Check that notification_logs gets a new entry with status 'pending'
  3. Check Edge Function logs for 'send-lead-confirmation-notification' calls
  4. Verify email arrives at marco.merafina@daze.eu
*/

-- Drop the existing trigger function
DROP FUNCTION IF EXISTS notify_admin_on_lead_confirmation() CASCADE;

-- Recreate the function with correct authentication
CREATE OR REPLACE FUNCTION notify_admin_on_lead_confirmation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_installer_record RECORD;
  v_lead_record RECORD;
  v_supabase_url text := 'https://lrkkdastqrlxlyjewabg.supabase.co';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxya2tkYXN0cXJseGx5amV3YWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzY3NjksImV4cCI6MjA3NzMxMjc2OX0.NoMpDSPchCjAdzGmR7bGOzW1EHv9yAF7VhLk-O9HJLU';
  v_notification_log_id uuid;
BEGIN
  -- Only proceed if confirmed_by_installer changed from false to true
  IF NEW.confirmed_by_installer = true AND (OLD.confirmed_by_installer IS NULL OR OLD.confirmed_by_installer = false) THEN

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
        'Authorization', 'Bearer ' || v_anon_key
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

  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_notify_admin_on_lead_confirmation ON lead_assignments;

CREATE TRIGGER trigger_notify_admin_on_lead_confirmation
  AFTER UPDATE ON lead_assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_lead_confirmation();

-- Add comment for documentation
COMMENT ON FUNCTION notify_admin_on_lead_confirmation() IS 'Sends email notification to admin when installer confirms lead contact. Uses anon key for authentication with Edge Function.';
