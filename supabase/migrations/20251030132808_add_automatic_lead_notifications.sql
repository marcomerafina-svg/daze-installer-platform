/*
  # Add Automatic Lead Notification System

  ## Description
  This migration adds automatic email notifications when a new lead is assigned to an installer.
  It creates a notification log table and a database trigger that automatically sends emails via
  the send-lead-notification Edge Function.

  ## 1. New Tables

  ### `notification_logs`
  Tracks all email notifications sent to installers
  - `id` (uuid, primary key) - Unique notification ID
  - `assignment_id` (uuid, foreign key) - Reference to lead_assignments
  - `installer_id` (uuid, foreign key) - Reference to installer who received notification
  - `lead_id` (uuid, foreign key) - Reference to the lead
  - `email_sent_to` (text) - Email address where notification was sent
  - `status` (text) - Status: 'pending', 'sent', 'failed'
  - `resend_message_id` (text) - Message ID from Resend API
  - `error_message` (text) - Error message if failed
  - `sent_at` (timestamptz) - Timestamp when email was sent
  - `created_at` (timestamptz) - Timestamp when record was created

  ## 2. Database Trigger

  ### `notify_installer_on_assignment`
  Automatically triggers when a new record is inserted into `lead_assignments`.
  - Calls the `send-lead-notification` Edge Function via HTTP request
  - Passes the assignment ID to the Edge Function
  - Logs the notification attempt in `notification_logs`
  - Does NOT block the lead assignment if notification fails

  ## 3. Security (RLS)

  ### `notification_logs` Policies
  - Admin can view all notification logs
  - Installers can view only their own notification logs
  - Only the system (via trigger) can insert notification logs

  ## 4. Important Notes
  - The trigger uses `pg_net` extension for HTTP requests from database
  - The RESEND_API_KEY must be configured in Supabase Edge Functions secrets
  - Failed notifications are logged but do not prevent lead assignment
  - The Edge Function must be deployed before this migration is applied
*/

-- Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES lead_assignments(id) ON DELETE CASCADE NOT NULL,
  installer_id uuid REFERENCES installers(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  email_sent_to text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  resend_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_assignment_id ON notification_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_installer_id ON notification_logs(installer_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view all notification logs
CREATE POLICY "Admin can view all notification logs"
  ON notification_logs FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Installers can view their own notification logs
CREATE POLICY "Installer can view own notification logs"
  ON notification_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installers i
      WHERE i.id = notification_logs.installer_id
      AND i.user_id = auth.uid()
    )
  );

-- Function to send notification via Edge Function
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
  -- Get Supabase URL from environment
  v_supabase_url := current_setting('app.settings.supabase_url', true);

  -- If not set, try to construct from current database
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://lrkkdastqrlxlyjewabg.supabase.co';
  END IF;

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
  -- This will not block the lead assignment if it fails
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

  -- Log success (actual email status will be updated by the Edge Function)
  RAISE NOTICE 'Notification queued for installer % (%) for lead %',
    v_installer_record.first_name || ' ' || v_installer_record.last_name,
    v_installer_record.email,
    v_lead_record.first_name || ' ' || v_lead_record.last_name;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the assignment
    RAISE WARNING 'Failed to queue notification: %', SQLERRM;

    -- Update notification log with error
    UPDATE notification_logs
    SET status = 'failed',
        error_message = SQLERRM
    WHERE id = v_notification_log_id;

    RETURN NEW;
END;
$$;

-- Create trigger on lead_assignments
DROP TRIGGER IF EXISTS trigger_notify_installer_on_assignment ON lead_assignments;

CREATE TRIGGER trigger_notify_installer_on_assignment
  AFTER INSERT ON lead_assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_installer_on_new_assignment();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO postgres, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA net TO postgres, authenticated, service_role;
