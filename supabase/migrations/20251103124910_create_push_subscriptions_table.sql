/*
  # Create Push Subscriptions Table

  1. New Tables
    - `push_subscriptions`
      - `id` (uuid, primary key)
      - `installer_id` (uuid, foreign key to installers)
      - `endpoint` (text, unique) - The push service endpoint URL
      - `p256dh_key` (text) - Public key for encryption
      - `auth_key` (text) - Authentication secret
      - `user_agent` (text) - Browser/device information
      - `is_active` (boolean) - Whether subscription is currently active
      - `last_used_at` (timestamptz) - Last time a notification was sent
      - `error_count` (integer) - Number of consecutive errors
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `push_subscriptions` table
    - Add policy for installers to read their own subscriptions
    - Add policy for authenticated installers to insert their own subscriptions
    - Add policy for authenticated installers to update their own subscriptions
    - Add policy for authenticated installers to delete their own subscriptions
    - System (service role) can do everything for sending notifications

  3. Indexes
    - Index on installer_id for faster queries
    - Index on endpoint for duplicate checking
    - Index on is_active for filtering active subscriptions
*/

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installer_id uuid NOT NULL REFERENCES installers(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  user_agent text DEFAULT '',
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  error_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_installer_id ON push_subscriptions(installer_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Installers can view own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Installers can insert own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Installers can update own push subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Installers can delete own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (
    installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_push_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_push_subscription_timestamp
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_timestamp();
