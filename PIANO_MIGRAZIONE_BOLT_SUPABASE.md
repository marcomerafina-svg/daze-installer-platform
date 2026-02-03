# Piano di migrazione: da Bolt (bolt.new) a Supabase

**Obiettivo**: Portare il contenuto dei database da Bolt a Supabase e aggiornare il progetto senza distruggere le logiche esistenti.

**Contesto**: Il progetto è nato su bolt.new con database Bolt. Questo backup contiene già codice che usa il client Supabase e file SQL in formato PostgreSQL/Supabase. Il piano copre sia il caso in cui i **dati sono ancora in Bolt** sia il caso in cui il **backup è già l’export da Supabase** e serve solo ripristinare su un nuovo progetto.

---

## 1. Situazione attuale (analisi)

### 1.1 Codice
- **Nessun riferimento a Bolt** nel codice: tutto l’accesso dati passa da `@supabase/supabase-js` (`src/lib/supabase.ts`).
- **Auth**: Supabase Auth (sessioni, `auth.users`, ruoli in `app_metadata`).
- **Dati**: `supabase.from('tabella')` ovunque (leads, installers, lead_assignments, ecc.).
- **Storage**: bucket `lead-quotes` e `installation-photos` citati nel codice.
- **Edge Functions**: URL Supabase (`/functions/v1/nome-function`) per create-company, receive-lead, ecc.

**Conclusione**: Il codice è già “Supabase-ready”. Non serve sostituire un client Bolt con Supabase; serve **assicurare che schema, dati, auth, storage e functions siano tutti su Supabase** e che configurazione e tipi siano coerenti.

### 1.2 Backup SQL
- `database_backup_complete.sql`: schema completo (migrazioni concatenate) in formato **PostgreSQL/Supabase**.
- `data_backup_complete.sql`: dati essenziali (products, rewards_tiers, area_managers, installation_companies, company_rewards, points_transactions) in formato **PostgreSQL**.
- **Nota**: I backup non contengono `auth.users`; gli utenti vanno ricreati in Supabase Auth e i `user_id` in `installers` aggiornati di conseguenza.

### 1.3 Allineamento logiche da non rompere
- **Pipeline lead**: 4 stati (`Nuova`, `In lavorazione`, `Chiusa Vinta`, `Chiusa Persa`). La migrazione `20251029154644` ha già allineato il DB. In codice ci sono ancora query con `'Chiusa vinta'` (minuscolo): vanno uniformate a `'Chiusa Vinta'` per coerenza.
- **Ruoli**: `admin`, `installer`, `company_owner`, `company_admin` (da `app_metadata.role`).
- **RLS**: policy per admin (tutto) e per installatori/aziende (solo dati di competenza). Le migrazioni definiscono già le policy; vanno applicate nello stesso ordine.
- **Tabelle “company”**: `installation_companies`, `company_rewards`, `lead_assignments.assigned_to_company_id`, assegnazioni interne. Lo schema nelle migrazioni è la fonte di verità.

---

## 2. Due scenari di migrazione

### Scenario A – Dati ancora in Bolt (export da bolt.new)
Se i dati “vivi” sono ancora nel database Bolt e non in Supabase:

1. **Export da Bolt**
   - Da bolt.new: usare l’export dati se disponibile (JSON/CSV/SQL).
   - Documentare quali tabelle e campi esistono in Bolt e come si mappano allo schema Supabase (nomi colonne, tipi, FK).

2. **Trasformazione**
   - Script (es. Node/TypeScript o Python) che legge l’export Bolt e genera:
     - `INSERT` PostgreSQL per le tabelle pubbliche, oppure
     - File CSV da importare con Supabase/Postgres.
   - Mappare gli ID utente Bolt → `auth.users.id` Supabase (dopo aver creato gli utenti in Supabase Auth).

3. **Import in Supabase**
   - Prima: applicare tutto lo schema (vedi sotto “Fase 2”).
   - Poi: eseguire gli INSERT/import generati, rispettando l’ordine delle FK (es. installers dopo auth.users, lead_assignments dopo leads e installers).

4. **Auth**
   - Creare in Supabase Auth un utente per ogni utente Bolt (stessa email/password o invito).
   - Aggiornare `installers.user_id` (e eventuali altre tabelle che referenziano utenti) con i nuovi UUID di `auth.users`.

### Scenario B – Backup già da Supabase (o schema+dati già in formato Postgres)
Se i file SQL del backup sono già l’export del DB Supabase (o uno schema Postgres equivalente):

1. Creare un **nuovo progetto Supabase** (o usare quello esistente).
2. Applicare lo **schema** (Fase 2).
3. Importare i **dati** con `data_backup_complete.sql` (e eventuali altri dump) dopo aver creato gli utenti in Auth e aggiornato i riferimenti (es. `user_id` in installers).
4. Completare Auth, Storage, Edge Functions e frontend come sotto (Fasi 3–6).

---

## 3. Piano operativo in 6 fasi

Le fasi sono pensate per **non distruggere le logiche**: si lavora prima su schema e dati, poi su auth, storage, functions e infine sul codice/config.

### Fase 1 – Preparazione e scelta scenario
- [ ] Decidere se i dati da migrare sono **solo** quelli nei file SQL (Scenario B) o **anche** da Bolt (Scenario A).
- [ ] Se Scenario A: ottenere l’export Bolt e documentare il mapping tabelle/campi/ID.
- [ ] Creare un **progetto Supabase** (nuovo o esistente) e annotare:
  - URL progetto
  - Chiave anon (public) e, se serve, service_role per script una tantum.
- [ ] Clonare/estrarre il backup del progetto in una cartella di lavoro e verificare che `project/supabase/migrations` contenga tutte le migrazioni.

### Fase 2 – Schema database su Supabase
- [ ] Nel progetto Supabase: **SQL Editor** (o Supabase CLI).
- [ ] Applicare le migrazioni **nell’ordine cronologico** dei nomi file (es. `20251029144241_...` poi `20251029154644_...` ecc.).
  - Opzione 1: eseguire ogni file in `supabase/migrations/` uno dopo l’altro.
  - Opzione 2: se disponibile, usare `database_backup_complete.sql` come singolo script schema (verificare che contenga tutte le migrazioni e nessun dato sensibile da sovrascrivere).
- [ ] Verificare che tutte le tabelle siano create: installers, leads, lead_assignments, lead_status_history, lead_notes, area_managers, products, wallbox_serials, rewards_tiers, installer_rewards, company_rewards, points_transactions, notification_logs, push_subscriptions, installation_companies, lead_internal_assignments, ecc.
- [ ] Verificare che RLS sia abilitato e che le policy siano quelle delle migrazioni (nessuna modifica “a mano” che contraddica le logiche esistenti).

### Fase 3 – Dati e autenticazione
- [ ] **Auth**: creare in Supabase Dashboard → Authentication gli utenti necessari (admin, installatori, owner aziende). Impostare per ciascuno `app_metadata.role` (admin, installer, company_owner, company_admin).
- [ ] **Dati**:
  - Eseguire `data_backup_complete.sql` (o lo script generato in Scenario A) **dopo** aver creato gli utenti.
  - Nel backup, gli INSERT per `installers` potrebbero avere `user_id = NULL`: aggiornare ogni riga con il corrispondente `auth.users.id` (in base a email).
- [ ] Verificare vincoli FK e RLS: login con un utente admin e un installatore e controllare che le query restituiscano i dati attesi.

### Fase 4 – Storage
- [ ] Creare i bucket:
  - `lead-quotes` (PDF preventivi)
  - `installation-photos` (foto installazioni)
- [ ] Se le migrazioni definiscono già policy RLS per `storage.objects`, verificare che siano state applicate; altrimenti replicare le policy descritte nelle migrazioni (admin + installatori assegnati alle lead).
- [ ] Test: upload/download da app per lead e installazioni.

### Fase 5 – Edge Functions
- [ ] Da `project/supabase/functions/` deployare tutte le functions su Supabase (CLI: `supabase functions deploy nome-function` o deploy globale).
- [ ] Elenco: receive-lead, send-lead-notification, send-lead-confirmation-notification, send-lead-closure-notification, send-push-notification, create-company, create-test-installer, delete-user, reset-owner-password, update-user-password.
- [ ] Configurare segreti/env per le functions (es. Resend, URL frontend) se usati.
- [ ] Test minimo: es. chiamata a `receive-lead` o `create-company` con payload di test.

### Fase 6 – Frontend e configurazione
- [ ] **Variabili ambiente**: nel progetto frontend, `.env` (o Vercel/env):
  - `VITE_SUPABASE_URL` = URL del progetto Supabase
  - `VITE_SUPABASE_ANON_KEY` = chiave anon
- [ ] **Codice**: uniformare le query che filtrano per stato lead usando **sempre** i valori con maiuscola: `'Chiusa Vinta'`, `'Chiusa Persa'` (cercare `'Chiusa vinta'`, `'Chiusa persa'` e sostituire).
- [ ] **Tipi**: il file `src/types/index.ts` contiene già l’interfaccia `Database` e i tipi allineati ai 4 stati; verificare che non ci siano altre tabelle usate nel codice ma non dichiarate in `Database` (opzionale, per type-safety completa).
- [ ] Build: `npm run build` e `npm run typecheck` senza errori.
- [ ] Test E2E: login (admin, company, installer), pipeline lead, creazione azienda, ricezione lead (se possibile), upload preventivo/foto.

---

## 4. Cosa non toccare (per non rompere le logiche)

- **Ordine delle migrazioni**: non invertire o saltare migrazioni; gli stati pipeline e le colonne (es. `quote_pdf_url`, `wallbox_serial`) dipendono dalla sequenza.
- **Nomi stati pipeline**: solo `'Nuova' | 'In lavorazione' | 'Chiusa Vinta' | 'Chiusa Persa'` (mai minuscolo “vinta/persa” nelle nuove query).
- **RLS**: non disabilitare RLS sulle tabelle pubbliche; non aggiungere policy che danno accesso più ampio di quello previsto (admin = tutto, installer/company = solo propri dati).
- **Auth**: ruoli solo in `app_metadata.role` (o come già usato nel codice); non cambiare il modo in cui `AuthContext` legge il ruolo.
- **Relazioni company**: `installers.company_id`, `lead_assignments.assigned_to_company_id`, `company_rewards`, assegnazioni interne: non modificare la struttura senza adattare codice e RLS.
- **Edge Functions**: mantenere nomi e firme degli endpoint usati dal frontend (es. `create-company`, `receive-lead`); eventuali nuovi parametri solo in modo retrocompatibile.

---

## 5. Checklist riepilogativa

- [ ] Scenario scelto (A = dati da Bolt, B = solo backup SQL).
- [ ] Progetto Supabase creato e credenziali annotate.
- [ ] Schema applicato (tutte le migrazioni in ordine).
- [ ] Utenti creati in Auth con ruoli corretti.
- [ ] Dati importati e `user_id` in installers collegati ad Auth.
- [ ] Bucket storage creati e policy RLS applicate.
- [ ] Edge Functions deployate e testate.
- [ ] `.env` aggiornato con URL e anon key.
- [ ] Query stato lead uniformate a `'Chiusa Vinta'` / `'Chiusa Persa'`.
- [ ] Build e typecheck ok; test manuali/E2E essenziali superati.

---

## 6. File e riferimenti utili

| Cosa | Dove |
|------|------|
| Schema DB | `supabase/migrations/*.sql` |
| Dati di esempio / seed | `data_backup_complete.sql` |
| Schema completo (backup) | `database_backup_complete.sql` |
| Client Supabase | `src/lib/supabase.ts` |
| Tipi e stati pipeline | `src/types/index.ts` |
| Auth e ruolo | `src/contexts/AuthContext.tsx` |
| Istruzioni ripristino | `BACKUP_README.md` |
| Credenziali test | `TEST_CREDENTIALS.md` |

---

**Prossimo passo consigliato**: confermare se i dati da migrare sono **solo** quelli nei file SQL (Scenario B) o se serve **export da Bolt** (Scenario A). In base a quello si può dettagliare lo script di trasformazione (Scenario A) oppure procedere direttamente con Fase 2–6 (Scenario B).
