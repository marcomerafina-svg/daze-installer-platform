/*
  # Create Products and Wallbox Serials Tables

  ## Overview
  This migration creates a comprehensive product tracking system that enables:
  - Automatic product identification from serial codes
  - Multiple wallbox serials per installation
  - Future gamification with points system
  - Detailed installation tracking and reporting

  ## New Tables

  ### 1. `products`
  Stores all Daze wallbox/charger models with their specifications:
  - `id` (uuid, primary key) - Unique product identifier
  - `code` (text, unique) - Product code from serial (e.g., 'DT01', 'DS02', 'DB07')
  - `name` (text) - Full product name (e.g., 'Dazebox Home T')
  - `category` (text) - Product line (Home, Share, Urban, Duo, or C for Dazebox C)
  - `type` (text) - Connection type (T=cable, S=socket, K=TK variant, C=Dazebox C)
  - `points` (integer) - Points awarded for gamification (default 0 for now)
  - `is_active` (boolean) - Whether product is currently available
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. `wallbox_serials`
  Tracks individual wallbox serial numbers with automatic product recognition:
  - `id` (uuid, primary key) - Unique serial record identifier
  - `lead_id` (uuid, foreign key) - Associated lead/installation
  - `serial_code` (text, unique) - The actual serial number (e.g., '25DT0101143')
  - `product_id` (uuid, foreign key) - Auto-identified product
  - `year` (integer) - Extracted from serial (e.g., 2025)
  - `production_number` (integer) - Extracted progressive number
  - `installer_id` (uuid, foreign key) - Installer who registered the serial
  - `created_at` (timestamptz) - Registration timestamp

  ## Security
  - RLS enabled on both tables
  - Admins can view and manage all records
  - Installers can view products and their own serials
  - Installers can only insert serials for their assigned leads

  ## Indexes
  - Fast lookups on serial_code, lead_id, product_id
  - Efficient filtering by installer and product

  ## Important Notes
  1. Serial codes must be unique across the entire system
  2. Product codes map to serial format (year + code + version + progressive)
  3. Points field prepared for future gamification features
  4. Existing single serials from leads table will be migrated in next step
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  type text NOT NULL,
  points integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create wallbox_serials table
CREATE TABLE IF NOT EXISTS wallbox_serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  serial_code text UNIQUE NOT NULL,
  product_id uuid REFERENCES products(id),
  year integer,
  production_number integer,
  installer_id uuid REFERENCES installers(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallbox_serials_lead_id ON wallbox_serials(lead_id);
CREATE INDEX IF NOT EXISTS idx_wallbox_serials_serial_code ON wallbox_serials(serial_code);
CREATE INDEX IF NOT EXISTS idx_wallbox_serials_product_id ON wallbox_serials(product_id);
CREATE INDEX IF NOT EXISTS idx_wallbox_serials_installer_id ON wallbox_serials(installer_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallbox_serials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products table
CREATE POLICY "Anyone authenticated can view active products"
  ON products FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installers
      WHERE installers.user_id = auth.uid()
      AND installers.email LIKE '%@daze.it'
    )
  );

-- RLS Policies for wallbox_serials table
CREATE POLICY "Admins can view all serials"
  ON wallbox_serials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installers
      WHERE installers.user_id = auth.uid()
      AND installers.email LIKE '%@daze.it'
    )
  );

CREATE POLICY "Installers can view their own serials"
  ON wallbox_serials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installers
      WHERE installers.user_id = auth.uid()
      AND installers.id = wallbox_serials.installer_id
    )
    OR
    EXISTS (
      SELECT 1 FROM leads l
      JOIN lead_assignments la ON la.lead_id = l.id
      JOIN installers i ON i.id = la.installer_id
      WHERE l.id = wallbox_serials.lead_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Installers can insert serials for their leads"
  ON wallbox_serials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN lead_assignments la ON la.lead_id = l.id
      JOIN installers i ON i.id = la.installer_id
      WHERE l.id = lead_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all serials"
  ON wallbox_serials FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installers
      WHERE installers.user_id = auth.uid()
      AND installers.email LIKE '%@daze.it'
    )
  );