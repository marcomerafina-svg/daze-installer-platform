/*
  # Create Installation Companies Table

  ## Overview
  This migration creates the foundation for a hierarchical company system where installers
  can be part of an installation company. Companies accumulate points as a team and
  have their own tier levels.

  ## Changes Made

  ### 1. New Table `installation_companies`
  Main table for installation companies/agencies:
  - `id` (uuid, primary key) - Unique company identifier
  - `company_name` (text, unique, not null) - Company name (e.g., "Installazioni Milano SRL")
  - `vat_number` (text, unique) - Partita IVA / VAT number
  - `business_name` (text) - Ragione sociale / Legal business name
  - `address` (text) - Company headquarters address
  - `city` (text) - City
  - `province` (text) - Province/State
  - `zip_code` (text) - ZIP/Postal code
  - `phone` (text) - Company phone number
  - `email` (text) - Company email
  - `logo_url` (text) - Company logo (from storage)
  - `is_active` (boolean, default true) - Active status
  - `created_at` (timestamptz) - Creation date
  - `updated_at` (timestamptz) - Last update date

  ### 2. Indexes
  - Index on company_name for fast search
  - Index on is_active for filtering active companies
  - Index on city and province for geographic queries

  ### 3. Triggers
  - Auto-update updated_at timestamp on changes

  ### 4. Security
  - RLS enabled
  - Basic admin policy (company-specific policies added after installers update)

  ## Important Notes
  - Company names must be unique in the system
  - VAT numbers must be unique if provided
  - This table supports both single-installer companies (1:1) and multi-installer agencies
  - Companies can be deactivated but not deleted (for data integrity)
*/

-- Create installation_companies table
CREATE TABLE IF NOT EXISTS installation_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text UNIQUE NOT NULL,
  vat_number text UNIQUE,
  business_name text,
  address text,
  city text,
  province text,
  zip_code text,
  phone text,
  email text,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_installation_companies_name ON installation_companies(company_name);
CREATE INDEX IF NOT EXISTS idx_installation_companies_active ON installation_companies(is_active);
CREATE INDEX IF NOT EXISTS idx_installation_companies_city ON installation_companies(city);
CREATE INDEX IF NOT EXISTS idx_installation_companies_province ON installation_companies(province);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_installation_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_installation_companies_timestamp ON installation_companies;
CREATE TRIGGER trigger_update_installation_companies_timestamp
  BEFORE UPDATE ON installation_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_installation_companies_updated_at();

-- Enable RLS
ALTER TABLE installation_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin can do everything (Daze admin)
CREATE POLICY "Admin can manage all companies"
  ON installation_companies FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Add comments for documentation
COMMENT ON TABLE installation_companies IS 'Installation companies that can have multiple installers working under them';
COMMENT ON COLUMN installation_companies.company_name IS 'Unique company name displayed throughout the platform';
COMMENT ON COLUMN installation_companies.vat_number IS 'VAT number / Partita IVA for invoicing and legal purposes';
