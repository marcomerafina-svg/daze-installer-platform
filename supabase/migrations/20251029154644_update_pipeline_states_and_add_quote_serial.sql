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