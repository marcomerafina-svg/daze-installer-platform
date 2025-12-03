/*
  # Fix Notification Trigger Authentication

  ## Description
  This migration fixes the notification trigger to work without JWT authentication.
  The trigger was failing because it was trying to pass a JWT token that doesn't
  exist in the trigger context.

  ## Changes
  1. Remove Authorization header from send-lead-notification call
  2. Keep the trigger working without authentication

  ## Notes
  - Both edge functions (send-lead-notification and send-push-notification) must have verify_jwt=false
  - The trigger runs in a trusted context (database) so authentication is not needed
*/

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
  v_notification_log_id uuid;
BEGIN
  v_supabase_url := current_setting('app.settings.supabase_url', true);

  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://lrkkdastqrlxlyjewabg.supabase.co';
  END IF;

  SELECT i.id, i.email, i.first_name, i.last_name
  INTO v_installer_record
  FROM installers i
  WHERE i.id = NEW.installer_id;

  SELECT l.id, l.first_name, l.last_name, l.phone, l.description
  INTO v_lead_record
  FROM leads l
  WHERE l.id = NEW.lead_id;

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

  -- Send email notification (without auth header)
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-lead-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
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

  -- Send push notification (without auth header)
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'installerId', v_installer_record.id::text,
      'leadId', v_lead_record.id::text,
      'leadName', v_lead_record.first_name || ' ' || v_lead_record.last_name,
      'leadPhone', v_lead_record.phone,
      'assignmentId', NEW.id::text
    )
  );

  RAISE NOTICE 'Email and push notifications queued for installer % (%) for lead %',
    v_installer_record.first_name || ' ' || v_installer_record.last_name,
    v_installer_record.email,
    v_lead_record.first_name || ' ' || v_lead_record.last_name;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue notifications: %', SQLERRM;

    UPDATE notification_logs
    SET status = 'failed',
        error_message = SQLERRM
    WHERE id = v_notification_log_id;

    RETURN NEW;
END;
$$;