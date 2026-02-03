# Piano d’azione: migrazione Bolt → Supabase

## Contesto tecnico

**Bolt.new** espone un database che nell’interfaccia viene chiamato “Bolt Database”, ma **sotto il cofano è PostgreSQL gestito tramite le librerie Supabase**. Per questo nel progetto trovi già:

- **`VITE_SUPABASE_URL`** e **`VITE_SUPABASE_ANON_KEY`** nel `.env`
- Client **`@supabase/supabase-js`** in `src/lib/supabase.ts`
- Chiamate `supabase.from('tabella')`, `supabase.auth`, `supabase.storage`

Quindi: **il codice è già scritto per Supabase**. La “migrazione” non è riscrivere l’app, ma:

1. Creare un **progetto Supabase tuo** (non più quello gestito da Bolt).
2. Ricreare **stesso schema** (tabelle, RLS, trigger) sul nuovo progetto.
3. **Portare i dati** dal database Bolt (PostgreSQL) al nuovo Supabase.
4. **Ricreare utenti Auth** e collegarli alle tabelle (es. `installers.user_id`).
5. **Configurare Storage e Edge Functions** sul nuovo progetto.
6. **Puntare** `.env` al nuovo URL e alla nuova anon key.

Le logiche (pipeline a 4 stati, ruoli, RLS, company, rewards) restano quelle già definite nel codice e nelle migrazioni; non vanno toccate.

---

## Cosa non cambiare (per non rompere le logiche)

| Elemento | Da mantenere |
|----------|----------------|
| **Stati pipeline** | Solo: `'Nuova'`, `'In lavorazione'`, `'Chiusa Vinta'`, `'Chiusa Persa'` (mai minuscolo `vinta`/`persa` in query) |
| **Ruoli Auth** | `admin`, `installer`, `company_owner`, `company_admin` (in `app_metadata.role`) |
| **Schema DB** | Ordine esatto delle 33 migrazioni in `supabase/migrations/` |
| **RLS** | Policy definite nelle migrazioni: admin vede tutto, installatori/company solo i propri dati |
| **Relazioni** | `installers.company_id`, `lead_assignments.assigned_to_company_id`, company_rewards, lead_internal_assignments |
| **Env** | Stessi nomi: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (solo i valori puntano al nuovo progetto) |
| **Edge Functions** | Stessi nomi e firme usati dal frontend (`receive-lead`, `create-company`, ecc.) |

---

## Piano d’azione (ordine da rispettare)

### Fase 1 – Preparazione

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1.1 | Creare progetto Supabase | [supabase.com](https://supabase.com) → New project → Nome, password DB, region. Salvare **Project URL** e **anon public** (API). |
| 1.2 | Annotare come esportare da Bolt | Bolt = PostgreSQL/Supabase: se Bolt.new offre export (SQL dump, CSV, o accesso al progetto Supabase “sotto”), usare quello per ottenere i dati. Altrimenti usare eventuale `data_backup_complete.sql` se già allineato allo schema. |

---

### Fase 2 – Schema sul nuovo Supabase

| # | Azione | Dettaglio |
|---|--------|-----------|
| 2.1 | Eseguire le 33 migrazioni in ordine | SQL Editor Supabase. Copiare ed eseguire **ogni** file da `supabase/migrations/` **nell’ordine** del nome (20251029144241 → … → 20260128140003). Non saltare, non invertire. |
| 2.2 | Verificare tabelle e RLS | Controllare che esistano tabelle (installers, leads, lead_assignments, lead_status_history, lead_notes, area_managers, products, wallbox_serials, rewards_tiers, installer_rewards, company_rewards, points_transactions, notification_logs, push_subscriptions, installation_companies, lead_internal_assignments, ecc.) e che RLS sia abilitato. |

---

### Fase 3 – Autenticazione e dati

| # | Azione | Dettaglio |
|---|--------|-----------|
| 3.1 | Creare utenti in Supabase Auth | Authentication → Users → Add user. Per ogni utente: email, password. Impostare **ruolo** in App Metadata / User Metadata: `"role": "admin"` | `"installer"` | `"company_owner"` | `"company_admin"`. Annotare **User UID** (UUID) per ogni utente. |
| 3.2 | Importare i dati | Eseguire gli INSERT (da export Bolt o da `data_backup_complete.sql`) nel SQL Editor, rispettando le FK: prima tabelle “padre” (products, rewards_tiers, area_managers, installation_companies), poi installers, leads, lead_assignments, ecc. |
| 3.3 | Collegare `user_id` in `installers` | Ogni riga in `installers` deve avere `user_id` = UUID dell’utente creato in Auth (Passo 3.1). Se gli INSERT hanno `user_id` NULL o vecchi ID, fare `UPDATE installers SET user_id = '<User UID>' WHERE email = '...';` per ogni utente. |
| 3.4 | Verificare stati lead nei dati | Se i dati contengono stati diversi dai 4 ammessi (`Nuova`, `In lavorazione`, `Chiusa Vinta`, `Chiusa Persa`), convertirli prima/durante l’import (es. "Chiusa vinta" → "Chiusa Vinta"). |

---

### Fase 4 – Storage

| # | Azione | Dettaglio |
|---|--------|-----------|
| 4.1 | Creare bucket | Storage → New bucket: `lead-quotes` (PDF preventivi). Poi `installation-photos` (foto installazioni). Policy RLS per storage: già definite in alcune migrazioni; verificare che siano attive o replicarle (admin tutto; installatori solo per lead assegnate). |

---

### Fase 5 – Edge Functions

| # | Azione | Dettaglio |
|---|--------|-----------|
| 5.1 | Deploy functions | Da cartella progetto: `supabase link --project-ref <ref>`, poi `supabase functions deploy <nome>` per: receive-lead, send-lead-notification, send-lead-confirmation-notification, send-lead-closure-notification, send-push-notification, create-company, create-test-installer, delete-user, reset-owner-password, update-user-password. |
| 5.2 | Secrets / env | Configurare in Dashboard → Edge Functions eventuali variabili (API key email, ecc.) usate dalle functions. |

---

### Fase 6 – Frontend e configurazione

| # | Azione | Dettaglio |
|---|--------|-----------|
| 6.1 | Aggiornare `.env` | Nel progetto: `VITE_SUPABASE_URL=<nuovo Project URL>`, `VITE_SUPABASE_ANON_KEY=<nuova anon key>`. Stessi nomi variabili, nuovi valori. |
| 6.2 | Codice stati lead | Già corretto: tutte le query usano `'Chiusa Vinta'` e `'Chiusa Persa'` (mai minuscolo). Se trovi ancora `Chiusa vinta`/`Chiusa persa` in altri file, sostituire. |
| 6.3 | Build e typecheck | `npm install`, `npm run build`, `npm run typecheck`. Nessun errore. |
| 6.4 | Test | `npm run dev`. Login con utenti creati in 3.1. Verificare: dashboard, lead, permessi (admin vede tutto, installatore solo sue lead, company solo sua azienda). Test opzionali: creazione azienda, webhook receive-lead, upload PDF/foto. |

---

## Riepilogo ordine

```
1. Creare progetto Supabase → salvare URL e anon key
2. Eseguire le 33 migrazioni in ordine (schema)
3. Creare utenti Auth con ruolo → annotare User UID
4. Importare dati → collegare installers.user_id agli UID
5. Creare bucket lead-quotes e installation-photos
6. Deploy Edge Functions + secrets
7. .env con nuovo URL e anon key
8. Build, typecheck, test
```

---

## Riferimenti nel progetto

| Cosa | Dove |
|------|------|
| Schema (ordine migrazioni) | `supabase/migrations/` (33 file, ordine per nome) |
| Client e env | `src/lib/supabase.ts`, variabili `VITE_SUPABASE_*` |
| Ruoli e Auth | `src/contexts/AuthContext.tsx` (legge `app_metadata.role`) |
| Tipi e stati pipeline | `src/types/index.ts` (`LeadStatus`, `Database`) |
| Guida passo-passo dettagliata | `GUIDA_PASSO_PASSO_MIGRAZIONE.md` |
| Dati di backup (se disponibili) | `data_backup_complete.sql` |

---

**In sintesi**: Bolt.new è già “Supabase sotto il cofano”; la migrazione consiste nel creare il tuo progetto Supabase, ricreare schema e dati, Auth e Storage/Functions, e aggiornare solo URL e anon key nel `.env`, senza cambiare le logiche dell’app.
