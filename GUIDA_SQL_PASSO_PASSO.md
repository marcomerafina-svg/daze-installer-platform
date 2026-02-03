# Guida passo-passo con i file SQL di backup

Usi **solo** i due file SQL del progetto:
- **`database_backup_complete.sql`** → schema completo + alcuni dati (area_managers, installation_companies)
- **`data_backup_complete.sql`** → dati essenziali (products, rewards_tiers, area_managers, installation_companies, company_rewards, points_transactions)

Segui i passi **nell’ordine**. Non saltare passi.

---

## Prima di iniziare

- Hai già **creato il progetto Supabase** su [supabase.com](https://supabase.com) (New project → nome, password DB, region).
- Hai salvato **Project URL** e **anon public** (Project Settings → API).
- Hai il progetto aperto in **Supabase Dashboard**.

---

## PASSO 1 – Esegui lo schema e i dati base (un solo file)

1. Apri **SQL Editor** nella Dashboard Supabase (menu a sinistra).
2. Clicca **New query**.
3. Apri il file **`database_backup_complete.sql`** dal tuo progetto (cartella `project/`).
4. Copia **tutto** il contenuto del file (Ctrl+A, Ctrl+C).
5. Incolla nel SQL Editor di Supabase (Ctrl+V).
6. Clicca **Run** (o Ctrl+Enter).

**Cosa fa questo file**
- Crea tutte le tabelle, gli indici, le policy RLS, i trigger e le funzioni (schema completo).
- Alla fine inserisce **area_managers** e **installation_companies** (con `ON CONFLICT DO NOTHING`).

**Se compare un errore**
- **"relation already exists"** → il progetto non era vuoto; puoi creare un nuovo progetto Supabase pulito e riprovare.
- **"function ... does not exist"** o **"syntax error"** → copia il messaggio di errore e la riga indicata; a volte Supabase usa una sintassi leggermente diversa (es. `EXECUTE FUNCTION` vs `EXECUTE PROCEDURE`). Se vedi `EXECUTE PROCEDURE`, prova a sostituire con `EXECUTE FUNCTION` nel file e rieseguire.
- Se l’editor ha **limite di caratteri**: esegui il file in **due parti**. Taglia dopo circa metà (cerca un punto sensato, es. fine di una migrazione) → esegui la prima parte → poi la seconda.

Al termine del Passo 1 avrai **tutto lo schema** e i dati di area_managers e installation_companies.

---

## PASSO 2 – Crea gli utenti (Auth)

I dati in **`data_backup_complete.sql`** non creano utenti: gli utenti vanno creati in **Supabase Auth** e poi collegati alla tabella `installers`.

1. In Supabase Dashboard vai in **Authentication** → **Users**.
2. Clicca **Add user** → **Create new user**.
3. Crea almeno un utente **admin**:
   - **Email**: es. `admin@daze.eu`
   - **Password**: scegli una password e salvala.
   - Clicca **Create user**.
4. Assegna il **ruolo** all’utente:
   - Apri l’utente appena creato.
   - Cerca **User Metadata** o **Raw User Meta Data** o **App Metadata**.
   - Aggiungi (o modifica) in modo che ci sia il ruolo, ad esempio:  
     `"role": "admin"`  
   - In molti progetti il ruolo va in **App Metadata** (Dashboard → Authentication → Users → [utente] → Edit). Se vedi **Raw User Meta Data**, puoi mettere: `{ "role": "admin" }`.
5. **Annota l’User UID** (l’UUID lungo) dell’utente: ti serve per il passo successivo.

Ripeti per ogni altro utente che ti serve (installatori, company owner): stesso flusso, con `"role": "installer"` o `"role": "company_owner"` o `"role": "company_admin"`. Per ognuno annota **email** e **User UID**.

---

## PASSO 3 – Collega gli installatori agli utenti Auth (se hai già dati installatori)

La tabella **`installers`** ha la colonna **`user_id`** che deve puntare a **`auth.users.id`**.  
Il file **`data_backup_complete.sql`** **non** contiene INSERT per `installers` (e nemmeno per `leads`): sono dati che andrebbero esportati da Bolt separatamente o creati a mano.

- Se **non** hai ancora righe in `installers`: puoi saltare questo passo e aggiungere gli installatori dopo (da app o da SQL).
- Se **hai** già eseguito o eseguirai degli INSERT in `installers` (da un altro script o da Table Editor) con `user_id` vuoto o sbagliato:
  1. Vai in **SQL Editor**.
  2. Per ogni installatore, esegui (sostituisci email e User UID):
     ```sql
     UPDATE installers
     SET user_id = '<User UID dell''utente Auth>'
     WHERE email = '<email dell''installatore>';
     ```

Così ogni riga in `installers` è collegata all’utente corretto in Auth.

---

## PASSO 4 – Esegui il file dei dati

1. Apri **SQL Editor** → **New query**.
2. Apri il file **`data_backup_complete.sql`** dal progetto.
3. Copia **tutto** il contenuto.
4. Incolla nel SQL Editor e clicca **Run**.

**Cosa fa questo file**
- Inserisce: **products**, **rewards_tiers**, **area_managers**, **installation_companies**, **company_rewards**, **points_transactions** (tutti con `ON CONFLICT DO NOTHING` dove applicabile).

**Se compare un errore su `points_transactions`**
- Gli INSERT in **points_transactions** referenziano **installer_id** e **lead_id**. Se quelle righe non esistono ancora (non hai inserito installers/leads), l’INSERT fallisce per foreign key.
- **Soluzione**: apri **`data_backup_complete.sql`**, trova la sezione **POINTS TRANSACTIONS** (le righe con `INSERT INTO points_transactions ...`) e **commentale** temporaneamente (aggiungi `--` all’inizio di ogni riga) oppure eliminale. Poi riesegui il file. Potrai inserire le points_transactions più avanti, quando avrai installers e leads.

Dopo il Passo 4 avrai products, rewards_tiers, area_managers, installation_companies, company_rewards e (se non le hai commentate) points_transactions.

---

## PASSO 5 – Bucket Storage

1. In Supabase vai in **Storage**.
2. **New bucket** → nome: **`lead-quotes`** → Public se serve per i PDF → Crea.
3. **New bucket** → nome: **`installation-photos`** → Crea.

Le policy RLS per questi bucket sono già definite nello schema in **`database_backup_complete.sql`** (se le migrazioni le includono). Se dopo i test vedi errori di permesso su Storage, controlla in Storage → bucket → Policies.

---

## PASSO 6 – Edge Functions

Da terminale, nella cartella del progetto (dove c’è `supabase/functions/`):

1. Installa e accedi a Supabase CLI se non l’hai fatto:  
   `supabase login`  
   `supabase link --project-ref <ref>` (il ref è nell’URL del progetto).
2. Deploy di ogni function:
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

Configura eventuali **secrets** (API key, ecc.) in Dashboard → Edge Functions → [nome function] → Settings.

---

## PASSO 7 – File `.env` nel progetto

Nella cartella del progetto (dove c’è `package.json`):

1. Crea o modifica il file **`.env`**.
2. Inserisci (con i valori del **tuo** progetto Supabase):

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Salva. L’app userà questi valori per connettersi al nuovo Supabase.

---

## PASSO 8 – Verifica e test

1. **Build**: nella cartella progetto:
   - `npm install`
   - `npm run build`
   - `npm run typecheck`
2. **Avvio**: `npm run dev` → apri l’app nel browser.
3. **Login**: accedi con l’utente creato al Passo 2 (es. admin). Verifica che la dashboard carichi e che i permessi siano corretti (admin vede tutto; installatore/company solo i propri dati quando avrai aggiunto installers/leads).

---

## Riepilogo ordine (con i due file SQL)

| # | Azione |
|---|--------|
| 1 | Eseguire **`database_backup_complete.sql`** nel SQL Editor (schema + area_managers + installation_companies). |
| 2 | Creare utenti in **Authentication** e impostare **ruolo**; annotare **User UID**. |
| 3 | (Opzionale) Collegare le righe in **installers** agli User UID con **UPDATE** (se hai già dati installatori). |
| 4 | Eseguire **`data_backup_complete.sql`** nel SQL Editor (products, rewards_tiers, area_managers, installation_companies, company_rewards, points_transactions; se points_transactions dà errore FK, commentare quella sezione). |
| 5 | Creare bucket **lead-quotes** e **installation-photos** in Storage. |
| 6 | Deploy di tutte le **Edge Functions**. |
| 7 | Scrivere **`.env`** con **VITE_SUPABASE_URL** e **VITE_SUPABASE_ANON_KEY**. |
| 8 | **npm install**, **npm run build**, **npm run typecheck**, **npm run dev** e test di login. |

In questo modo usi solo **`database_backup_complete.sql`** e **`data_backup_complete.sql`** e segui un unico flusso passo-passo senza rompere le logiche (schema, RLS, ruoli, pipeline a 4 stati).
