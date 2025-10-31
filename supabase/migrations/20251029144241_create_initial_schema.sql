/*
  # Schema Iniziale Piattaforma Daze Lead Management
  
  ## Descrizione
  Questo migration crea l'intero schema per la piattaforma di gestione lead per installatori partner.
  Il sistema supporta due ruoli: admin (visibilità totale) e installer (visibilità solo proprie lead).
  
  ## 1. Tabelle Create
  
  ### `installers`
  Profilo degli installatori partner che ricevono e gestiscono le lead.
  - `id` (uuid, primary key) - ID univoco installatore
  - `user_id` (uuid, foreign key) - Collegamento a auth.users
  - `first_name` (text) - Nome installatore
  - `last_name` (text) - Cognome installatore
  - `email` (text) - Email (deve corrispondere a auth.users)
  - `phone` (text) - Numero di telefono
  - `is_active` (boolean) - Stato attivo/disattivato
  - `created_at` (timestamptz) - Data creazione
  - `updated_at` (timestamptz) - Data ultimo aggiornamento
  
  ### `leads`
  Anagrafica completa delle lead ricevute da Zoho CRM.
  - `id` (uuid, primary key) - ID univoco lead
  - `first_name` (text) - Nome cliente
  - `last_name` (text) - Cognome cliente
  - `email` (text) - Email cliente
  - `phone` (text) - Telefono cliente
  - `address` (text) - Indirizzo completo
  - `description` (text) - Descrizione necessità (tipo stazione, dettagli)
  - `status` (text) - Stato corrente nella pipeline
  - `zoho_lead_id` (text) - ID lead originale da Zoho CRM
  - `created_at` (timestamptz) - Data ricezione lead
  - `updated_at` (timestamptz) - Data ultimo aggiornamento
  
  ### `lead_assignments`
  Assegnazioni delle lead agli installatori.
  - `id` (uuid, primary key) - ID univoco assegnazione
  - `lead_id` (uuid, foreign key) - Riferimento alla lead
  - `installer_id` (uuid, foreign key) - Riferimento all'installatore
  - `assigned_at` (timestamptz) - Data assegnazione
  - `is_viewed` (boolean) - Se installatore ha visualizzato la lead
  - `viewed_at` (timestamptz) - Data prima visualizzazione
  
  ### `lead_status_history`
  Storico completo di tutti i cambiamenti di stato delle lead.
  - `id` (uuid, primary key) - ID univoco record storico
  - `lead_id` (uuid, foreign key) - Riferimento alla lead
  - `installer_id` (uuid, foreign key) - Chi ha cambiato lo stato
  - `old_status` (text) - Stato precedente
  - `new_status` (text) - Nuovo stato
  - `changed_at` (timestamptz) - Data e ora del cambiamento
  - `notes` (text) - Note opzionali sul cambiamento
  
  ### `lead_notes`
  Note e commenti degli installatori sulle lead.
  - `id` (uuid, primary key) - ID univoco nota
  - `lead_id` (uuid, foreign key) - Riferimento alla lead
  - `installer_id` (uuid, foreign key) - Autore della nota
  - `note_text` (text) - Contenuto della nota
  - `created_at` (timestamptz) - Data creazione nota
  
  ## 2. Sicurezza (Row Level Security)
  
  Tutte le tabelle hanno RLS abilitato con le seguenti policy:
  
  ### Policy Admin
  - Gli utenti con `raw_app_meta_data->>'role' = 'admin'` possono vedere e modificare tutto
  
  ### Policy Installer
  - Gli installatori possono vedere solo le lead a loro assegnate
  - Gli installatori possono modificare solo le loro lead e relative note
  - Gli installatori NON possono vedere o modificare dati di altri installatori
  
  ## 3. Stati Pipeline
  Stati validi per le lead:
  - 'Nuova' - Lead appena assegnata
  - 'Contattato' - Cliente contattato
  - 'Sopralluogo fissato' - Appuntamento fissato
  - 'Preventivo inviato' - Preventivo inviato al cliente
  - 'Chiusa vinta' - Lead convertita in vendita
  - 'Chiusa persa' - Lead non convertita
  
  ## 4. Note Importanti
  - Tutti gli installatori devono avere un account in auth.users
  - Il campo `raw_app_meta_data` in auth.users contiene il ruolo ('admin' o 'installer')
  - Le email devono corrispondere tra installers e auth.users
  - I trigger automatici gestiscono updated_at
*/

-- Abilita estensione per UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabella Installatori
CREATE TABLE IF NOT EXISTS installers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabella Lead
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text NOT NULL,
  address text,
  description text,
  status text DEFAULT 'Nuova' CHECK (status IN ('Nuova', 'Contattato', 'Sopralluogo fissato', 'Preventivo inviato', 'Chiusa vinta', 'Chiusa persa')),
  zoho_lead_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabella Assegnazioni Lead
CREATE TABLE IF NOT EXISTS lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  installer_id uuid REFERENCES installers(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  is_viewed boolean DEFAULT false,
  viewed_at timestamptz,
  UNIQUE(lead_id, installer_id)
);

-- Tabella Storico Stati Lead
CREATE TABLE IF NOT EXISTS lead_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  installer_id uuid REFERENCES installers(id) ON DELETE SET NULL,
  old_status text,
  new_status text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  notes text
);

-- Tabella Note Lead
CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  installer_id uuid REFERENCES installers(id) ON DELETE CASCADE NOT NULL,
  note_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead_id ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_installer_id ON lead_assignments(installer_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_installers_updated_at
  BEFORE UPDATE ON installers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE installers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES: installers
-- =============================================

-- Admin può vedere tutti gli installatori
CREATE POLICY "Admin can view all installers"
  ON installers FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Installatore può vedere solo il proprio profilo
CREATE POLICY "Installer can view own profile"
  ON installers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin può inserire nuovi installatori
CREATE POLICY "Admin can insert installers"
  ON installers FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Admin può aggiornare installatori
CREATE POLICY "Admin can update installers"
  ON installers FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Installatore può aggiornare il proprio profilo
CREATE POLICY "Installer can update own profile"
  ON installers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- POLICIES: leads
-- =============================================

-- Admin può vedere tutte le lead
CREATE POLICY "Admin can view all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Installatore può vedere solo le sue lead assegnate
CREATE POLICY "Installer can view assigned leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lead_assignments la
      JOIN installers i ON la.installer_id = i.id
      WHERE la.lead_id = leads.id
      AND i.user_id = auth.uid()
    )
  );

-- Admin può inserire lead
CREATE POLICY "Admin can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Admin può aggiornare tutte le lead
CREATE POLICY "Admin can update all leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Installatore può aggiornare solo le sue lead
CREATE POLICY "Installer can update assigned leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lead_assignments la
      JOIN installers i ON la.installer_id = i.id
      WHERE la.lead_id = leads.id
      AND i.user_id = auth.uid()
    )
  );

-- =============================================
-- POLICIES: lead_assignments
-- =============================================

-- Admin può vedere tutte le assegnazioni
CREATE POLICY "Admin can view all assignments"
  ON lead_assignments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Installatore può vedere solo le sue assegnazioni
CREATE POLICY "Installer can view own assignments"
  ON lead_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installers i
      WHERE i.id = lead_assignments.installer_id
      AND i.user_id = auth.uid()
    )
  );

-- Admin può creare assegnazioni
CREATE POLICY "Admin can insert assignments"
  ON lead_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Admin può aggiornare assegnazioni
CREATE POLICY "Admin can update assignments"
  ON lead_assignments FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Installatore può aggiornare le proprie assegnazioni (es. marcare come visto)
CREATE POLICY "Installer can update own assignments"
  ON lead_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installers i
      WHERE i.id = lead_assignments.installer_id
      AND i.user_id = auth.uid()
    )
  );

-- =============================================
-- POLICIES: lead_status_history
-- =============================================

-- Admin può vedere tutto lo storico
CREATE POLICY "Admin can view all history"
  ON lead_status_history FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Installatore può vedere lo storico delle sue lead
CREATE POLICY "Installer can view assigned lead history"
  ON lead_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lead_assignments la
      JOIN installers i ON la.installer_id = i.id
      WHERE la.lead_id = lead_status_history.lead_id
      AND i.user_id = auth.uid()
    )
  );

-- Admin può inserire nello storico
CREATE POLICY "Admin can insert history"
  ON lead_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Installatore può inserire nello storico delle sue lead
CREATE POLICY "Installer can insert own lead history"
  ON lead_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lead_assignments la
      JOIN installers i ON la.installer_id = i.id
      WHERE la.lead_id = lead_status_history.lead_id
      AND i.user_id = auth.uid()
      AND i.id = lead_status_history.installer_id
    )
  );

-- =============================================
-- POLICIES: lead_notes
-- =============================================

-- Admin può vedere tutte le note
CREATE POLICY "Admin can view all notes"
  ON lead_notes FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Installatore può vedere le note delle sue lead
CREATE POLICY "Installer can view own lead notes"
  ON lead_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lead_assignments la
      JOIN installers i ON la.installer_id = i.id
      WHERE la.lead_id = lead_notes.lead_id
      AND i.user_id = auth.uid()
    )
  );

-- Installatore può inserire note nelle sue lead
CREATE POLICY "Installer can insert notes on assigned leads"
  ON lead_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lead_assignments la
      JOIN installers i ON la.installer_id = i.id
      WHERE la.lead_id = lead_notes.lead_id
      AND i.user_id = auth.uid()
      AND i.id = lead_notes.installer_id
    )
  );

-- Installatore può aggiornare le proprie note
CREATE POLICY "Installer can update own notes"
  ON lead_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installers i
      WHERE i.id = lead_notes.installer_id
      AND i.user_id = auth.uid()
    )
  );

-- Installatore può cancellare le proprie note
CREATE POLICY "Installer can delete own notes"
  ON lead_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installers i
      WHERE i.id = lead_notes.installer_id
      AND i.user_id = auth.uid()
    )
  );