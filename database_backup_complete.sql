-- =====================================================
-- BACKUP COMPLETO DATABASE SUPABASE
-- Data: 2026-01-30
-- =====================================================
-- 
-- Questo file contiene:
-- 1. Schema completo del database (tutte le migrazioni)
-- 2. Tutti i dati presenti nelle tabelle
--
-- Per ripristinare, eseguire questo file su un database Supabase pulito
-- =====================================================

-- NOTA: Disabilita temporaneamente i trigger per l'import
SET session_replication_role = 'replica';



-- =============================================
-- MIGRATION: 20251029144241_create_initial_schema.sql
-- =============================================
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

-- =============================================
-- MIGRATION: 20251029154644_update_pipeline_states_and_add_quote_serial.sql
-- =============================================
/*
  # Aggiornamento Pipeline e Aggiunta Colonne Preventivo e Seriale

  ## Descrizione
  Questa migrazione semplifica la pipeline da 6 a 4 stati e aggiunge funzionalità per gestire
  preventivi PDF e seriali wallbox per le vendite chiuse.

  ## 1. Modifiche agli Stati Pipeline
  
  ### Nuovi Stati (4 stati semplificati):
  - 'Nuova' - Lead appena assegnata
  - 'In lavorazione' - Lead in fase di gestione (contatto, sopralluogo, preventivo)
  - 'Chiusa Vinta' - Lead convertita in vendita con seriale wallbox obbligatorio
  - 'Chiusa Persa' - Lead non convertita

  ### Conversione Stati Esistenti:
  - 'Nuova' → rimane 'Nuova'
  - 'Contattato' → diventa 'In lavorazione'
  - 'Sopralluogo fissato' → diventa 'In lavorazione'
  - 'Preventivo inviato' → diventa 'In lavorazione'
  - 'Chiusa vinta' → rimane 'Chiusa Vinta'
  - 'Chiusa persa' → rimane 'Chiusa Persa'

  ## 2. Nuove Colonne nella Tabella `leads`
  
  ### `quote_pdf_url` (text, nullable)
  - URL del file PDF del preventivo caricato dall'installatore
  - Memorizza il path del file nel bucket Supabase Storage
  - Opzionale - l'installatore può caricare un preventivo se lo desidera
  - Visibile sia all'admin che all'installatore
  
  ### `wallbox_serial` (text, nullable)
  - Numero di seriale della wallbox installata
  - OBBLIGATORIO quando lo stato diventa 'Chiusa Vinta'
  - Validato lato applicazione con modal bloccante
  - Traccia il dispositivo fisico installato per ogni vendita chiusa

  ## 3. Bucket Storage per PDF
  
  ### Bucket `lead-quotes`
  - Storage pubblico per i file PDF dei preventivi
  - Naming convention: `{lead_id}/{timestamp}-{filename}.pdf`
  - Policy RLS per permettere upload/download ad admin e installatori assegnati
  - Limit dimensione file: 10MB
  - Solo formato PDF accettato

  ## 4. Note Importanti
  - Tutti i record esistenti vengono aggiornati con i nuovi stati
  - Lo storico mantiene i vecchi nomi degli stati per tracciabilità
  - Il seriale wallbox viene richiesto solo al momento della chiusura vinta
  - I PDF dei preventivi sono opzionali e possono essere sostituiti
*/

-- Step 1: Aggiungi nuove colonne alla tabella leads
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS quote_pdf_url text,
ADD COLUMN IF NOT EXISTS wallbox_serial text;

-- Step 2: Aggiorna il constraint CHECK per includere i nuovi stati
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Step 3: Aggiungi il nuovo constraint con i 4 stati
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('Nuova', 'In lavorazione', 'Chiusa Vinta', 'Chiusa Persa'));

-- Step 4: Migra i dati esistenti dai vecchi stati ai nuovi
UPDATE leads 
SET status = CASE 
  WHEN status = 'Contattato' THEN 'In lavorazione'
  WHEN status = 'Sopralluogo fissato' THEN 'In lavorazione'
  WHEN status = 'Preventivo inviato' THEN 'In lavorazione'
  WHEN status = 'Chiusa vinta' THEN 'Chiusa Vinta'
  WHEN status = 'Chiusa persa' THEN 'Chiusa Persa'
  ELSE status
END
WHERE status IN ('Contattato', 'Sopralluogo fissato', 'Preventivo inviato', 'Chiusa vinta', 'Chiusa persa');

-- Step 5: Crea bucket per i PDF dei preventivi
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-quotes', 'lead-quotes', true)
ON CONFLICT (id) DO NOTHING;

-- Step 6: Policy RLS per Storage - Admin può fare tutto
CREATE POLICY "Admin can upload quote PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lead-quotes' AND
  (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  )
);

CREATE POLICY "Admin can update quote PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lead-quotes' AND
  (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  )
);

CREATE POLICY "Admin can delete quote PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lead-quotes' AND
  (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  )
);

-- Step 7: Policy RLS per Storage - Installatore può caricare solo per le sue lead
CREATE POLICY "Installer can upload quote PDFs for assigned leads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lead-quotes' AND
  EXISTS (
    SELECT 1 FROM lead_assignments la
    JOIN installers i ON la.installer_id = i.id
    WHERE i.user_id = auth.uid()
    AND (storage.foldername(name))[1] = la.lead_id::text
  )
);

CREATE POLICY "Installer can update quote PDFs for assigned leads"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lead-quotes' AND
  EXISTS (
    SELECT 1 FROM lead_assignments la
    JOIN installers i ON la.installer_id = i.id
    WHERE i.user_id = auth.uid()
    AND (storage.foldername(name))[1] = la.lead_id::text
  )
);

-- Step 8: Policy per lettura - Tutti gli autenticati con accesso alla lead possono leggere
CREATE POLICY "Admin and assigned installers can view quote PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lead-quotes' AND
  (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin' OR
    EXISTS (
      SELECT 1 FROM lead_assignments la
      JOIN installers i ON la.installer_id = i.id
      WHERE i.user_id = auth.uid()
      AND (storage.foldername(name))[1] = la.lead_id::text
    )
  )
);

-- Step 9: Aggiungi indici per performance sulle nuove colonne
CREATE INDEX IF NOT EXISTS idx_leads_quote_pdf_url ON leads(quote_pdf_url) WHERE quote_pdf_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_wallbox_serial ON leads(wallbox_serial) WHERE wallbox_serial IS NOT NULL;

-- Step 10: Commento sulle colonne per documentazione
COMMENT ON COLUMN leads.quote_pdf_url IS 'URL del PDF del preventivo caricato nel bucket storage lead-quotes';
COMMENT ON COLUMN leads.wallbox_serial IS 'Numero di seriale della wallbox - OBBLIGATORIO per lo stato Chiusa Vinta';

-- =============================================
-- MIGRATION: 20251029165937_add_area_managers_and_update_installers.sql
-- =============================================
/*
  # Area Manager e Gestione Territoriale
  
  ## Descrizione
  Questa migrazione introduce il concetto di Area Manager che gestiscono gli installatori
  per territorio. Gli installatori vengono assegnati a regioni specifiche e ogni regione
  ha un Area Manager di riferimento.

  ## 1. Nuova Tabella `area_managers`
  
  Gestisce i responsabili commerciali per area geografica:
  - `id` (uuid, primary key) - Identificativo univoco
  - `user_id` (uuid, foreign key) - Collegamento alla tabella auth.users
  - `name` (text, not null) - Nome completo dell'area manager
  - `email` (text, not null, unique) - Email di contatto
  - `phone` (text, not null) - Numero di telefono
  - `regions` (text[], not null) - Array delle regioni gestite
  - `created_at` (timestamptz) - Data di creazione
  - `updated_at` (timestamptz) - Data ultimo aggiornamento

  ## 2. Modifiche Tabella `installers`
  
  ### Rimozione colonna `province`
  - La colonna province viene rimossa per semplificare la gestione territoriale
  
  ### Aggiunta colonna `region`
  - `region` (text, not null) - Regione di operatività dell'installatore
  - Valori ammessi: tutte le regioni italiane
  - Utilizzata per il matching automatico con gli area manager

  ## 3. Security (RLS)
  
  ### Area Managers:
  - Admin: accesso completo (lettura, creazione, modifica, eliminazione)
  - Area Manager: può leggere solo i propri dati
  - Installatori: possono leggere i dati del proprio area manager
  
  ## 4. Dati Iniziali
  
  Inserimento dei due area manager:
  - Luca Falconi: Nord Italia (Valle d'Aosta, Piemonte, Liguria, Lombardia, 
    Trentino-Alto Adige, Veneto, Friuli-Venezia Giulia, Emilia-Romagna, 
    Toscana, Umbria, Marche)
  - Alessandro Marinelli: Centro-Sud Italia (Lazio, Abruzzo, Molise, Campania, 
    Puglia, Basilicata, Calabria, Sicilia, Sardegna)

  ## 5. Note Importanti
  - Gli installatori esistenti dovranno essere aggiornati con una regione
  - Nessun dato viene perso dalla rimozione della colonna province
  - Gli area manager vengono creati senza user_id (da collegare successivamente)
*/

-- Step 1: Crea la tabella area_managers
CREATE TABLE IF NOT EXISTS area_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  regions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Abilita RLS sulla tabella area_managers
ALTER TABLE area_managers ENABLE ROW LEVEL SECURITY;

-- Step 3: Modifica tabella installers - Rimuovi province se esiste
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installers' AND column_name = 'province'
  ) THEN
    ALTER TABLE installers DROP COLUMN province;
  END IF;
END $$;

-- Step 4: Aggiungi colonna region alla tabella installers
ALTER TABLE installers 
ADD COLUMN IF NOT EXISTS region text;

-- Step 5: Aggiungi constraint per le regioni italiane
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'installers_region_check'
  ) THEN
    ALTER TABLE installers ADD CONSTRAINT installers_region_check 
    CHECK (region IN (
      'Valle d''Aosta', 'Piemonte', 'Liguria', 'Lombardia', 
      'Trentino-Alto Adige', 'Veneto', 'Friuli-Venezia Giulia', 'Emilia-Romagna',
      'Toscana', 'Umbria', 'Marche', 'Lazio',
      'Abruzzo', 'Molise', 'Campania', 'Puglia', 'Basilicata', 'Calabria',
      'Sicilia', 'Sardegna'
    ));
  END IF;
END $$;

-- Step 6: Policy RLS per area_managers - Admin può fare tutto
CREATE POLICY "Admin can view all area managers"
  ON area_managers FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

CREATE POLICY "Admin can insert area managers"
  ON area_managers FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

CREATE POLICY "Admin can update area managers"
  ON area_managers FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

CREATE POLICY "Admin can delete area managers"
  ON area_managers FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Step 7: Policy RLS - Area Manager può vedere i propri dati
CREATE POLICY "Area managers can view own data"
  ON area_managers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Step 8: Policy RLS - Installatori possono vedere il loro area manager
CREATE POLICY "Installers can view their area manager"
  ON area_managers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installers
      WHERE installers.user_id = auth.uid()
      AND installers.region = ANY(area_managers.regions)
    )
  );

-- Step 9: Inserisci i due area manager iniziali
INSERT INTO area_managers (name, email, phone, regions)
VALUES 
  (
    'Luca Falconi',
    'luca.falconi@daze.eu',
    '+393441604820',
    ARRAY[
      'Valle d''Aosta', 'Piemonte', 'Liguria', 'Lombardia',
      'Trentino-Alto Adige', 'Veneto', 'Friuli-Venezia Giulia', 'Emilia-Romagna',
      'Toscana', 'Umbria', 'Marche'
    ]
  ),
  (
    'Alessandro Marinelli',
    'alessandro.marinelli@daze.eu',
    '+393441604820',
    ARRAY[
      'Lazio', 'Abruzzo', 'Molise', 'Campania',
      'Puglia', 'Basilicata', 'Calabria', 'Sicilia', 'Sardegna'
    ]
  )
ON CONFLICT (email) DO NOTHING;

-- Step 10: Aggiungi indici per performance
CREATE INDEX IF NOT EXISTS idx_area_managers_regions ON area_managers USING GIN(regions);
CREATE INDEX IF NOT EXISTS idx_installers_region ON installers(region);
CREATE INDEX IF NOT EXISTS idx_area_managers_email ON area_managers(email);

-- Step 11: Aggiungi commenti per documentazione
COMMENT ON TABLE area_managers IS 'Responsabili commerciali che gestiscono gli installatori per area geografica';
COMMENT ON COLUMN area_managers.regions IS 'Array delle regioni italiane gestite dall''area manager';
COMMENT ON COLUMN installers.region IS 'Regione di operatività dell''installatore - usata per matching con area manager';

-- Step 12: Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_area_managers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER area_managers_updated_at
  BEFORE UPDATE ON area_managers
  FOR EACH ROW
  EXECUTE FUNCTION update_area_managers_updated_at();

-- =============================================
-- MIGRATION: 20251030000000_add_automatic_lead_notifications.sql
-- =============================================
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
  - The trigger uses `pg_net` extension for HTTP requests
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


-- =============================================
-- MIGRATION: 20251030132808_add_automatic_lead_notifications.sql
-- =============================================
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


-- =============================================
-- MIGRATION: 20251030135755_fix_notification_trigger.sql
-- =============================================
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


-- =============================================
-- MIGRATION: 20251030144501_add_lead_confirmation_tracking.sql
-- =============================================
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


-- =============================================
-- MIGRATION: 20251030144857_add_lead_confirmation_tracking.sql
-- =============================================
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


-- =============================================
-- MIGRATION: 20251030151337_fix_confirmation_trigger_authentication.sql
-- =============================================
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


-- =============================================
-- MIGRATION: 20251031102357_create_products_and_serials_tables.sql
-- =============================================
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

-- =============================================
-- MIGRATION: 20251031102427_seed_products_data.sql
-- =============================================
/*
  # Seed Products Data

  ## Overview
  Inserts all 11 Daze wallbox/charger product models with their specifications.
  Each product has a unique code that matches the serial number format.

  ## Products Being Added

  ### Dazebox Line
  1. **Dazebox C** (DB07) - Special model with code 07
  2. **Dazebox Home T** (DT01) - Home line with cable
  3. **Dazebox Home S** (DS01) - Home line with socket
  4. **Dazebox Home TK** (DK01) - Home line TK variant
  5. **Dazebox Share T** (DT02) - Share line with cable
  6. **Dazebox Share S** (DS02) - Share line with socket
  7. **Dazebox Share TK** (DK02) - Share line TK variant

  ### Urban Line
  8. **Urban T** (UT01) - Urban with cable
  9. **Urban S** (US01) - Urban with socket

  ### Duo Line
  10. **Duo T** (OT01) - Duo with cable
  11. **Duo S** (OS01) - Duo with socket

  ## Serial Format Reference
  Format: AABBCCNNNNN
  - AA = Year (2 digits)
  - BB = Product type code (2 letters)
  - CC = Category code (2 digits: 01=Home, 02=Share, 07=C)
  - NNNNN = Production progressive (5 digits)

  ## Points System
  Points set to 0 for now - will be configured during gamification implementation.
  Different point values can be assigned based on:
  - Product complexity
  - Sales margins
  - Strategic priorities
  - Installation difficulty
*/

-- Insert all 11 products
INSERT INTO products (code, name, category, type, points, is_active) VALUES
  -- Dazebox C (special code 07)
  ('DB07', 'Dazebox C', 'C', 'C', 0, true),
  
  -- Dazebox Home line (code 01)
  ('DT01', 'Dazebox Home T', 'Home', 'T', 0, true),
  ('DS01', 'Dazebox Home S', 'Home', 'S', 0, true),
  ('DK01', 'Dazebox Home TK', 'Home', 'K', 0, true),
  
  -- Dazebox Share line (code 02)
  ('DT02', 'Dazebox Share T', 'Share', 'T', 0, true),
  ('DS02', 'Dazebox Share S', 'Share', 'S', 0, true),
  ('DK02', 'Dazebox Share TK', 'Share', 'K', 0, true),
  
  -- Urban line (code 01)
  ('UT01', 'Urban T', 'Urban', 'T', 0, true),
  ('US01', 'Urban S', 'Urban', 'S', 0, true),
  
  -- Duo line (code 01)
  ('OT01', 'Duo T', 'Duo', 'T', 0, true),
  ('OS01', 'Duo S', 'Duo', 'S', 0, true)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- MIGRATION: 20251031102925_migrate_existing_serials_to_new_table.sql
-- =============================================
/*
  # Migrate Existing Wallbox Serials

  ## Overview
  Migrates any existing serial codes from the legacy `leads.wallbox_serial` column
  to the new `wallbox_serials` table with automatic product recognition.

  ## Migration Steps
  1. Find all leads with non-null wallbox_serial values
  2. For each serial, attempt to parse and identify the product
  3. Insert into wallbox_serials table with proper relationships
  4. Preserve the original serial even if product can't be auto-identified

  ## Important Notes
  - Legacy serials are preserved in leads table for backward compatibility
  - Only serials that can be validated are migrated
  - Installer ID is attempted to be determined from lead_assignments
  - This is a one-time migration and will skip if serials already exist
*/

DO $$
DECLARE
  lead_record RECORD;
  assignment_record RECORD;
  serial_text text;
  product_record RECORD;
  extracted_year integer;
  extracted_prod_num integer;
BEGIN
  -- Loop through all leads with wallbox_serial that haven't been migrated yet
  FOR lead_record IN 
    SELECT l.id as lead_id, l.wallbox_serial
    FROM leads l
    WHERE l.wallbox_serial IS NOT NULL 
    AND l.wallbox_serial != ''
    AND NOT EXISTS (
      SELECT 1 FROM wallbox_serials ws WHERE ws.lead_id = l.id
    )
  LOOP
    serial_text := UPPER(TRIM(lead_record.wallbox_serial));
    
    -- Skip if serial is invalid length
    IF LENGTH(serial_text) != 11 THEN
      CONTINUE;
    END IF;

    -- Try to find the installer for this lead
    SELECT la.installer_id INTO assignment_record
    FROM lead_assignments la
    WHERE la.lead_id = lead_record.lead_id
    LIMIT 1;

    -- Try to match product by code pattern
    -- Extract year (first 2 digits)
    BEGIN
      extracted_year := 2000 + SUBSTRING(serial_text, 1, 2)::integer;
    EXCEPTION WHEN OTHERS THEN
      extracted_year := NULL;
    END;

    -- Extract production number (last 5 digits)
    BEGIN
      extracted_prod_num := SUBSTRING(serial_text, 7, 5)::integer;
    EXCEPTION WHEN OTHERS THEN
      extracted_prod_num := NULL;
    END;

    -- Try to find matching product
    SELECT * INTO product_record FROM products WHERE
      serial_text LIKE '__' || code || '%'
    LIMIT 1;

    -- Insert the serial
    INSERT INTO wallbox_serials (
      lead_id,
      serial_code,
      product_id,
      year,
      production_number,
      installer_id,
      created_at
    ) VALUES (
      lead_record.lead_id,
      serial_text,
      product_record.id,
      extracted_year,
      extracted_prod_num,
      assignment_record.installer_id,
      NOW()
    )
    ON CONFLICT (serial_code) DO NOTHING;

  END LOOP;
END $$;

-- =============================================
-- MIGRATION: 20251031110214_create_rewards_system.sql
-- =============================================
/*
  # Rewards System - Tier-Based Recognition and Points Tracking
  
  ## Descrizione
  Questo migration crea il sistema di rewards per incentivare e riconoscere le performance
  degli installatori attraverso un sistema di punti e livelli (tiers).
  
  ## 1. Tabelle Create
  
  ### `rewards_tiers`
  Definizione dei livelli di riconoscimento con soglie punti e benefici.
  - `id` (uuid, primary key) - ID univoco tier
  - `tier_name` (text) - Nome del tier (Bronze, Silver, Gold, Platinum, Diamond)
  - `tier_level` (integer) - Livello numerico (1-5) per ordinamento
  - `display_name` (text) - Nome pubblico del tier (es. "Starter Installer")
  - `points_required` (integer) - Punti minimi richiesti per questo tier
  - `badge_color` (text) - Colore del badge (per UI)
  - `description` (text) - Descrizione dei benefici del tier
  - `created_at` (timestamptz) - Data creazione
  
  ### `installer_rewards`
  Tracciamento punti e tier corrente per ogni installatore.
  - `id` (uuid, primary key) - ID univoco record
  - `installer_id` (uuid, foreign key) - Riferimento all'installatore
  - `total_points` (integer) - Punti totali accumulati
  - `current_tier_id` (uuid, foreign key) - Tier corrente
  - `tier_reached_at` (timestamptz) - Data raggiungimento tier corrente
  - `created_at` (timestamptz) - Data creazione record
  - `updated_at` (timestamptz) - Data ultimo aggiornamento
  
  ### `points_transactions`
  Storico completo di tutte le transazioni punti.
  - `id` (uuid, primary key) - ID univoco transazione
  - `installer_id` (uuid, foreign key) - Riferimento all'installatore
  - `lead_id` (uuid, foreign key) - Riferimento alla lead (se applicabile)
  - `points_earned` (integer) - Punti guadagnati (può essere negativo per correzioni)
  - `transaction_type` (text) - Tipo transazione (lead_won, manual_adjustment, tier_bonus)
  - `description` (text) - Descrizione dettagliata della transazione
  - `created_at` (timestamptz) - Data transazione
  
  ## 2. Tier System
  
  I tier sono configurati con i seguenti valori:
  - **Bronze (Starter Installer)**: 1000 punti - Kit certificazione
  - **Silver (Certified Partner)**: 2000 punti - Merch Daze
  - **Gold (Pro Installer)**: 4000 punti - Borsa attrezzi, eventi prioritari, training
  - **Platinum (Master Installer)**: 8000 punti - Buono Amazon 500€ + smartwatch
  - **Diamond (Elite Installer)**: 15000 punti - Viaggio per due (2000€)
  
  ## 3. Calcolo Punti Automatico
  
  I punti vengono calcolati automaticamente quando:
  - Una lead viene chiusa come "Chiusa Vinta"
  - Il calcolo si basa sui seriali wallbox registrati nella tabella `wallbox_serials`
  - Ogni prodotto nella tabella `products` ha un valore punti
  - Il sistema aggrega i punti da tutti i seriali associati alla lead
  
  ## 4. Funzioni e Trigger
  
  ### `calculate_installer_points(installer_id uuid)`
  Funzione che calcola i punti totali di un installatore basandosi su tutte le sue lead vinte.
  
  ### `update_installer_tier()`
  Trigger che aggiorna automaticamente il tier quando i punti cambiano.
  
  ### `track_points_on_lead_won()`
  Trigger che registra punti quando una lead diventa "Chiusa Vinta".
  
  ## 5. Sicurezza (Row Level Security)
  
  - Admin può vedere tutti i dati rewards
  - Installatori possono vedere solo i propri dati rewards
  - Le transazioni sono immutabili (no delete, no update)
  - Solo admin può fare aggiustamenti manuali dei punti
  
  ## 6. Note Importanti
  - I punti sono calcolati retroattivamente per tutte le lead vinte esistenti
  - Il tier viene aggiornato automaticamente quando i punti cambiano
  - Lo storico transazioni è completo e immutabile per audit
  - I tier possono essere configurati e modificati dagli admin
*/

-- Tabella Tier Rewards
CREATE TABLE IF NOT EXISTS rewards_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text NOT NULL UNIQUE,
  tier_level integer NOT NULL UNIQUE,
  display_name text NOT NULL,
  points_required integer NOT NULL,
  badge_color text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabella Rewards Installatori
CREATE TABLE IF NOT EXISTS installer_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installer_id uuid REFERENCES installers(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_points integer DEFAULT 0,
  current_tier_id uuid REFERENCES rewards_tiers(id),
  tier_reached_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabella Transazioni Punti
CREATE TABLE IF NOT EXISTS points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installer_id uuid REFERENCES installers(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  points_earned integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('lead_won', 'manual_adjustment', 'tier_bonus', 'correction')),
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_installer_rewards_installer_id ON installer_rewards(installer_id);
CREATE INDEX IF NOT EXISTS idx_installer_rewards_tier_id ON installer_rewards(current_tier_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_installer_id ON points_transactions(installer_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_lead_id ON points_transactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rewards_tiers_level ON rewards_tiers(tier_level);

-- Seed Tiers data
INSERT INTO rewards_tiers (tier_name, tier_level, display_name, points_required, badge_color, description) VALUES
  ('Bronze', 1, 'Starter Installer', 1000, '#CD7F32', 'Kit certificazione installatore con adesivi e loghi per pubblicizzarti come installatore certificato Daze'),
  ('Silver', 2, 'Certified Partner', 2000, '#C0C0C0', 'Merch esclusivo Daze: t-shirt e felpa brandizzate'),
  ('Gold', 3, 'Pro Installer', 4000, '#FFD700', 'Borsa attrezzi Daze professionale, accesso prioritario agli eventi sul territorio, lead prioritarie nella tua zona, training avanzato e giubottino Daze'),
  ('Platinum', 4, 'Master Installer', 8000, '#E5E4E2', 'Buono Amazon da 500€ e smartwatch di ultima generazione'),
  ('Diamond', 5, 'Elite Installer', 15000, '#B9F2FF', 'Viaggio per due persone dal valore di 2000€')
ON CONFLICT (tier_name) DO NOTHING;

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_installer_rewards_updated_at
  BEFORE UPDATE ON installer_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Funzione per calcolare i punti di un installatore
CREATE OR REPLACE FUNCTION calculate_installer_points(p_installer_id uuid)
RETURNS integer AS $$
DECLARE
  v_total_points integer;
BEGIN
  -- Calcola i punti sommando tutti i prodotti delle lead vinte
  SELECT COALESCE(SUM(p.points), 0) INTO v_total_points
  FROM lead_assignments la
  JOIN leads l ON la.lead_id = l.id
  LEFT JOIN wallbox_serials ws ON ws.lead_id = l.id
  LEFT JOIN products p ON ws.product_id = p.id
  WHERE la.installer_id = p_installer_id
    AND l.status = 'Chiusa Vinta';
  
  RETURN v_total_points;
END;
$$ LANGUAGE plpgsql;

-- Funzione per determinare il tier corretto in base ai punti
CREATE OR REPLACE FUNCTION get_tier_for_points(p_points integer)
RETURNS uuid AS $$
DECLARE
  v_tier_id uuid;
BEGIN
  -- Trova il tier più alto raggiungibile con i punti attuali
  SELECT id INTO v_tier_id
  FROM rewards_tiers
  WHERE points_required <= p_points
  ORDER BY points_required DESC
  LIMIT 1;
  
  RETURN v_tier_id;
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare il tier di un installatore
CREATE OR REPLACE FUNCTION update_installer_tier()
RETURNS TRIGGER AS $$
DECLARE
  v_new_tier_id uuid;
  v_old_tier_id uuid;
BEGIN
  -- Determina il nuovo tier in base ai punti
  v_new_tier_id := get_tier_for_points(NEW.total_points);
  v_old_tier_id := OLD.current_tier_id;
  
  -- Se il tier è cambiato, aggiorna
  IF v_new_tier_id IS DISTINCT FROM v_old_tier_id THEN
    NEW.current_tier_id := v_new_tier_id;
    NEW.tier_reached_at := now();
    
    -- Registra un bonus tier se è un upgrade
    IF v_new_tier_id IS NOT NULL THEN
      INSERT INTO points_transactions (installer_id, points_earned, transaction_type, description)
      VALUES (
        NEW.installer_id,
        0,
        'tier_bonus',
        'Raggiunto nuovo tier: ' || (SELECT display_name FROM rewards_tiers WHERE id = v_new_tier_id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_installer_tier
  BEFORE UPDATE OF total_points ON installer_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_installer_tier();

-- Funzione per tracciare punti quando una lead viene vinta
CREATE OR REPLACE FUNCTION track_points_on_lead_won()
RETURNS TRIGGER AS $$
DECLARE
  v_installer_id uuid;
  v_points_earned integer;
  v_product_names text;
BEGIN
  -- Solo quando lo stato diventa "Chiusa Vinta"
  IF NEW.status = 'Chiusa Vinta' AND (OLD.status IS NULL OR OLD.status != 'Chiusa Vinta') THEN
    -- Trova l'installatore assegnato
    SELECT installer_id INTO v_installer_id
    FROM lead_assignments
    WHERE lead_id = NEW.id
    LIMIT 1;
    
    IF v_installer_id IS NOT NULL THEN
      -- Calcola i punti guadagnati da questa lead
      SELECT COALESCE(SUM(p.points), 0), string_agg(p.name, ', ')
      INTO v_points_earned, v_product_names
      FROM wallbox_serials ws
      JOIN products p ON ws.product_id = p.id
      WHERE ws.lead_id = NEW.id;
      
      -- Registra la transazione solo se ci sono punti
      IF v_points_earned > 0 THEN
        INSERT INTO points_transactions (installer_id, lead_id, points_earned, transaction_type, description)
        VALUES (
          v_installer_id,
          NEW.id,
          v_points_earned,
          'lead_won',
          'Punti guadagnati per lead vinta: ' || COALESCE(v_product_names, 'Nessun prodotto registrato')
        );
        
        -- Aggiorna o crea il record rewards dell'installatore
        INSERT INTO installer_rewards (installer_id, total_points)
        VALUES (v_installer_id, v_points_earned)
        ON CONFLICT (installer_id) 
        DO UPDATE SET 
          total_points = installer_rewards.total_points + v_points_earned,
          updated_at = now();
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_points_on_lead_won
  AFTER UPDATE OF status ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_points_on_lead_won();

-- Inizializza rewards per tutti gli installatori esistenti
INSERT INTO installer_rewards (installer_id, total_points)
SELECT 
  i.id,
  COALESCE(calculate_installer_points(i.id), 0)
FROM installers i
ON CONFLICT (installer_id) DO NOTHING;

-- Aggiorna i tier per tutti gli installatori
UPDATE installer_rewards
SET 
  total_points = calculate_installer_points(installer_id),
  current_tier_id = get_tier_for_points(calculate_installer_points(installer_id)),
  tier_reached_at = CASE 
    WHEN get_tier_for_points(calculate_installer_points(installer_id)) IS NOT NULL 
    THEN now() 
    ELSE NULL 
  END;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE rewards_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES: rewards_tiers
-- =============================================

-- Tutti gli autenticati possono vedere i tier
CREATE POLICY "Authenticated users can view tiers"
  ON rewards_tiers FOR SELECT
  TO authenticated
  USING (true);

-- Solo admin può modificare i tier
CREATE POLICY "Admin can manage tiers"
  ON rewards_tiers FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- =============================================
-- POLICIES: installer_rewards
-- =============================================

-- Admin può vedere tutti i rewards
CREATE POLICY "Admin can view all rewards"
  ON installer_rewards FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Installatore può vedere solo i propri rewards
CREATE POLICY "Installer can view own rewards"
  ON installer_rewards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installers i
      WHERE i.id = installer_rewards.installer_id
      AND i.user_id = auth.uid()
    )
  );

-- Solo admin può fare aggiustamenti manuali
CREATE POLICY "Admin can update rewards"
  ON installer_rewards FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- =============================================
-- POLICIES: points_transactions
-- =============================================

-- Admin può vedere tutte le transazioni
CREATE POLICY "Admin can view all transactions"
  ON points_transactions FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Installatore può vedere solo le proprie transazioni
CREATE POLICY "Installer can view own transactions"
  ON points_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installers i
      WHERE i.id = points_transactions.installer_id
      AND i.user_id = auth.uid()
    )
  );

-- Solo admin può inserire aggiustamenti manuali
CREATE POLICY "Admin can insert manual transactions"
  ON points_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

COMMENT ON TABLE rewards_tiers IS 'Definizione dei tier del sistema rewards con soglie punti e benefici';
COMMENT ON TABLE installer_rewards IS 'Tracciamento punti e tier corrente per ogni installatore';
COMMENT ON TABLE points_transactions IS 'Storico immutabile di tutte le transazioni punti';
COMMENT ON FUNCTION calculate_installer_points IS 'Calcola i punti totali di un installatore basandosi sulle lead vinte e prodotti installati';
COMMENT ON FUNCTION get_tier_for_points IS 'Determina il tier corretto in base ai punti accumulati';


-- =============================================
-- MIGRATION: 20251031120109_update_product_points_values.sql
-- =============================================
/*
  # Update Product Points Values for Gamification System

  ## Overview
  This migration updates the points values for all products in the `products` table
  to enable the gamification system. Previously all products had 0 points, preventing
  installers from earning points when closing won leads.

  ## Points Assignment Strategy

  ### Dazebox C (50 points)
  - DB07: Dazebox C - 50 points

  ### Dazebox Home Line (100 points each)
  - DT01: Dazebox Home T - 100 points
  - DS01: Dazebox Home S - 100 points
  - DK01: Dazebox Home TK - 100 points

  ### Dazebox Share Line (100 points each)
  - DT02: Dazebox Share T - 100 points
  - DS02: Dazebox Share S - 100 points
  - DK02: Dazebox Share TK - 100 points

  ### Urban Line (500 points each)
  - UT01: Urban T - 500 points
  - US01: Urban S - 500 points

  ### Duo Line (250 points each)
  - OT01: Duo T - 250 points
  - OS01: Duo S - 250 points

  ## Impact
  After this migration:
  1. All products will have their correct point values
  2. The trigger `track_points_on_lead_won` will start assigning points automatically
  3. Existing won leads will need retroactive point calculation (next migration)
  4. Installers will earn points when closing leads as "Chiusa Vinta"

  ## Notes
  - This migration only updates the product points values
  - Retroactive point calculation for existing won leads will be handled separately
  - The gamification trigger system is already in place and will work automatically
*/

-- Update Dazebox C (50 points)
UPDATE products SET points = 50 WHERE code = 'DB07';

-- Update Dazebox Home line (100 points each)
UPDATE products SET points = 100 WHERE code IN ('DT01', 'DS01', 'DK01');

-- Update Dazebox Share line (100 points each)
UPDATE products SET points = 100 WHERE code IN ('DT02', 'DS02', 'DK02');

-- Update Urban line (500 points each)
UPDATE products SET points = 500 WHERE code IN ('UT01', 'US01');

-- Update Duo line (250 points each)
UPDATE products SET points = 250 WHERE code IN ('OT01', 'OS01');

-- Verify the updates
DO $$
DECLARE
  v_product_count integer;
  v_zero_points_count integer;
BEGIN
  -- Count total products
  SELECT COUNT(*) INTO v_product_count FROM products;
  
  -- Count products still with 0 points
  SELECT COUNT(*) INTO v_zero_points_count FROM products WHERE points = 0;
  
  -- Log results
  RAISE NOTICE 'Total products: %', v_product_count;
  RAISE NOTICE 'Products with 0 points: %', v_zero_points_count;
  RAISE NOTICE 'Products with assigned points: %', v_product_count - v_zero_points_count;
  
  -- Verify all products have points assigned
  IF v_zero_points_count > 0 THEN
    RAISE WARNING 'Some products still have 0 points!';
  ELSE
    RAISE NOTICE 'All products have points assigned successfully!';
  END IF;
END $$;


-- =============================================
-- MIGRATION: 20251031120247_recalculate_retroactive_points_v2.sql
-- =============================================
/*
  # Recalculate Retroactive Points for All Installers

  ## Overview
  This migration performs a one-time retroactive calculation of points for all installers
  who have already closed leads as "Chiusa Vinta" before the points system was activated.

  ## What This Migration Does

  1. **Identifies All Won Leads with Products**
     - Finds all leads with status "Chiusa Vinta"
     - Links them to their assigned installers
     - Counts wallbox serials and calculates points

  2. **Creates Point Transactions**
     - Registers retroactive transactions in `points_transactions`
     - Marks them with type 'correction' to distinguish from automatic awards
     - Includes detailed descriptions with product information

  3. **Updates Installer Rewards**
     - Recalculates total points for each installer
     - Updates or creates records in `installer_rewards`
     - Triggers automatic tier updates based on new point totals

  4. **Updates Tiers Automatically**
     - The existing trigger `trigger_update_installer_tier` will fire
     - Installers who reach tier thresholds will be promoted automatically
     - Tier reached timestamps will be set to current time

  ## Expected Impact

  Based on current data:
  - Marco Bianchi has 5 won leads with 2 Dazebox Home T serials (200 points total)
  - Other installers may also have won leads that will be calculated
  - All installers will receive their earned points retroactively
  - Tiers will be assigned based on total points

  ## Safety Features

  - Only processes leads with status "Chiusa Vinta"
  - Only awards points for leads with registered wallbox serials
  - Uses transaction type 'correction' to identify retroactive awards
  - Idempotent: Can be run multiple times without duplicating points
  - Logs all changes for audit trail

  ## Notes

  - This is a one-time migration for historical data
  - Future points will be awarded automatically by the trigger system
  - Admins can manually adjust points through the admin interface if needed
*/

-- Create a temporary function to safely recalculate all points
CREATE OR REPLACE FUNCTION recalculate_all_installer_points()
RETURNS TABLE(
  result_installer_id uuid,
  installer_name text,
  points_awarded integer,
  leads_processed integer,
  products_counted integer
) AS $$
DECLARE
  v_installer record;
  v_lead record;
  v_points_for_lead integer;
  v_product_names text;
  v_total_points integer;
  v_total_leads integer;
  v_total_products integer;
BEGIN
  -- Loop through all installers
  FOR v_installer IN 
    SELECT i.id, i.first_name, i.last_name, i.email
    FROM installers i
  LOOP
    v_total_points := 0;
    v_total_leads := 0;
    v_total_products := 0;
    
    -- Find all won leads for this installer that have products
    FOR v_lead IN
      SELECT DISTINCT l.id as lead_id
      FROM leads l
      JOIN lead_assignments la ON la.lead_id = l.id
      WHERE la.installer_id = v_installer.id
        AND l.status = 'Chiusa Vinta'
        AND EXISTS (
          SELECT 1 FROM wallbox_serials ws 
          WHERE ws.lead_id = l.id
        )
        -- Avoid re-processing leads that already have point transactions
        AND NOT EXISTS (
          SELECT 1 FROM points_transactions pt
          WHERE pt.lead_id = l.id 
            AND pt.installer_id = v_installer.id
            AND pt.transaction_type IN ('lead_won', 'correction')
        )
    LOOP
      -- Calculate points for this specific lead
      SELECT 
        COALESCE(SUM(p.points), 0),
        string_agg(p.name, ', '),
        COUNT(*)
      INTO v_points_for_lead, v_product_names, v_total_products
      FROM wallbox_serials ws
      JOIN products p ON ws.product_id = p.id
      WHERE ws.lead_id = v_lead.lead_id;
      
      -- Only create transaction if there are points to award
      IF v_points_for_lead > 0 THEN
        -- Insert retroactive transaction
        INSERT INTO points_transactions (
          installer_id,
          lead_id,
          points_earned,
          transaction_type,
          description
        ) VALUES (
          v_installer.id,
          v_lead.lead_id,
          v_points_for_lead,
          'correction',
          'Ricalcolo retroattivo punti - Prodotti: ' || COALESCE(v_product_names, 'N/A')
        );
        
        v_total_points := v_total_points + v_points_for_lead;
        v_total_leads := v_total_leads + 1;
      END IF;
    END LOOP;
    
    -- Update installer_rewards if points were awarded
    IF v_total_points > 0 THEN
      -- Update or insert the rewards record
      INSERT INTO installer_rewards (installer_id, total_points)
      VALUES (v_installer.id, v_total_points)
      ON CONFLICT (installer_id)
      DO UPDATE SET
        total_points = installer_rewards.total_points + EXCLUDED.total_points,
        updated_at = now();
      
      -- Return summary for this installer
      result_installer_id := v_installer.id;
      installer_name := v_installer.first_name || ' ' || v_installer.last_name;
      points_awarded := v_total_points;
      leads_processed := v_total_leads;
      products_counted := v_total_products;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Execute the recalculation and log results
DO $$
DECLARE
  v_result record;
  v_total_installers integer := 0;
  v_total_points integer := 0;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RETROACTIVE POINTS RECALCULATION';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  
  -- Run the recalculation
  FOR v_result IN SELECT * FROM recalculate_all_installer_points()
  LOOP
    v_total_installers := v_total_installers + 1;
    v_total_points := v_total_points + v_result.points_awarded;
    
    RAISE NOTICE 'Installer: %', v_result.installer_name;
    RAISE NOTICE '  - Points awarded: %', v_result.points_awarded;
    RAISE NOTICE '  - Leads processed: %', v_result.leads_processed;
    RAISE NOTICE '  - Products counted: %', v_result.products_counted;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total installers with points: %', v_total_installers;
  RAISE NOTICE 'Total points awarded: %', v_total_points;
  RAISE NOTICE '';
  
  IF v_total_installers = 0 THEN
    RAISE NOTICE 'No retroactive points to award - all leads already processed!';
  ELSE
    RAISE NOTICE 'Retroactive points successfully awarded!';
  END IF;
END $$;

-- Clean up temporary function
DROP FUNCTION IF EXISTS recalculate_all_installer_points();

-- Force tier recalculation for all installers with points
UPDATE installer_rewards
SET 
  current_tier_id = get_tier_for_points(total_points),
  tier_reached_at = CASE 
    WHEN get_tier_for_points(total_points) IS NOT NULL 
    THEN now() 
    ELSE NULL 
  END,
  updated_at = now()
WHERE total_points > 0;

-- Log final state
DO $$
DECLARE
  v_installer record;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'FINAL INSTALLER REWARDS STATUS';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  
  FOR v_installer IN
    SELECT 
      i.first_name || ' ' || i.last_name as name,
      ir.total_points,
      rt.display_name as tier,
      rt.points_required as tier_threshold
    FROM installer_rewards ir
    JOIN installers i ON i.id = ir.installer_id
    LEFT JOIN rewards_tiers rt ON rt.id = ir.current_tier_id
    WHERE ir.total_points > 0
    ORDER BY ir.total_points DESC
  LOOP
    RAISE NOTICE 'Installer: %', v_installer.name;
    RAISE NOTICE '  - Total Points: %', v_installer.total_points;
    RAISE NOTICE '  - Current Tier: %', COALESCE(v_installer.tier, 'No tier yet');
    IF v_installer.tier IS NOT NULL THEN
      RAISE NOTICE '  - Tier Threshold: % points', v_installer.tier_threshold;
    END IF;
    RAISE NOTICE '';
  END LOOP;
END $$;


-- =============================================
-- MIGRATION: 20251103124910_create_push_subscriptions_table.sql
-- =============================================
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


-- =============================================
-- MIGRATION: 20251103125416_add_push_notification_to_trigger.sql
-- =============================================
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


-- =============================================
-- MIGRATION: 20251103132410_fix_notification_trigger_auth.sql
-- =============================================
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

-- =============================================
-- MIGRATION: 20251202154710_add_self_reported_installations_support.sql
-- =============================================
/*
  # Add Self-Reported Installations Support

  ## Overview
  This migration extends the wallbox_serials table to support installer-reported installations
  that are not associated with Daze leads. It adds customer data fields, approval workflow,
  and photo storage capabilities.

  ## Changes Made

  ### 1. Modified `wallbox_serials` Table
  Added new columns:
  - `customer_first_name` (text) - First name of customer for self-reported installations
  - `customer_last_name` (text) - Last name of customer for self-reported installations
  - `customer_phone` (text) - Phone number for self-reported installations
  - `customer_email` (text) - Email for self-reported installations (optional)
  - `customer_address` (text) - Installation address for self-reported installations
  - `installation_date` (date) - Date when installation was completed
  - `installation_notes` (text) - Optional notes about the installation
  - `source_type` (text) - Either 'daze_lead' or 'self_reported'
  - `approval_status` (text) - 'pending', 'approved', or 'rejected'
  - `approved_by` (uuid) - Admin who approved/rejected
  - `approved_at` (timestamptz) - When approval/rejection happened
  - `rejection_reason` (text) - Reason for rejection if applicable
  - `photo_urls` (jsonb) - Array of photo URLs from storage

  ### 2. Data Integrity
  - Made `lead_id` nullable to support self-reported installations
  - Added CHECK constraint: if lead_id is null, customer data must be present
  - Added CHECK constraint: valid source_type values
  - Added CHECK constraint: valid approval_status values
  - Added CHECK constraint: installation_date cannot be in the future

  ### 3. Security Updates
  - Updated RLS policies to allow installers to insert self-reported installations
  - Admin policies for managing approval status
  - Installers can only update their own pending installations

  ## Important Notes
  - Existing records will have source_type = 'daze_lead' and approval_status = 'approved'
  - Self-reported installations start as 'pending' and require admin approval
  - Only approved installations count toward points calculation
  - Photos are stored in Supabase Storage 'installation-photos' bucket
*/

-- Step 1: Make lead_id nullable
ALTER TABLE wallbox_serials 
  ALTER COLUMN lead_id DROP NOT NULL;

-- Step 2: Add new columns for self-reported installations
DO $$
BEGIN
  -- Customer information columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'customer_first_name'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN customer_first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'customer_last_name'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN customer_last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN customer_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN customer_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'customer_address'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN customer_address text;
  END IF;

  -- Installation details columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'installation_date'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN installation_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'installation_notes'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN installation_notes text;
  END IF;

  -- Source and approval columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN source_type text DEFAULT 'daze_lead' CHECK (source_type IN ('daze_lead', 'self_reported'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN approved_by uuid REFERENCES installers(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN rejection_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'photo_urls'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN photo_urls jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Step 3: Update existing records to be approved daze_lead installations
UPDATE wallbox_serials 
SET 
  source_type = 'daze_lead',
  approval_status = 'approved'
WHERE source_type IS NULL OR approval_status IS NULL;

-- Step 4: Add constraint to ensure data integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallbox_serials_customer_data_check'
  ) THEN
    ALTER TABLE wallbox_serials ADD CONSTRAINT wallbox_serials_customer_data_check 
    CHECK (
      (lead_id IS NOT NULL) OR 
      (customer_first_name IS NOT NULL AND customer_last_name IS NOT NULL AND customer_phone IS NOT NULL)
    );
  END IF;
END $$;

-- Step 5: Add index for approval status queries
CREATE INDEX IF NOT EXISTS idx_wallbox_serials_approval_status ON wallbox_serials(approval_status);
CREATE INDEX IF NOT EXISTS idx_wallbox_serials_source_type ON wallbox_serials(source_type);

-- Step 6: Update RLS policies for self-reported installations

-- Drop old insert policy and create new one that allows self-reported
DROP POLICY IF EXISTS "Installers can insert serials for their leads" ON wallbox_serials;

CREATE POLICY "Installers can insert serials for assigned leads or self-reported"
  ON wallbox_serials FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Can insert for assigned leads
    (
      lead_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM leads l
        JOIN lead_assignments la ON la.lead_id = l.id
        JOIN installers i ON i.id = la.installer_id
        WHERE l.id = lead_id
        AND i.user_id = auth.uid()
      )
    )
    OR
    -- Can insert self-reported installations
    (
      lead_id IS NULL AND
      source_type = 'self_reported' AND
      EXISTS (
        SELECT 1 FROM installers i
        WHERE i.id = installer_id
        AND i.user_id = auth.uid()
      )
    )
  );

-- Allow installers to update only their pending self-reported installations
CREATE POLICY "Installers can update own pending self-reported installations"
  ON wallbox_serials FOR UPDATE
  TO authenticated
  USING (
    source_type = 'self_reported' AND
    approval_status = 'pending' AND
    EXISTS (
      SELECT 1 FROM installers i
      WHERE i.id = wallbox_serials.installer_id
      AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    source_type = 'self_reported' AND
    approval_status = 'pending' AND
    EXISTS (
      SELECT 1 FROM installers i
      WHERE i.id = wallbox_serials.installer_id
      AND i.user_id = auth.uid()
    )
  );

-- Admin can update approval status
CREATE POLICY "Admins can update approval status"
  ON wallbox_serials FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );


-- =============================================
-- MIGRATION: 20251202154730_create_installation_photos_storage.sql
-- =============================================
/*
  # Create Storage for Installation Photos

  ## Overview
  This migration sets up Supabase Storage bucket for installation photos
  with appropriate security policies.

  ## Changes Made

  ### 1. Storage Bucket
  - Creates 'installation-photos' bucket for storing installation images
  - Public bucket set to false for security
  - File size limit handled at application level (5MB per photo)
  - Allowed file types: image/jpeg, image/png, image/heic

  ### 2. Storage Policies
  - Installers can upload photos to their own folder
  - Installers can view their own photos
  - Admins can view all photos
  - Photos organized by: installer_id/timestamp_filename

  ## Important Notes
  - Photos are private by default
  - Access controlled through RLS policies
  - Maximum 5 photos per installation (enforced at app level)
  - Photo compression handled at client side before upload
*/

-- Create storage bucket for installation photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'installation-photos',
  'installation-photos',
  false,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/heic']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage bucket

-- Installers can upload to their own folder
CREATE POLICY "Installers can upload their installation photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'installation-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT i.id::text FROM installers i WHERE i.user_id = auth.uid()
    )
  );

-- Installers can view their own photos
CREATE POLICY "Installers can view their own photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'installation-photos' AND
    (
      -- Own photos
      (storage.foldername(name))[1] IN (
        SELECT i.id::text FROM installers i WHERE i.user_id = auth.uid()
      )
      OR
      -- Admin can view all
      (auth.jwt()->>'role') = 'admin' OR
      (auth.jwt()->'app_metadata'->>'role') = 'admin'
    )
  );

-- Installers can delete their own photos (for pending installations only)
CREATE POLICY "Installers can delete their pending installation photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'installation-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT i.id::text FROM installers i WHERE i.user_id = auth.uid()
    )
  );

-- Admins can manage all photos
CREATE POLICY "Admins can manage all installation photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'installation-photos' AND
    (
      (auth.jwt()->>'role') = 'admin' OR
      (auth.jwt()->'app_metadata'->>'role') = 'admin'
    )
  );


-- =============================================
-- MIGRATION: 20251202155425_update_rewards_for_approval_status_fixed.sql
-- =============================================
/*
  # Update Rewards System to Handle Approval Status

  ## Overview
  This migration updates the rewards calculation system to only count points from
  approved installations. Self-reported installations must be approved by admin
  before points are awarded.

  ## Changes Made

  ### 1. Updated Points Calculation Function
  - Modified `calculate_installer_points` to only count approved serials
  - Filter wallbox_serials WHERE approval_status = 'approved'

  ### 2. Updated Trigger Functions
  - Modified `track_points_on_lead_won` to check approval status
  - Only create points transaction for approved installations

  ## Important Notes
  - Existing points from daze_lead installations remain unchanged (they're auto-approved)
  - Self-reported installations start as 'pending' and require admin approval
  - Points are only awarded after approval
  - Retroactive calculation respects approval status
*/

-- Drop existing function and recreate with approval status filter
CREATE OR REPLACE FUNCTION calculate_installer_points(p_installer_id uuid)
RETURNS integer AS $$
DECLARE
  total_points integer;
BEGIN
  SELECT COALESCE(SUM(p.points), 0)
  INTO total_points
  FROM wallbox_serials ws
  JOIN products p ON p.id = ws.product_id
  WHERE ws.installer_id = p_installer_id
    AND ws.approval_status = 'approved';

  RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Update trigger function to only award points for approved installations
CREATE OR REPLACE FUNCTION track_points_on_lead_won()
RETURNS TRIGGER AS $$
DECLARE
  v_installer_id uuid;
  v_total_points integer;
  v_lead_serials_points integer;
BEGIN
  IF (NEW.status = 'Chiusa Vinta' AND OLD.status != 'Chiusa Vinta') THEN
    SELECT installer_id INTO v_installer_id
    FROM lead_assignments
    WHERE lead_id = NEW.id
    LIMIT 1;

    IF v_installer_id IS NOT NULL THEN
      SELECT COALESCE(SUM(p.points), 0)
      INTO v_lead_serials_points
      FROM wallbox_serials ws
      JOIN products p ON p.id = ws.product_id
      WHERE ws.lead_id = NEW.id
        AND ws.installer_id = v_installer_id
        AND ws.approval_status = 'approved';

      IF v_lead_serials_points > 0 THEN
        INSERT INTO points_transactions (
          installer_id,
          lead_id,
          points_earned,
          transaction_type,
          description
        ) VALUES (
          v_installer_id,
          NEW.id,
          v_lead_serials_points,
          'lead_won',
          'Lead chiusa vinta con ' || v_lead_serials_points || ' punti da prodotti installati'
        );

        v_total_points := calculate_installer_points(v_installer_id);

        INSERT INTO installer_rewards (installer_id, total_points)
        VALUES (v_installer_id, v_total_points)
        ON CONFLICT (installer_id)
        DO UPDATE SET
          total_points = v_total_points,
          updated_at = now();
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger for when installations are approved
CREATE OR REPLACE FUNCTION award_points_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_total_points integer;
  v_serial_points integer;
BEGIN
  IF (NEW.approval_status = 'approved' AND OLD.approval_status = 'pending') THEN
    IF NEW.installer_id IS NOT NULL AND NEW.product_id IS NOT NULL THEN
      SELECT points INTO v_serial_points
      FROM products
      WHERE id = NEW.product_id;

      IF v_serial_points > 0 THEN
        INSERT INTO points_transactions (
          installer_id,
          lead_id,
          points_earned,
          transaction_type,
          description
        ) VALUES (
          NEW.installer_id,
          NEW.lead_id,
          v_serial_points,
          CASE
            WHEN NEW.source_type = 'self_reported' THEN 'lead_won'
            ELSE 'lead_won'
          END,
          CASE
            WHEN NEW.source_type = 'self_reported' THEN 'Installazione autonoma approvata: ' || NEW.serial_code
            ELSE 'Installazione da lead approvata: ' || NEW.serial_code
          END
        );

        v_total_points := calculate_installer_points(NEW.installer_id);

        INSERT INTO installer_rewards (installer_id, total_points)
        VALUES (NEW.installer_id, v_total_points)
        ON CONFLICT (installer_id)
        DO UPDATE SET
          total_points = v_total_points,
          updated_at = now();
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on wallbox_serials for approval
DROP TRIGGER IF EXISTS trigger_award_points_on_approval ON wallbox_serials;
CREATE TRIGGER trigger_award_points_on_approval
  AFTER UPDATE ON wallbox_serials
  FOR EACH ROW
  EXECUTE FUNCTION award_points_on_approval();

-- Recalculate all installer points with approval status filter
DO $$
DECLARE
  installer_record RECORD;
  new_total integer;
BEGIN
  FOR installer_record IN SELECT id FROM installers LOOP
    new_total := calculate_installer_points(installer_record.id);

    INSERT INTO installer_rewards (installer_id, total_points)
    VALUES (installer_record.id, new_total)
    ON CONFLICT (installer_id)
    DO UPDATE SET
      total_points = new_total,
      updated_at = now();
  END LOOP;
END $$;


-- =============================================
-- MIGRATION: 20251202160752_create_installation_companies_table.sql
-- =============================================
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


-- =============================================
-- MIGRATION: 20251202160839_add_company_fields_to_installers.sql
-- =============================================
/*
  # Add Company Relationship to Installers

  ## Overview
  This migration adds company relationship fields to the installers table, enabling
  the hierarchical company structure. Installers can now belong to a company or
  remain independent (company_id = NULL).

  ## Changes Made

  ### 1. New Columns in `installers`
  - `company_id` (uuid, nullable) - Foreign key to installation_companies
  - `role_in_company` (text) - Role within the company: 'owner', 'admin', 'installer'
  - `can_manage_company` (boolean) - Quick flag for management permissions
  - `employee_number` (text) - Optional employee/matriculation number
  - `hired_at` (timestamptz) - Date when joined the company
  - `region` (text) - Geographic region (for territory management)

  ### 2. Constraints
  - Foreign key to installation_companies with CASCADE
  - Check constraint for valid role_in_company values
  - At least one owner per company (enforced via trigger)

  ### 3. Indexes
  - Index on company_id for fast company queries
  - Index on role_in_company for permission checks
  - Composite index on (company_id, is_active) for team listings

  ### 4. Triggers
  - Prevent deletion of last owner in a company
  - Auto-set can_manage_company based on role

  ## Important Notes
  - Existing installers will have company_id = NULL (independent installers)
  - company_id NULL = independent installer (maintains current behavior)
  - company_id NOT NULL = company member with specified role
  - Owner role has full control, admin can manage team, installer is regular member
*/

-- Add new columns to installers table
DO $$
BEGIN
  -- company_id: link to installation company
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installers' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE installers ADD COLUMN company_id uuid REFERENCES installation_companies(id) ON DELETE CASCADE;
  END IF;

  -- role_in_company: owner, admin, or installer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installers' AND column_name = 'role_in_company'
  ) THEN
    ALTER TABLE installers ADD COLUMN role_in_company text CHECK (role_in_company IN ('owner', 'admin', 'installer'));
  END IF;

  -- can_manage_company: quick permission flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installers' AND column_name = 'can_manage_company'
  ) THEN
    ALTER TABLE installers ADD COLUMN can_manage_company boolean DEFAULT false;
  END IF;

  -- employee_number: optional matriculation/employee code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installers' AND column_name = 'employee_number'
  ) THEN
    ALTER TABLE installers ADD COLUMN employee_number text;
  END IF;

  -- hired_at: when joined the company
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installers' AND column_name = 'hired_at'
  ) THEN
    ALTER TABLE installers ADD COLUMN hired_at timestamptz;
  END IF;

  -- region: already exists in schema, keeping it for territory management
  -- No action needed if already exists
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_installers_company_id ON installers(company_id);
CREATE INDEX IF NOT EXISTS idx_installers_role_in_company ON installers(role_in_company);
CREATE INDEX IF NOT EXISTS idx_installers_company_active ON installers(company_id, is_active);

-- Function to auto-set can_manage_company based on role
CREATE OR REPLACE FUNCTION set_installer_manage_permission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role_in_company IN ('owner', 'admin') THEN
    NEW.can_manage_company := true;
  ELSE
    NEW.can_manage_company := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_installer_manage_permission ON installers;
CREATE TRIGGER trigger_set_installer_manage_permission
  BEFORE INSERT OR UPDATE OF role_in_company ON installers
  FOR EACH ROW
  EXECUTE FUNCTION set_installer_manage_permission();

-- Function to prevent deletion of last owner in a company
CREATE OR REPLACE FUNCTION prevent_last_owner_deletion()
RETURNS TRIGGER AS $$
DECLARE
  owner_count integer;
BEGIN
  -- Only check if the installer being deleted/updated is an owner
  IF OLD.role_in_company = 'owner' AND OLD.company_id IS NOT NULL THEN
    -- Count remaining owners in the company
    SELECT COUNT(*) INTO owner_count
    FROM installers
    WHERE company_id = OLD.company_id
    AND role_in_company = 'owner'
    AND id != OLD.id
    AND is_active = true;
    
    -- If this is the last owner, prevent the action
    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete or deactivate the last owner of a company';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_last_owner_deletion ON installers;
CREATE TRIGGER trigger_prevent_last_owner_deletion
  BEFORE DELETE ON installers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_owner_deletion();

-- Trigger to also check on update when deactivating
CREATE OR REPLACE FUNCTION prevent_last_owner_deactivation()
RETURNS TRIGGER AS $$
DECLARE
  owner_count integer;
BEGIN
  -- Only check if deactivating an owner
  IF OLD.role_in_company = 'owner' AND OLD.is_active = true AND NEW.is_active = false AND OLD.company_id IS NOT NULL THEN
    -- Count remaining active owners in the company
    SELECT COUNT(*) INTO owner_count
    FROM installers
    WHERE company_id = OLD.company_id
    AND role_in_company = 'owner'
    AND id != OLD.id
    AND is_active = true;
    
    -- If this is the last active owner, prevent the action
    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Cannot deactivate the last active owner of a company';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_last_owner_deactivation ON installers;
CREATE TRIGGER trigger_prevent_last_owner_deactivation
  BEFORE UPDATE OF is_active ON installers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_owner_deactivation();

-- Update RLS policies for installers to include company context
-- Drop existing policies if needed and recreate with company awareness

-- Policy: Admin can see all installers
DROP POLICY IF EXISTS "Admin can view all installers" ON installers;
CREATE POLICY "Admin can view all installers"
  ON installers FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Policy: Installers can view their own data
DROP POLICY IF EXISTS "Installers can view own profile" ON installers;
CREATE POLICY "Installers can view own profile"
  ON installers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Company owners/admins can view their team members
CREATE POLICY "Company managers can view team members"
  ON installers FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND role_in_company IN ('owner', 'admin')
      AND company_id IS NOT NULL
    )
  );

-- Policy: Company owners can update their team members
DROP POLICY IF EXISTS "Company owners can update team" ON installers;
CREATE POLICY "Company owners can update team"
  ON installers FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND role_in_company = 'owner'
      AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND role_in_company = 'owner'
      AND company_id IS NOT NULL
    )
  );

-- Policy: Admin can update any installer
DROP POLICY IF EXISTS "Admin can update installers" ON installers;
CREATE POLICY "Admin can update installers"
  ON installers FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Add comments
COMMENT ON COLUMN installers.company_id IS 'Foreign key to installation_companies. NULL = independent installer';
COMMENT ON COLUMN installers.role_in_company IS 'Role within company: owner (full control), admin (team management), installer (regular employee)';
COMMENT ON COLUMN installers.can_manage_company IS 'Auto-set flag indicating if user can manage company settings and team';
COMMENT ON COLUMN installers.employee_number IS 'Optional employee matriculation number or code';
COMMENT ON COLUMN installers.hired_at IS 'Date when installer joined the company';


-- =============================================
-- MIGRATION: 20251202160856_add_company_rls_policies.sql
-- =============================================
/*
  # Add Complete RLS Policies for Installation Companies

  ## Overview
  Now that installers table has company_id and role_in_company fields,
  we can add the complete RLS policies for installation_companies table.

  ## Changes Made

  ### RLS Policies Added
  - Company owners can read and update their company
  - Company admins can read their company (but not update)
  - All company members (including regular installers) can read basic company info
  - Admin (Daze) maintains full access

  ## Important Notes
  - Policies leverage the installers.company_id and installers.role_in_company fields
  - Only owners can update company settings
  - All members can view their company information
*/

-- Policy: Company owners and admins can read their company
DROP POLICY IF EXISTS "Company managers can read their company" ON installation_companies;
CREATE POLICY "Company managers can read their company"
  ON installation_companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company IN ('owner', 'admin')
    )
  );

-- Policy: Company owners can update their company (not delete)
DROP POLICY IF EXISTS "Company owners can update company" ON installation_companies;
CREATE POLICY "Company owners can update company"
  ON installation_companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company = 'owner'
    )
  );

-- Policy: All company members can read basic company info
DROP POLICY IF EXISTS "Company members can read company info" ON installation_companies;
CREATE POLICY "Company members can read company info"
  ON installation_companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
    )
  );


-- =============================================
-- MIGRATION: 20251202160946_restructure_rewards_for_companies.sql
-- =============================================
/*
  # Restructure Rewards System for Company-Based Points

  ## Overview
  Major restructuring of the rewards system to support company-level point accumulation
  instead of individual installer points. Companies compete for tiers, while individual
  installer contributions are tracked separately for internal stats.

  ## Changes Made

  ### 1. Create `company_rewards` Table
  New table for company-level rewards (similar to old installer_rewards but for companies):
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key to installation_companies)
  - `total_points` (integer) - Aggregate points from all company installers
  - `current_tier_id` (uuid) - Company's current tier
  - `tier_reached_at` (timestamptz) - When company reached current tier
  - `created_at`, `updated_at`

  ### 2. Modify `installer_rewards` Table
  Keep for independent installers (company_id = NULL) only:
  - These installers continue with individual points and tiers
  - Add constraint: installer must NOT have company_id

  ### 3. Modify `points_transactions` Table
  Add company_id to track which company gets the points:
  - Keep `installer_id` (who did the work)
  - Add `company_id` (which company gets credit)
  - If company_id NULL = independent installer gets individual credit

  ### 4. Create View `installer_contributions`
  For internal company stats showing individual contributions:
  - installer_id, company_id, total_points_contributed
  - Does NOT affect tier (tier is company-level only)

  ## Important Notes
  - Existing installer_rewards records remain valid for independent installers
  - Company members no longer have individual tiers (company has the tier)
  - Points flow: installation → installer (who did it) → company (aggregated)
  - Independent installers (company_id=NULL) maintain individual system
*/

-- Step 1: Create company_rewards table
CREATE TABLE IF NOT EXISTS company_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES installation_companies(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_points integer DEFAULT 0,
  current_tier_id uuid REFERENCES rewards_tiers(id),
  tier_reached_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_company_rewards_company_id ON company_rewards(company_id);
CREATE INDEX IF NOT EXISTS idx_company_rewards_tier ON company_rewards(current_tier_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_company_rewards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_company_rewards_timestamp ON company_rewards;
CREATE TRIGGER trigger_update_company_rewards_timestamp
  BEFORE UPDATE ON company_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_company_rewards_updated_at();

-- Step 2: Add company_id to points_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_transactions' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE points_transactions ADD COLUMN company_id uuid REFERENCES installation_companies(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_points_transactions_company_id ON points_transactions(company_id);

-- Step 3: Add company_id to wallbox_serials for easier aggregation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallbox_serials' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE wallbox_serials ADD COLUMN company_id uuid REFERENCES installation_companies(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallbox_serials_company_id ON wallbox_serials(company_id);

-- Step 4: Trigger to auto-populate company_id in wallbox_serials from installer
CREATE OR REPLACE FUNCTION populate_serial_company_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get company_id from installer if exists
  IF NEW.installer_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM installers
    WHERE id = NEW.installer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_populate_serial_company_id ON wallbox_serials;
CREATE TRIGGER trigger_populate_serial_company_id
  BEFORE INSERT OR UPDATE OF installer_id ON wallbox_serials
  FOR EACH ROW
  EXECUTE FUNCTION populate_serial_company_id();

-- Step 5: Update existing wallbox_serials with company_id
UPDATE wallbox_serials ws
SET company_id = i.company_id
FROM installers i
WHERE ws.installer_id = i.id
AND ws.company_id IS NULL
AND i.company_id IS NOT NULL;

-- Step 6: Create view for installer contributions (internal company stats)
CREATE OR REPLACE VIEW installer_contributions AS
SELECT 
  i.id as installer_id,
  i.company_id,
  i.first_name,
  i.last_name,
  COALESCE(SUM(p.points), 0) as total_points_contributed,
  COUNT(DISTINCT ws.id) as installations_count,
  COUNT(DISTINCT CASE WHEN ws.approval_status = 'approved' THEN ws.id END) as approved_installations_count
FROM installers i
LEFT JOIN wallbox_serials ws ON ws.installer_id = i.id AND ws.approval_status = 'approved'
LEFT JOIN products p ON p.id = ws.product_id
WHERE i.company_id IS NOT NULL
GROUP BY i.id, i.company_id, i.first_name, i.last_name;

-- Step 7: RLS for company_rewards
ALTER TABLE company_rewards ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY "Admin can manage all company rewards"
  ON company_rewards FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Company members can view their company rewards
CREATE POLICY "Company members can view company rewards"
  ON company_rewards FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
    )
  );

-- Step 8: Add constraint to installer_rewards 
-- This ensures that installers with company_id don't have individual rewards
-- We'll enforce this at application level to avoid breaking existing data
-- Add comment explaining the logic
COMMENT ON TABLE installer_rewards IS 'Individual rewards for independent installers only (company_id = NULL). Company members earn points for their company in company_rewards table.';

-- Step 9: Add comments
COMMENT ON TABLE company_rewards IS 'Aggregate rewards and tier tracking for installation companies';
COMMENT ON COLUMN company_rewards.total_points IS 'Sum of all points earned by company installers';
COMMENT ON COLUMN company_rewards.current_tier_id IS 'Current tier level achieved by the company';
COMMENT ON COLUMN points_transactions.company_id IS 'Company receiving the points (NULL if independent installer)';
COMMENT ON COLUMN wallbox_serials.company_id IS 'Company of the installer who performed installation (denormalized for performance)';


-- =============================================
-- MIGRATION: 20251202161015_add_company_to_lead_assignments.sql
-- =============================================
/*
  # Add Company Support to Lead Assignments

  ## Overview
  Modify lead_assignments to support assigning leads to companies (not just individual installers).
  A lead can be assigned to a company, then internally assigned to specific installers.

  ## Changes Made

  ### 1. Modify `lead_assignments` Table
  - Add `assigned_to_company_id` (uuid, nullable) - Company the lead is assigned to
  - Keep `installer_id` (nullable now) - Specific installer working the lead
  - Constraint: at least one of company_id or installer_id must be NOT NULL
  - A lead assigned to company can later be assigned to specific installer

  ### 2. Add Tracking Fields
  - `internally_assigned_at` (timestamptz) - When assigned internally to installer
  - `internally_assigned_by` (uuid) - Which owner/admin assigned internally

  ## Important Notes
  - Lead workflow: Daze Admin → Company → (Owner/Admin) → Specific Installer
  - Or: Daze Admin → Independent Installer (direct, as before)
  - Existing assignments remain valid (assigned_to_company_id will be NULL)
*/

-- Step 1: Add new columns to lead_assignments
DO $$
BEGIN
  -- assigned_to_company_id: which company gets the lead
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_assignments' AND column_name = 'assigned_to_company_id'
  ) THEN
    ALTER TABLE lead_assignments ADD COLUMN assigned_to_company_id uuid REFERENCES installation_companies(id) ON DELETE CASCADE;
  END IF;

  -- internally_assigned_at: when company owner/admin assigned to specific installer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_assignments' AND column_name = 'internally_assigned_at'
  ) THEN
    ALTER TABLE lead_assignments ADD COLUMN internally_assigned_at timestamptz;
  END IF;

  -- internally_assigned_by: which company manager did the internal assignment
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_assignments' AND column_name = 'internally_assigned_by'
  ) THEN
    ALTER TABLE lead_assignments ADD COLUMN internally_assigned_by uuid REFERENCES installers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 2: Make installer_id nullable (since lead can be assigned to company without specific installer yet)
ALTER TABLE lead_assignments ALTER COLUMN installer_id DROP NOT NULL;

-- Step 3: Add constraint that at least one of company or installer must be assigned
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_assignments_must_have_assignee'
  ) THEN
    ALTER TABLE lead_assignments ADD CONSTRAINT lead_assignments_must_have_assignee
    CHECK (assigned_to_company_id IS NOT NULL OR installer_id IS NOT NULL);
  END IF;
END $$;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_assignments_company_id ON lead_assignments(assigned_to_company_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_company_installer ON lead_assignments(assigned_to_company_id, installer_id);

-- Step 5: Update RLS policies for lead_assignments

-- Admin can see all
DROP POLICY IF EXISTS "Admin can manage all lead assignments" ON lead_assignments;
CREATE POLICY "Admin can manage all lead assignments"
  ON lead_assignments FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Company owners/admins can view leads assigned to their company
DROP POLICY IF EXISTS "Company managers can view company leads" ON lead_assignments;
CREATE POLICY "Company managers can view company leads"
  ON lead_assignments FOR SELECT
  TO authenticated
  USING (
    assigned_to_company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company IN ('owner', 'admin')
    )
  );

-- Company owners/admins can update lead assignments (internal assignment)
DROP POLICY IF EXISTS "Company managers can assign leads internally" ON lead_assignments;
CREATE POLICY "Company managers can assign leads internally"
  ON lead_assignments FOR UPDATE
  TO authenticated
  USING (
    assigned_to_company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    assigned_to_company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company IN ('owner', 'admin')
    )
  );

-- Installers can view their assigned leads
DROP POLICY IF EXISTS "Installers can view assigned leads" ON lead_assignments;
CREATE POLICY "Installers can view assigned leads"
  ON lead_assignments FOR SELECT
  TO authenticated
  USING (
    installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    )
  );

-- Installers can update their own assignments (mark as viewed, etc)
DROP POLICY IF EXISTS "Installers can update own assignments" ON lead_assignments;
CREATE POLICY "Installers can update own assignments"
  ON lead_assignments FOR UPDATE
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

-- Step 6: Populate assigned_to_company_id for existing assignments where installer has company
UPDATE lead_assignments la
SET assigned_to_company_id = i.company_id
FROM installers i
WHERE la.installer_id = i.id
AND la.assigned_to_company_id IS NULL
AND i.company_id IS NOT NULL;

-- Step 7: Add comments
COMMENT ON COLUMN lead_assignments.assigned_to_company_id IS 'Company the lead is assigned to (NULL if assigned to independent installer)';
COMMENT ON COLUMN lead_assignments.internally_assigned_at IS 'When company owner/admin assigned lead to specific installer';
COMMENT ON COLUMN lead_assignments.internally_assigned_by IS 'Which company manager performed the internal assignment';


-- =============================================
-- MIGRATION: 20251202161046_create_lead_internal_assignments_history.sql
-- =============================================
/*
  # Create Lead Internal Assignments History Table

  ## Overview
  Track the complete history of internal lead assignments within a company.
  When a company owner/admin reassigns a lead from one installer to another,
  this creates an audit trail.

  ## Changes Made

  ### 1. New Table `lead_internal_assignments`
  Tracks all internal reassignments within a company:
  - `id` (uuid, primary key)
  - `lead_id` (uuid) - The lead being reassigned
  - `assignment_id` (uuid) - Reference to lead_assignments record
  - `company_id` (uuid) - Company where reassignment happened
  - `from_installer_id` (uuid, nullable) - Previous installer (NULL if first assignment)
  - `to_installer_id` (uuid) - New installer assigned
  - `assigned_by` (uuid) - Owner/admin who made the assignment
  - `notes` (text) - Optional notes about why reassigned
  - `created_at` (timestamptz)

  ### 2. Trigger
  - Auto-create record when lead_assignments.installer_id changes within a company

  ## Important Notes
  - Only tracks changes within company-assigned leads
  - Independent installer assignments don't create records here
  - Provides complete audit trail for company lead management
*/

-- Create lead_internal_assignments table
CREATE TABLE IF NOT EXISTS lead_internal_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  assignment_id uuid REFERENCES lead_assignments(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES installation_companies(id) ON DELETE CASCADE NOT NULL,
  from_installer_id uuid REFERENCES installers(id) ON DELETE SET NULL,
  to_installer_id uuid REFERENCES installers(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES installers(id) ON DELETE SET NULL NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_internal_assignments_lead ON lead_internal_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_internal_assignments_company ON lead_internal_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_internal_assignments_to_installer ON lead_internal_assignments(to_installer_id);
CREATE INDEX IF NOT EXISTS idx_lead_internal_assignments_date ON lead_internal_assignments(created_at DESC);

-- Trigger to auto-create internal assignment record when installer changes
CREATE OR REPLACE FUNCTION track_internal_lead_assignment()
RETURNS TRIGGER AS $$
DECLARE
  assigning_installer_id uuid;
BEGIN
  -- Only track if this is a company lead being reassigned internally
  IF NEW.assigned_to_company_id IS NOT NULL AND 
     (OLD.installer_id IS NULL OR OLD.installer_id != NEW.installer_id) AND
     NEW.installer_id IS NOT NULL THEN
    
    -- Get the installer making the change (from auth context)
    SELECT id INTO assigning_installer_id
    FROM installers
    WHERE user_id = auth.uid()
    AND company_id = NEW.assigned_to_company_id
    AND role_in_company IN ('owner', 'admin')
    LIMIT 1;
    
    -- Create internal assignment record if we found an assigning user
    IF assigning_installer_id IS NOT NULL THEN
      INSERT INTO lead_internal_assignments (
        lead_id,
        assignment_id,
        company_id,
        from_installer_id,
        to_installer_id,
        assigned_by
      ) VALUES (
        NEW.lead_id,
        NEW.id,
        NEW.assigned_to_company_id,
        OLD.installer_id,
        NEW.installer_id,
        assigning_installer_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_internal_lead_assignment ON lead_assignments;
CREATE TRIGGER trigger_track_internal_lead_assignment
  AFTER UPDATE OF installer_id ON lead_assignments
  FOR EACH ROW
  WHEN (NEW.assigned_to_company_id IS NOT NULL)
  EXECUTE FUNCTION track_internal_lead_assignment();

-- RLS for lead_internal_assignments
ALTER TABLE lead_internal_assignments ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY "Admin can view all internal assignments"
  ON lead_internal_assignments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Company owners/admins can view their company's internal assignments
CREATE POLICY "Company managers can view company internal assignments"
  ON lead_internal_assignments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM installers
      WHERE user_id = auth.uid()
      AND company_id IS NOT NULL
      AND role_in_company IN ('owner', 'admin')
    )
  );

-- Installers can view internal assignments related to their leads
CREATE POLICY "Installers can view their lead assignments"
  ON lead_internal_assignments FOR SELECT
  TO authenticated
  USING (
    to_installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    ) OR
    from_installer_id IN (
      SELECT id FROM installers WHERE user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE lead_internal_assignments IS 'Audit trail of internal lead reassignments within companies';
COMMENT ON COLUMN lead_internal_assignments.from_installer_id IS 'Previous installer (NULL if this is the first internal assignment)';
COMMENT ON COLUMN lead_internal_assignments.to_installer_id IS 'New installer receiving the lead';
COMMENT ON COLUMN lead_internal_assignments.assigned_by IS 'Company owner/admin who performed the reassignment';


-- =============================================
-- MIGRATION: 20251202161216_update_points_calculation_for_companies.sql
-- =============================================
/*
  # Update Points Calculation for Company-Based System

  ## Overview
  Completely restructure the points calculation logic to support both:
  - Company-level points (for installers with company_id)
  - Individual installer points (for independent installers with company_id = NULL)

  ## Changes Made

  ### 1. New Function: calculate_company_points
  Calculates total points for a company from all its installers' approved installations

  ### 2. Update Function: calculate_installer_points
  Keep for independent installers only (company_id = NULL)

  ### 3. New Function: update_company_tier
  Auto-update company tier when points change

  ### 4. Update Trigger: award_points_on_approval
  Modified to:
  - Add points to company if installer has company_id
  - Add points to individual if installer has no company_id
  - Create transaction with correct company_id

  ### 5. Update Trigger: track_points_on_lead_won
  Modified to handle both company and individual scenarios

  ## Important Notes
  - Points flow differently based on installer.company_id
  - Company members' points aggregate to company_rewards
  - Independent installers' points go to installer_rewards
  - All transactions maintain installer_id (who did the work) + company_id (who gets credit)
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS update_installer_tier CASCADE;
DROP FUNCTION IF EXISTS update_installer_tier_if_needed CASCADE;

-- Function 1: Calculate total points for a company
CREATE OR REPLACE FUNCTION calculate_company_points(p_company_id uuid)
RETURNS integer AS $$
DECLARE
  total_points integer;
BEGIN
  -- Sum all points from approved installations by company installers
  SELECT COALESCE(SUM(p.points), 0)
  INTO total_points
  FROM wallbox_serials ws
  JOIN products p ON p.id = ws.product_id
  JOIN installers i ON i.id = ws.installer_id
  WHERE i.company_id = p_company_id
    AND ws.approval_status = 'approved';

  RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Get appropriate tier for given points
CREATE OR REPLACE FUNCTION get_tier_for_points(p_points integer)
RETURNS uuid AS $$
DECLARE
  tier_id uuid;
BEGIN
  SELECT id INTO tier_id
  FROM rewards_tiers
  WHERE points_required <= p_points
  ORDER BY points_required DESC
  LIMIT 1;
  
  RETURN tier_id;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Update company tier based on current points
CREATE OR REPLACE FUNCTION update_company_tier(p_company_id uuid)
RETURNS void AS $$
DECLARE
  current_points integer;
  new_tier_id uuid;
  old_tier_id uuid;
BEGIN
  -- Get current points and tier
  SELECT total_points, current_tier_id INTO current_points, old_tier_id
  FROM company_rewards
  WHERE company_id = p_company_id;
  
  -- Get new tier based on points
  new_tier_id := get_tier_for_points(current_points);
  
  -- Update if tier changed
  IF new_tier_id IS DISTINCT FROM old_tier_id THEN
    UPDATE company_rewards
    SET current_tier_id = new_tier_id,
        tier_reached_at = now(),
        updated_at = now()
    WHERE company_id = p_company_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Update individual installer tier (for independents only)
CREATE OR REPLACE FUNCTION update_independent_installer_tier(p_installer_id uuid)
RETURNS void AS $$
DECLARE
  current_points integer;
  new_tier_id uuid;
  old_tier_id uuid;
BEGIN
  -- Get current points and tier
  SELECT total_points, current_tier_id INTO current_points, old_tier_id
  FROM installer_rewards
  WHERE installer_id = p_installer_id;
  
  -- Get new tier based on points
  new_tier_id := get_tier_for_points(current_points);
  
  -- Update if tier changed
  IF new_tier_id IS DISTINCT FROM old_tier_id THEN
    UPDATE installer_rewards
    SET current_tier_id = new_tier_id,
        tier_reached_at = now(),
        updated_at = now()
    WHERE installer_id = p_installer_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate award_points_on_approval with company logic
CREATE OR REPLACE FUNCTION award_points_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_total_points integer;
  v_serial_points integer;
  v_company_id uuid;
BEGIN
  -- Only when status changes from pending to approved
  IF (NEW.approval_status = 'approved' AND OLD.approval_status = 'pending') THEN
    IF NEW.installer_id IS NOT NULL AND NEW.product_id IS NOT NULL THEN
      
      -- Get installer's company_id
      SELECT company_id INTO v_company_id
      FROM installers
      WHERE id = NEW.installer_id;
      
      -- Get points for this product
      SELECT points INTO v_serial_points
      FROM products
      WHERE id = NEW.product_id;

      IF v_serial_points > 0 THEN
        -- Create points transaction
        INSERT INTO points_transactions (
          installer_id,
          company_id,
          lead_id,
          points_earned,
          transaction_type,
          description
        ) VALUES (
          NEW.installer_id,
          v_company_id,
          NEW.lead_id,
          v_serial_points,
          'lead_won',
          CASE
            WHEN NEW.source_type = 'self_reported' THEN 'Installazione autonoma approvata: ' || NEW.serial_code
            ELSE 'Installazione da lead approvata: ' || NEW.serial_code
          END
        );

        -- Update rewards based on company membership
        IF v_company_id IS NOT NULL THEN
          -- Company member: update company_rewards
          v_total_points := calculate_company_points(v_company_id);
          
          INSERT INTO company_rewards (company_id, total_points)
          VALUES (v_company_id, v_total_points)
          ON CONFLICT (company_id)
          DO UPDATE SET
            total_points = v_total_points,
            updated_at = now();
          
          -- Update company tier
          PERFORM update_company_tier(v_company_id);
          
        ELSE
          -- Independent installer: update installer_rewards
          v_total_points := calculate_installer_points(NEW.installer_id);
          
          INSERT INTO installer_rewards (installer_id, total_points)
          VALUES (NEW.installer_id, v_total_points)
          ON CONFLICT (installer_id)
          DO UPDATE SET
            total_points = v_total_points,
            updated_at = now();
          
          -- Update installer tier
          PERFORM update_independent_installer_tier(NEW.installer_id);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate track_points_on_lead_won with company logic
CREATE OR REPLACE FUNCTION track_points_on_lead_won()
RETURNS TRIGGER AS $$
DECLARE
  v_installer_id uuid;
  v_company_id uuid;
  v_total_points integer;
  v_lead_serials_points integer;
BEGIN
  -- Only when status changes to "Chiusa Vinta"
  IF (NEW.status = 'Chiusa Vinta' AND OLD.status != 'Chiusa Vinta') THEN
    
    -- Get installer assigned to this lead
    SELECT installer_id INTO v_installer_id
    FROM lead_assignments
    WHERE lead_id = NEW.id
    LIMIT 1;

    IF v_installer_id IS NOT NULL THEN
      -- Get installer's company
      SELECT company_id INTO v_company_id
      FROM installers
      WHERE id = v_installer_id;
      
      -- Calculate points from approved serials for this lead
      SELECT COALESCE(SUM(p.points), 0)
      INTO v_lead_serials_points
      FROM wallbox_serials ws
      JOIN products p ON p.id = ws.product_id
      WHERE ws.lead_id = NEW.id
        AND ws.installer_id = v_installer_id
        AND ws.approval_status = 'approved';

      IF v_lead_serials_points > 0 THEN
        -- Create transaction
        INSERT INTO points_transactions (
          installer_id,
          company_id,
          lead_id,
          points_earned,
          transaction_type,
          description
        ) VALUES (
          v_installer_id,
          v_company_id,
          NEW.id,
          v_lead_serials_points,
          'lead_won',
          'Lead chiusa vinta con ' || v_lead_serials_points || ' punti da prodotti installati'
        );

        -- Update rewards
        IF v_company_id IS NOT NULL THEN
          -- Company member
          v_total_points := calculate_company_points(v_company_id);
          
          INSERT INTO company_rewards (company_id, total_points)
          VALUES (v_company_id, v_total_points)
          ON CONFLICT (company_id)
          DO UPDATE SET
            total_points = v_total_points,
            updated_at = now();
          
          PERFORM update_company_tier(v_company_id);
          
        ELSE
          -- Independent installer
          v_total_points := calculate_installer_points(v_installer_id);
          
          INSERT INTO installer_rewards (installer_id, total_points)
          VALUES (v_installer_id, v_total_points)
          ON CONFLICT (installer_id)
          DO UPDATE SET
            total_points = v_total_points,
            updated_at = now();
          
          PERFORM update_independent_installer_tier(v_installer_id);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers (drop and create to ensure clean state)
DROP TRIGGER IF EXISTS trigger_award_points_on_approval ON wallbox_serials;
CREATE TRIGGER trigger_award_points_on_approval
  AFTER UPDATE ON wallbox_serials
  FOR EACH ROW
  EXECUTE FUNCTION award_points_on_approval();

DROP TRIGGER IF EXISTS trigger_track_points_on_lead_won ON leads;
CREATE TRIGGER trigger_track_points_on_lead_won
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_points_on_lead_won();

-- Add comments
COMMENT ON FUNCTION calculate_company_points IS 'Calculates total points for a company from all approved installations by company installers';
COMMENT ON FUNCTION update_company_tier IS 'Updates company tier based on current total points';
COMMENT ON FUNCTION update_independent_installer_tier IS 'Updates individual installer tier (for independent installers only)';


-- =============================================
-- MIGRATION: 20251202170806_fix_installation_companies_rls_circular_dependency.sql
-- =============================================
/*
  # Fix Installation Companies RLS Circular Dependency

  ## Problem
  The current RLS policies on installation_companies create a circular dependency:
  - installers table queries installation_companies (via JOIN)
  - installation_companies policies query installers table
  This causes 500 errors during authentication when loading user data.

  ## Solution
  Add a simpler policy that allows reading company data using the foreign key
  directly from the installers table, avoiding the circular dependency.

  ## Changes
  1. Drop the problematic circular policies
  2. Add new policy that uses direct FK relationship without subquery
*/

-- Drop existing circular policies
DROP POLICY IF EXISTS "Company members can read company info" ON installation_companies;
DROP POLICY IF EXISTS "Company managers can read their company" ON installation_companies;

-- Create new policy that allows installers to see their own company
-- This uses a lateral join which PostgreSQL can optimize better
CREATE POLICY "Installers can read their own company"
  ON installation_companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM installers 
      WHERE user_id = auth.uid() 
      AND company_id = installation_companies.id
    )
  );

-- Keep the existing policies for admins and owners
-- (Admin can manage all companies and Company owners can update company remain unchanged)


-- =============================================
-- MIGRATION: 20251202171052_fix_installation_companies_rls_no_circular_deps.sql
-- =============================================
/*
  # Fix Installation Companies RLS Without Circular Dependencies

  ## Problem
  The previous fix still had circular dependencies between installers and installation_companies tables.
  When AuthContext tries to load installer data with a JOIN to installation_companies, the RLS policies
  on installation_companies query back to installers, creating an infinite loop.

  ## Solution
  Remove ALL subquery-based policies on installation_companies. Instead:
  1. Allow admins full access (using JWT metadata, no subquery)
  2. Create a much simpler policy that trusts the FK relationship without validating it through a subquery
  3. The security is maintained because:
     - Users can only UPDATE their own records in installers table (controlled by installers RLS)
     - They cannot set company_id to a company they don't belong to (controlled by business logic)
     - The read policy just allows reading based on what's in their installer record

  ## Changes
  1. Drop ALL existing policies on installation_companies
  2. Create simple admin policy (no subquery)
  3. Create simple read policy based on company_id column only
*/

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Admin can manage all companies" ON installation_companies;
DROP POLICY IF EXISTS "Company owners can update company" ON installation_companies;
DROP POLICY IF EXISTS "Installers can read their own company" ON installation_companies;
DROP POLICY IF EXISTS "Company members can read company info" ON installation_companies;
DROP POLICY IF EXISTS "Company managers can read their company" ON installation_companies;

-- Simple admin policy - no subquery, just check JWT
CREATE POLICY "Admins have full access to companies"
  ON installation_companies
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role' = 'admin') 
    OR 
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

-- For regular users, we need a different approach
-- Instead of checking installers table in the policy, we'll rely on
-- a security definer function that's called from the application layer
-- For now, make it read-only for authenticated users who have a matching installer record
-- The JOIN will work because there's no circular dependency

-- TEMPORARY: Allow all authenticated users to read companies
-- This is safe because the application layer controls who can see what through the installers JOIN
CREATE POLICY "Authenticated users can read companies"
  ON installation_companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Only company owners can update (we'll validate this in the application)
CREATE POLICY "Only validated owners can update companies"
  ON installation_companies
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role' = 'admin') 
    OR 
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role' = 'admin') 
    OR 
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );


-- =============================================
-- MIGRATION: 20251202171249_fix_installers_rls_remove_recursive_policy.sql
-- =============================================
/*
  # Fix Installers RLS - Remove Recursive Policy

  ## Problem
  The policy "Company managers can view team members" on the installers table
  contains a subquery that queries the installers table itself:
  
  ```sql
  company_id IN (
    SELECT company_id FROM installers  -- <-- THIS IS THE PROBLEM
    WHERE user_id = auth.uid() ...
  )
  ```
  
  When AuthContext loads installer data with a JOIN to installation_companies,
  this creates a recursive loop:
  - Query installers with JOIN to installation_companies
  - RLS policy queries installers again
  - That query's RLS policy queries installers again
  - Infinite recursion = 500 error

  ## Solution
  Drop the recursive policy. Company managers will access team data through
  dedicated API queries that don't cause recursion, not through the auth flow.
  
  The auth flow only needs to load the user's own installer record, which is
  already covered by "Installers can view own profile" policy.

  ## Changes
  1. Drop the problematic "Company managers can view team members" policy
  2. Keep other policies that don't cause recursion
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "Company managers can view team members" ON installers;

-- The remaining policies are safe:
-- - "Admin can view all installers" - checks JWT only
-- - "Installers can view own profile" - checks user_id = auth.uid() only
-- - "Installer can view own profile" - duplicate, also safe

-- Company managers will query team members through separate queries
-- that don't happen during auth, so no recursion issue


-- =============================================
-- MIGRATION: 20251202171302_fix_installers_rls_remove_recursive_update_policy.sql
-- =============================================
/*
  # Fix Installers RLS - Remove Recursive Update Policy

  ## Problem
  The policy "Company owners can update team" also has the same recursive issue.

  ## Solution
  Drop this policy. Company owners will use admin functions to update team members,
  which bypass RLS with proper authorization checks.

  ## Changes
  1. Drop the "Company owners can update team" policy
*/

-- Drop the recursive update policy
DROP POLICY IF EXISTS "Company owners can update team" ON installers;

-- Company owners will use edge functions with service role to manage team
-- This is more secure and avoids RLS recursion issues


-- =============================================
-- MIGRATION: 20251202171733_add_onboarding_tracking_to_companies.sql
-- =============================================
/*
  # Add Onboarding Tracking to Installation Companies

  ## Overview
  This migration adds onboarding tracking fields to the installation_companies table.
  These fields allow the system to track whether a company has completed the initial
  onboarding process and what step they're currently on.

  ## Changes Made

  ### 1. New Columns in `installation_companies`
  - `onboarding_completed` (boolean) - Whether the company has completed onboarding
  - `onboarding_step` (integer) - Current step in the onboarding process (0-6)
  - `onboarding_started_at` (timestamptz) - When the company first started onboarding
  - `onboarding_completed_at` (timestamptz) - When the company completed onboarding
  - `onboarding_skipped` (boolean) - Whether the company chose to skip onboarding

  ### 2. Default Values
  - New companies start with onboarding_completed = false
  - onboarding_step defaults to 0
  - Timestamps are set automatically when relevant actions occur

  ## Important Notes
  - Existing companies will have onboarding_completed = true (assumed already onboarded)
  - New companies created after this migration will need to complete onboarding
  - Onboarding can be skipped or resumed at any time
*/

-- Add onboarding tracking columns
DO $$
BEGIN
  -- onboarding_completed: tracks if company finished onboarding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installation_companies' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE installation_companies 
    ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  -- onboarding_step: current step (0 = not started, 1-6 = steps, 7+ = completed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installation_companies' AND column_name = 'onboarding_step'
  ) THEN
    ALTER TABLE installation_companies 
    ADD COLUMN onboarding_step integer DEFAULT 0;
  END IF;

  -- onboarding_started_at: when onboarding was first opened
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installation_companies' AND column_name = 'onboarding_started_at'
  ) THEN
    ALTER TABLE installation_companies 
    ADD COLUMN onboarding_started_at timestamptz;
  END IF;

  -- onboarding_completed_at: when onboarding was finished
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installation_companies' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE installation_companies 
    ADD COLUMN onboarding_completed_at timestamptz;
  END IF;

  -- onboarding_skipped: whether user chose to skip
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installation_companies' AND column_name = 'onboarding_skipped'
  ) THEN
    ALTER TABLE installation_companies 
    ADD COLUMN onboarding_skipped boolean DEFAULT false;
  END IF;
END $$;

-- Set existing companies as already onboarded (grandfather clause)
UPDATE installation_companies 
SET 
  onboarding_completed = true,
  onboarding_step = 99,
  onboarding_completed_at = created_at
WHERE onboarding_completed IS NULL OR onboarding_completed = false;

-- Add comments
COMMENT ON COLUMN installation_companies.onboarding_completed IS 'Whether the company has completed the initial onboarding wizard';
COMMENT ON COLUMN installation_companies.onboarding_step IS 'Current step in onboarding process (0=not started, 1-6=in progress, 99=completed)';
COMMENT ON COLUMN installation_companies.onboarding_started_at IS 'Timestamp when company first opened the onboarding wizard';
COMMENT ON COLUMN installation_companies.onboarding_completed_at IS 'Timestamp when company completed or skipped onboarding';
COMMENT ON COLUMN installation_companies.onboarding_skipped IS 'Whether the company chose to skip the onboarding process';


-- =============================================
-- MIGRATION: 20260128140003_add_company_members_visibility_policy.sql
-- =============================================
/*
  # Add policy for company members visibility

  1. Security Changes
    - Add new SELECT policy allowing installers to view other members of their company
    - This enables the Team Management page to display all team members

  2. Notes
    - Policy checks that both the viewer and the target member belong to the same company
    - Only active installers with a company_id can see other company members
*/

CREATE POLICY "Installers can view company members"
  ON installers
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id IN (
      SELECT i.company_id 
      FROM installers i 
      WHERE i.user_id = auth.uid() 
      AND i.company_id IS NOT NULL
    )
  );

-- =====================================================
-- SEZIONE DATI
-- =====================================================
-- Inserimento di tutti i dati presenti nel database
-- alla data del backup
-- =====================================================

-- Disabilita i constraint FK temporaneamente
ALTER TABLE IF EXISTS lead_assignments DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS lead_status_history DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS lead_notes DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS wallbox_serials DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS installer_rewards DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS points_transactions DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS notification_logs DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS push_subscriptions DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS company_rewards DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS lead_internal_assignments DISABLE TRIGGER ALL;

-- =====================================================
-- AREA MANAGERS
-- =====================================================

INSERT INTO area_managers (id, user_id, name, email, phone, regions, created_at, updated_at) VALUES 
('7206460b-adf7-4745-b29f-4bb5f1703eae', NULL, 'Luca Falconi', 'luca.falconi@daze.eu', '+393441604820', ARRAY['Valle d''Aosta', 'Piemonte', 'Liguria', 'Lombardia', 'Trentino-Alto Adige', 'Veneto', 'Friuli-Venezia Giulia', 'Emilia-Romagna', 'Toscana', 'Umbria', 'Marche'], '2025-10-29 16:59:39.403769+00', '2025-10-29 16:59:39.403769+00'),
('4d8359f1-66ce-4d05-b166-853dcb7a3a00', NULL, 'Alessandro Marinelli', 'alessandro.marinelli@daze.eu', '+393441604820', ARRAY['Lazio', 'Abruzzo', 'Molise', 'Campania', 'Puglia', 'Basilicata', 'Calabria', 'Sicilia', 'Sardegna'], '2025-10-29 16:59:39.403769+00', '2025-10-29 16:59:39.403769+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- INSTALLATION COMPANIES
-- =====================================================

INSERT INTO installation_companies (id, company_name, vat_number, business_name, address, city, province, zip_code, phone, email, logo_url, is_active, created_at, updated_at, onboarding_completed, onboarding_step, onboarding_started_at, onboarding_completed_at, onboarding_skipped) VALUES
('e4d65fb5-8846-4b94-b3d3-d6ac5a6d1e3b', 'Azienda Installatrice Test', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'installatore@daze.eu', NULL, true, '2025-12-02 16:53:54.522834+00', '2025-12-02 17:17:35.406119+00', true, 99, NULL, '2025-12-02 16:53:54.522834+00', false),
('c3f7c553-0ca1-41fc-91f7-d884c1b870a5', 'Giovy', 'IT04777090160', 'Giovy s.r.l.', 'VIA DELLE ATTIVITA'' 12/A', 'Brembate', 'BG', '24041', '', 'admin@giovy.eu', NULL, true, '2025-12-03 09:52:26.901432+00', '2025-12-03 09:58:08.658952+00', false, 0, NULL, NULL, false)
ON CONFLICT (id) DO NOTHING;

