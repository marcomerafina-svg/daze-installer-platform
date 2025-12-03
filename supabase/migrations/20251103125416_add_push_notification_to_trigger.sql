/*
  # Update Lead Assignment Trigger to Include Push Notifications

  ## Description
  This migration updates the existing database trigger to also send push notifications
  when a new lead is assigned to an installer. It extends the current email notification
  system to include browser push notifications.

  ## Changes
  1. Update the `notify_installer_on_new_assignment` function to also call the
     `send-push-notification` Edge Function
  2. Add async push notification sending after email notification
  3. Maintain backward compatibility with existing email notifications
  4. Ensure push notifications don't block lead assignment if they fail

  ## Important Notes
  - Push notifications are sent in addition to email notifications
  - If push notification fails, the lead assignment still succeeds
  - The `send-push-notification` Edge Function must be deployed
  - Requires active push subscriptions in the `push_subscriptions` table
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

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-lead-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'token'
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
