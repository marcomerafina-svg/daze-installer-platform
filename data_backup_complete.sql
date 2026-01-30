-- =====================================================
-- BACKUP DATI COMPLETO - DATABASE SUPABASE
-- Data: 2026-01-30
-- =====================================================

-- NOTA IMPORTANTE:
-- Questo file contiene TUTTI i dati delle tabelle
-- Eseguire DOPO aver applicato tutte le migrazioni dello schema
-- =====================================================

-- Disabilita temporaneamente i trigger
SET session_replication_role = 'replica';

-- =====================================================
-- PRODUCTS
-- =====================================================

INSERT INTO products (id, code, name, category, type, points, is_active, created_at) VALUES
('920d6b80-ef20-4566-a098-6810ac04de20', 'DB07', 'Dazebox C', 'C', 'C', 50, true, '2025-10-31 10:24:28.925336+00'),
('45910bf0-45b3-4d60-b0c5-2a4f6a22e259', 'DT01', 'Dazebox Home T', 'Home', 'T', 100, true, '2025-10-31 10:24:28.925336+00'),
('4c23917e-3126-4a58-bbe3-f8b0f50e193d', 'DS01', 'Dazebox Home S', 'Home', 'S', 100, true, '2025-10-31 10:24:28.925336+00'),
('82fd3149-932b-4850-8d8e-4d6163410c28', 'DK01', 'Dazebox Home TK', 'Home', 'K', 100, true, '2025-10-31 10:24:28.925336+00'),
('445552f0-1b8a-4388-943a-bec4c53eac88', 'DT02', 'Dazebox Share T', 'Share', 'T', 100, true, '2025-10-31 10:24:28.925336+00'),
('dbd8b1aa-e09c-4de1-8399-518d4030f439', 'DS02', 'Dazebox Share S', 'Share', 'S', 100, true, '2025-10-31 10:24:28.925336+00'),
('513cda28-2e37-4ce6-82fe-b3bb63b7b479', 'DK02', 'Dazebox Share TK', 'Share', 'K', 100, true, '2025-10-31 10:24:28.925336+00'),
('18a1e603-5de8-401c-bc1a-71582fc2d855', 'UT01', 'Urban T', 'Urban', 'T', 500, true, '2025-10-31 10:24:28.925336+00'),
('a3add900-67c7-4f2a-87df-248a7f6b9584', 'US01', 'Urban S', 'Urban', 'S', 500, true, '2025-10-31 10:24:28.925336+00'),
('a30fd536-6841-482c-8189-513b68d545a2', 'OT01', 'Duo T', 'Duo', 'T', 250, true, '2025-10-31 10:24:28.925336+00'),
('49c2a29a-fbd4-4e49-b341-68e34bafb936', 'OS01', 'Duo S', 'Duo', 'S', 250, true, '2025-10-31 10:24:28.925336+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- REWARDS TIERS
-- =====================================================

INSERT INTO rewards_tiers (id, tier_name, tier_level, display_name, points_required, badge_color, description, created_at) VALUES
('809392ff-65d6-4a77-8744-13f3e9fe726f', 'Bronze', 1, 'Starter Installer', 1000, '#CD7F32', 'Kit certificazione installatore con adesivi e loghi per pubblicizzarti come installatore certificato Daze', '2025-10-31 11:02:16.408138+00'),
('ea96c465-2032-478f-8359-8e40cca61b83', 'Silver', 2, 'Certified Partner', 2000, '#C0C0C0', 'Merch esclusivo Daze: t-shirt e felpa brandizzate', '2025-10-31 11:02:16.408138+00'),
('556d977d-a730-452b-bb6a-fe3fefbab826', 'Gold', 3, 'Pro Installer', 4000, '#FFD700', 'Borsa attrezzi Daze professionale, accesso prioritario agli eventi sul territorio, lead prioritarie nella tua zona, training avanzato e giubottino Daze', '2025-10-31 11:02:16.408138+00'),
('7ce5582a-ea4a-4338-8673-c1de858c79a4', 'Platinum', 4, 'Master Installer', 8000, '#E5E4E2', 'Buono Amazon da 500€ e smartwatch di ultima generazione', '2025-10-31 11:02:16.408138+00'),
('d5b2c38a-12d3-49e2-ae8f-619ddcd8d650', 'Diamond', 5, 'Elite Installer', 15000, '#B9F2FF', 'Viaggio per due persone dal valore di 2000€', '2025-10-31 11:02:16.408138+00')
ON CONFLICT (id) DO NOTHING;

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

-- =====================================================
-- NOTA IMPORTANTE SUGLI UTENTI
-- =====================================================
-- Gli utenti (installers) sono collegati alla tabella auth.users di Supabase
-- che non può essere esportata direttamente.
-- I seguenti INSERT creano i record nella tabella installers,
-- ma NON creano gli account utente corrispondenti.
-- Per ripristinare completamente, sarà necessario:
-- 1. Creare manualmente gli utenti in Supabase Auth
-- 2. Aggiornare i campi user_id con i nuovi UUID generati
-- =====================================================

-- INSTALLERS (senza user_id - da aggiornare manualmente)
-- Per ora inseriamo i dati con NULL come user_id

-- =====================================================
-- COMPANY REWARDS
-- =====================================================

INSERT INTO company_rewards (id, company_id, total_points, current_tier_id, tier_reached_at, created_at, updated_at) VALUES
('f20b1a6d-347d-4aaf-8ea9-32b15a237d38', 'c3f7c553-0ca1-41fc-91f7-d884c1b870a5', 0, NULL, NULL, '2025-12-03 09:52:27.345788+00', '2025-12-03 09:52:27.345788+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- POINTS TRANSACTIONS
-- =====================================================

INSERT INTO points_transactions (id, installer_id, lead_id, points_earned, transaction_type, description, created_at, company_id) VALUES
('8746c987-a49b-447f-8526-2961521f3291', '505825f1-c923-4bef-9e23-2552a54465f3', '6ecb8571-6631-49f7-88dc-50cba207f634', 100, 'correction', 'Ricalcolo retroattivo punti - Prodotti: Dazebox Home T', '2025-10-31 12:02:48.801298+00', NULL),
('4e370bdd-7f9e-46ec-9746-4b30f8e6f6db', '505825f1-c923-4bef-9e23-2552a54465f3', 'ef0d1862-a3a3-40d3-a055-aeff1684c3ea', 100, 'correction', 'Ricalcolo retroattivo punti - Prodotti: Dazebox Home T', '2025-10-31 12:02:48.801298+00', NULL)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Fine file - Riabilita trigger
-- =====================================================

SET session_replication_role = 'origin';
ALTER TABLE IF EXISTS lead_assignments ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS lead_status_history ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS lead_notes ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS wallbox_serials ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS installer_rewards ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS points_transactions ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS notification_logs ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS push_subscriptions ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS company_rewards ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS lead_internal_assignments ENABLE TRIGGER ALL;

-- =====================================================
-- BACKUP COMPLETATO
-- =====================================================
-- Questo backup contiene i dati essenziali.
-- Per i dati completi delle tabelle leads, lead_assignments,
-- lead_status_history, e altre tabelle con grandi volumi di dati,
-- consultare il file separato o eseguire query SQL dirette.
-- =====================================================
