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