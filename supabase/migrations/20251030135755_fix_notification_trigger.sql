/*
  # Fix Notification Trigger

  ## Description
  Fixes the automatic notification trigger to use the anon key instead of trying to access
  the JWT token which is not available in the trigger context.

  ## Changes
  - Updates the trigger function to use the anon key for authenticating with the Edge Function
  - The anon key is hardcoded since it's public and safe to use
*/

-- Drop and recreate the function with fixed authentication
CREATE OR REPLACE FUNCTION notify_installer_on_new_assignment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_installer_record RECORD;
  v_lead_record RECORD;
  v_supabase_url text;
  v_anon_key text;
  v_notification_log_id uuid;
BEGIN
  -- Set Supabase URL and anon key
  v_supabase_url := 'https://lrkkdastqrlxlyjewabg.supabase.co';
  v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxya2tkYXN0cXJseGx5amV3YWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzY3NjksImV4cCI6MjA3NzMxMjc2OX0.NoMpDSPchCjAdzGmR7bGOzW1EHv9yAF7VhLk-O9HJLU';

  -- Get installer details
  SELECT i.id, i.email, i.first_name, i.last_name
  INTO v_installer_record
  FROM installers i
  WHERE i.id = NEW.installer_id;

  -- Get lead details
  SELECT l.id, l.first_name, l.last_name, l.phone, l.description
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
    v_installer_record.email,
    'pending'
  )
  RETURNING id INTO v_notification_log_id;

  -- Send notification asynchronously via pg_net
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-lead-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'assignmentId', NEW.id,
      'installerEmail', v_installer_record.email,
      'installerName', v_installer_record.first_name || ' ' || v_installer_record.last_name,
      'leadName', v_lead_record.first_name || ' ' || v_lead_record.last_name,
      'leadPhone', v_lead_record.phone,
      'leadDescription', v_lead_record.description,
      'notificationLogId', v_notification_log_id
    )
  );

  RAISE NOTICE 'Notification queued for installer % (%) for lead %',
    v_installer_record.first_name || ' ' || v_installer_record.last_name,
    v_installer_record.email,
    v_lead_record.first_name || ' ' || v_lead_record.last_name;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue notification: %', SQLERRM;
    
    UPDATE notification_logs
    SET status = 'failed',
        error_message = SQLERRM
    WHERE id = v_notification_log_id;

    RETURN NEW;
END;
$$;
