# Guida passo-passo: da Bolt a Supabase (senza rompere le logiche)

**Situazione**: Il progetto è su Bolt (bolt.new), il database è Bolt. Supabase non esiste ancora.  
**Obiettivo**: Creare il progetto Supabase da zero, creare lo schema, portare i dati e collegare l’app **senza cambiare le logiche** (pipeline a 4 stati, ruoli, RLS, company, ecc.).

Segui i passi **nell’ordine**. Non saltare passi.

---

## PASSO 1 – Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) e accedi (o registrati).
2. **New project**:
   - **Name**: es. `daze-lead-management`
   - **Database Password**: scegli una password forte e **salvala** (serve per accedere al DB).
   - **Region**: scegli la più vicina (es. Frankfurt).
3. Clicca **Create new project** e attendi che il progetto sia pronto (1–2 minuti).
4. Quando è pronto, vai in **Project Settings** (icona ingranaggio) → **API**:
   - Copia e salva da qualche parte:
     - **Project URL** (es. `https://xxxxx.supabase.co`)
     - **anon public** (chiave lunga sotto "Project API keys")

Queste due valori andranno nel file `.env` del progetto (Passo 8).

---

## PASSO 2 – Crea lo schema: esegui le migrazioni in ordine

Lo schema del database (tabelle, RLS, trigger) è definito dai file in `supabase/migrations/`. **Devi eseguirli nell’ordine esatto** (il nome del file contiene la data).

1. In Supabase Dashboard apri **SQL Editor**.
2. Apri il **primo** file di migrazione nel tuo editor:
   - `supabase/migrations/20251029144241_create_initial_schema.sql`
3. Copia **tutto** il contenuto del file.
4. Incollalo nel SQL Editor di Supabase e clicca **Run**.
5. Controlla che non ci siano errori in rosso.
6. Ripeti per **ogni** file, **nell’ordine** in cui compaiono nella cartella:

   - 20251029144241_create_initial_schema.sql  
   - 20251029154644_update_pipeline_states_and_add_quote_serial.sql  
   - 20251029165937_add_area_managers_and_update_installers.sql  
   - 20251030000000_add_automatic_lead_notifications.sql  
   - 20251030132808_add_automatic_lead_notifications.sql  
   - 20251030135755_fix_notification_trigger.sql  
   - 20251030144501_add_lead_confirmation_tracking.sql  
   - 20251030144857_add_lead_confirmation_tracking.sql  
   - 20251030151337_fix_confirmation_trigger_authentication.sql  
   - 20251031102357_create_products_and_serials_tables.sql  
   - 20251031102427_seed_products_data.sql  
   - 20251031102925_migrate_existing_serials_to_new_table.sql  
   - 20251031110214_create_rewards_system.sql  
   - 20251031120109_update_product_points_values.sql  
   - 20251031120247_recalculate_retroactive_points_v2.sql  
   - 20251103124910_create_push_subscriptions_table.sql  
   - 20251103125416_add_push_notification_to_trigger.sql  
   - 20251103132410_fix_notification_trigger_auth.sql  
   - 20251202154710_add_self_reported_installations_support.sql  
   - 20251202154730_create_installation_photos_storage.sql  
   - 20251202155425_update_rewards_for_approval_status_fixed.sql  
   - 20251202160752_create_installation_companies_table.sql  
   - 20251202160839_add_company_fields_to_installers.sql  
   - 20251202160856_add_company_rls_policies.sql  
   - 20251202160946_restructure_rewards_for_companies.sql  
   - 20251202161015_add_company_to_lead_assignments.sql  
   - 20251202161046_create_lead_internal_assignments_history.sql  
   - 20251202161216_update_points_calculation_for_companies.sql  
   - 20251202170806_fix_installation_companies_rls_circular_dependency.sql  
   - 20251202171052_fix_installation_companies_rls_no_circular_deps.sql  
   - 20251202171249_fix_installers_rls_remove_recursive_policy.sql  
   - 20251202171302_fix_installers_rls_remove_recursive_update_policy.sql  
   - 20251202171733_add_onboarding_tracking_to_companies.sql  
   - 20260128140003_add_company_members_visibility_policy.sql  

**Importante**:  
- Non invertire l’ordine e non saltare file.  
- Se una migrazione fallisce, leggi l’errore: spesso è un vincolo o un nome tabella già esistente; in quel caso puoi commentare solo la riga che dà errore **solo se capisci che non rompe la logica** (altrimenti chiedi).

Al termine del Passo 2 avrai tutte le tabelle, RLS, trigger e funzioni PostgreSQL create su Supabase. Le logiche (4 stati pipeline, ruoli, company) sono quelle definite da queste migrazioni.

---

## PASSO 3 – Crea gli utenti (Auth)

L’app legge il ruolo da Supabase Auth (`app_metadata.role`). I dati nelle tabelle (es. `installers`) referenziano gli utenti con `user_id` = ID in `auth.users`. Quindi **prima** crei gli utenti, **poi** importi/aggiorni i dati.

1. In Supabase Dashboard vai in **Authentication** → **Users**.
2. Clicca **Add user** → **Create new user**.
3. Per ogni utente che ti serve (admin, installatori, owner aziende):
   - **Email**: es. `admin@daze.eu`
   - **Password**: scegli una password (e salvala per i test).
   - Clicca **Create user**.
4. Per **impostare il ruolo**:
   - Apri l’utente appena creato.
   - In **User Metadata** (o **Raw User Meta Data**) aggiungi/modifica così che ci sia:
     - `role`: `"admin"` oppure `"installer"` oppure `"company_owner"` oppure `"company_admin"`.
   - In Supabase il ruolo va spesso in **App Metadata**: se nella dashboard c’è "App Metadata", metti lì `{ "role": "admin" }` (o installer/company_owner/company_admin).

Se non vedi dove mettere il ruolo: in **Authentication** → **Users** → clicca sull’utente → cerca "Identity" / "Metadata". In molti progetti si usa **Dashboard → Authentication → Users → [user] → Edit → Raw User Meta Data** e si aggiunge `"role": "admin""`.

**Annota per ogni utente**:
- Email
- Ruolo
- **User UID** (l’ID lungo tipo UUID che vedi nella scheda utente): ti serve per collegare le righe in `installers` (Passo 4).

---

## PASSO 4 – Importa i dati (da Bolt a Supabase)

I dati che oggi sono su Bolt devono finire nelle tabelle Supabase. Due casi:

### Opzione A – Hai già un file SQL con i dati (es. export da Bolt convertito in INSERT)

1. Se hai un file tipo `data_backup_complete.sql` con `INSERT INTO ...` in sintassi PostgreSQL:
   - Apri il file e **controlla** che non ci siano `INSERT` in tabelle di sistema (es. `auth.users`). Gli utenti li hai creati a mano al Passo 3.
   - Se ci sono `INSERT` in `installers` con `user_id = NULL` o con vecchi ID Bolt:
     - Esegui prima gli altri `INSERT` (products, rewards_tiers, area_managers, installation_companies, company_rewards, points_transactions, ecc.).
     - Per `installers`: o modifichi il file e metti nei vari `INSERT` il **User UID** giusto (quello annotato al Passo 3) al posto di `NULL`/vecchio ID, oppure dopo aver eseguito gli INSERT fai degli `UPDATE installers SET user_id = '...' WHERE email = '...';` per ogni utente.
   - Nel **SQL Editor** di Supabase incolla il contenuto (o una parte alla volta se è grande) e esegui.
2. Se durante l’import vedi errori di vincolo (es. foreign key), di solito è perché l’ordine delle tabelle non rispetta le FK: inserisci prima le tabelle “padre” (es. `installation_companies`, `products`, `rewards_tiers`) e poi `installers`, `leads`, `lead_assignments`, ecc.

### Opzione B – Esporti i dati da Bolt (CSV/JSON/SQL)

1. Da Bolt.new (o da dove hai il progetto Bolt) esporta i dati di ogni tabella nel modo che Bolt ti permette (CSV, JSON, o SQL).
2. Se ottieni CSV/JSON:
   - Puoi usare script (es. Python/Node) per generare `INSERT` in sintassi PostgreSQL e poi eseguirli nel SQL Editor.
   - Oppure usare **Supabase Dashboard → Table Editor**: crea le righe a mano o importa CSV se Supabase lo supporta per quella tabella.
3. **Obbligatorio**: in `installers`, la colonna `user_id` deve contenere l’UUID dell’utente creato in Supabase Auth (Passo 3). Dopo l’import, se `user_id` è vuoto, fai `UPDATE installers SET user_id = '<User UID>' WHERE email = 'email@...';` per ogni riga.

**Stati lead**: il DB accetta solo questi 4 valori (come nelle migrazioni):  
`'Nuova'`, `'In lavorazione'`, `'Chiusa Vinta'`, `'Chiusa Persa'`.  
Se i dati da Bolt usano testi diversi (es. "Chiusa vinta"), convertili in "Chiusa Vinta" prima o durante l’import, altrimenti il CHECK sulla colonna blocca l’INSERT.

---

## PASSO 5 – Storage (bucket)

L’app usa due bucket per i file:

1. In Supabase vai in **Storage**.
2. **New bucket**:
   - Nome: `lead-quotes`  
   - Public: sì (se l’app deve mostrare i PDF senza signed URL).  
   - Crea.
3. **New bucket**:
   - Nome: `installation-photos`  
   - Public: come preferisci (le policy RLS le hai già nelle migrazioni se sono state applicate allo storage).  
   - Crea.

Se nelle migrazioni che hai eseguito c’erano già policy per `storage.objects` (bucket `lead-quotes` e simili), sono già attive. Altrimenti in **Storage → [bucket] → Policies** puoi aggiungere policy che permettono agli utenti autenticati (e in base al ruolo) di leggere/scrivere solo dove serve. Le logiche da rispettare sono: admin può tutto; installatore solo per le lead a lui assegnate.

---

## PASSO 6 – Edge Functions (backend)

Le chiamate dal frontend vanno a URL tipo `https://<tuo-progetto>.supabase.co/functions/v1/nome-function`. Deploy delle functions:

1. Installa Supabase CLI sul PC (se non l’hai già):  
   [Documentazione Supabase CLI](https://supabase.com/docs/guides/cli)
2. Nella cartella del progetto (dove c’è `supabase/functions/`) da terminale:
   - `supabase login`
   - `supabase link --project-ref <ref-del-progetto>` (il ref è nell’URL del progetto, es. `abcdefghijk`)
3. Deploy di tutte le functions:
   - `supabase functions deploy receive-lead`
   - `supabase functions deploy send-lead-notification`
   - `supabase functions deploy send-lead-confirmation-notification`
   - `supabase functions deploy send-lead-closure-notification`
   - `supabase functions deploy send-push-notification`
   - `supabase functions deploy create-company`
   - `supabase functions deploy create-test-installer`
   - `supabase functions deploy delete-user`
   - `supabase functions deploy reset-owner-password`
   - `supabase functions deploy update-user-password`

Se una function usa variabili (es. API key per email), impostale in **Dashboard → Edge Functions → [nome] → Settings → Secrets**.

---

## PASSO 7 – File `.env` nel progetto

Nel progetto (cartella dove c’è `package.json`):

1. Crea o modifica il file `.env` (non committarlo se contiene segreti).
2. Inserisci (sostituendo con i tuoi valori del Passo 1):

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- `VITE_SUPABASE_URL` = Project URL  
- `VITE_SUPABASE_ANON_KEY` = anon public key  

Salva. L’app usa queste due variabili; non servono nomi diversi per non rompere le logiche.

---

## PASSO 8 – Correzione codice (stati lead)

Nel codice ci sono ancora alcune query che usano `'Chiusa vinta'` e `'Chiusa persa'` (minuscolo). Il database dopo le migrazioni accetta solo `'Chiusa Vinta'` e `'Chiusa Persa'`. Per non avere filtri che non trovano nulla, vanno uniformate.

**File da correggere** (cercare e sostituire):

- `src/pages/company/CompanyDashboard.tsx`:  
  `"Chiusa vinta"` → `"Chiusa Vinta"`  
  `"Chiusa persa"` → `"Chiusa Persa"`
- `src/pages/company/TeamManagement.tsx`:  
  `"Chiusa vinta"` → `"Chiusa Vinta"`
- `src/pages/admin/Installers.tsx`:  
  `"Chiusa vinta"` → `"Chiusa Vinta"`  
  `"Chiusa persa"` → `"Chiusa Persa"`

Queste correzioni sono state applicate in automatico nella codebase (vedi sotto).

---

## PASSO 9 – Verifica e test

1. **Build**: da terminale nella cartella del progetto:
   - `npm install`
   - `npm run build`
   - `npm run typecheck`  
   Non devono esserci errori.
2. **Avvio**: `npm run dev`. Apri l’app nel browser.
3. **Login**: accedi con un utente creato al Passo 3 (es. admin). Controlla che:
   - La dashboard carichi.
   - Le lead (se ne hai importate) si vedano con gli stati corretti.
   - Un installatore veda solo le sue lead.
   - Un company_owner veda lead/team della sua azienda.
4. **Funzioni extra**: prova (se possibile) creazione azienda, ricezione lead (webhook), upload preventivo/foto, per essere sicuri che Storage e Edge Functions siano collegati bene.

---

## Riepilogo ordine (senza rompere le logiche)

| # | Cosa fare |
|---|-----------|
| 1 | Creare progetto Supabase, salvare URL e anon key |
| 2 | Eseguire le 33 migrazioni in ordine nel SQL Editor |
| 3 | Creare utenti in Auth e impostare `role` in metadata |
| 4 | Importare i dati da Bolt (SQL/CSV/JSON) e collegare `installers.user_id` agli UID Auth |
| 5 | Creare bucket `lead-quotes` e `installation-photos` |
| 6 | Deploy di tutte le Edge Functions |
| 7 | Scrivere `.env` con `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` |
| 8 | Correggere nel codice `Chiusa vinta`/`Chiusa persa` → `Chiusa Vinta`/`Chiusa Persa` |
| 9 | npm install, build, typecheck, test login e permessi |

Non invertire i passi 2 → 3 → 4: prima schema, poi utenti Auth, poi dati con `user_id` corretti. Così le logiche (RLS, ruoli, pipeline a 4 stati, company) restano quelle previste dal progetto.
