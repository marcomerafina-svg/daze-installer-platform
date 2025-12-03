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
