# Dove eravamo rimasti – Riepilogo sessione e prossimi passi

**Progetto:** Piattaforma Daze Lead Management (installatori daze)  
**Repo:** marcomerafina-svg/daze-installer-platform  
**Deploy:** Vercel → installer.daze.eu  
**Database:** Supabase (database copiato da Bolt, ora scollegato da Bolt)

---

## 1. Cosa abbiamo fatto

### Indicizzazione e documentazione
- **INDICE_PROGETTO.md** – Indice della struttura del progetto
- **RECAP_PROGETTO.md** – Recap completo: cos’è, come è costruito, stack, route, DB, funzioni
- **GITHUB_REPO.md** – Come creare/collegare la repo GitHub
- **DEPLOY_WORKFLOW.md** – Modifiche → push → deploy automatico Vercel
- **PUSH_REPO.md** – Comandi per push su marcomerafina-svg/daze-installer-platform

### Avvio in locale
- **package.json**: script `dev`, `build`, `preview` usano `node node_modules/vite/bin/vite.js` (perché `vite` non era nel PATH). Comando: `npm run dev`.

### Sidebar fissa
- **AdminLayout**, **InstallerLayout**, **CompanyLayout**: sidebar sempre `fixed`, main con `lg:ml-72` o `lg:mr-72`. Solo il contenuto centrale scrolla.

### Lead di test
- **invia-lead-test.ps1**: invia una lead di test a mattia.valentino@daze.eu. Eseguire con:  
  `powershell -ExecutionPolicy Bypass -File ".\invia-lead-test.ps1"`

### Fix RLS – Upload PDF preventivi
- **Problema:** "Errore storage: new row violates row-level security policy" quando l’installatore carica un PDF preventivo nel Dettaglio lead.
- **Causa:** Policy sul bucket `lead-quotes` consentiva solo assegnazione diretta (`installer_id`), non lead assegnate alla company.
- **File:**  
  - `supabase/migrations/20260130120000_fix_lead_quotes_storage_rls.sql`  
  - `APPLICARE_SUPABASE_fix_upload_pdf.sql` (da eseguire su Supabase – SQL Editor)

### Fix RLS – Aggiornamento stato lead (Chiusa Vinta)
- **Problema:** L’installatore seleziona "Chiusa Vinta" ma la lead rimane "In lavorazione" anche per l’admin.
- **Causa:** Policy UPDATE su `leads` consentiva solo `lead_assignments.installer_id` = utente; per lead assegnate alla company l’update veniva bloccato.
- **File:**  
  - `supabase/migrations/20260130130000_fix_leads_update_policy_for_company.sql`  
  - `APPLICARE_SUPABASE_fix_leads_update.sql` (da eseguire su Supabase – SQL Editor)
- **Frontend:** Pipeline e LeadDetail controllano il risultato dell’update (`.select('id')`) e mostrano messaggio se 0 righe. Pipeline carica anche lead con `assigned_to_company_id = installer.company_id`.

### Istruzioni per Supabase (chi ha accesso)
- **ISTRUZIONI_FIX_SUPABASE.md** – Istruzioni per applicare i due fix su Supabase (upload PDF + update lead).
- **APPLICARE_SUPABASE_fix_upload_pdf.sql** e **APPLICARE_SUPABASE_fix_leads_update.sql** – Script da eseguire in SQL Editor.

### Se il progetto usava Bolt Database
- **ISTRUZIONI_FIX_BOLT_DATABASE.md** – Come applicare le stesse fix da Bolt (Database → Tables/Security, "ask Bolt for help"). Contiene i testi esatti da incollare nella chat di Bolt.new per i due fix.

### Collegare il progetto al nuovo Supabase (DB copiato da Bolt)
- **COLLEGARE_SUPABASE.md** – Passi per collegare questo progetto al Supabase dove hai copiato il database da Bolt:  
  - Prendere Project URL e anon key da Supabase (Settings → API)  
  - Impostare `.env` locale (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)  
  - Impostare variabili su Vercel e fare Redeploy  
  - Verificare tabelle, auth, storage `lead-quotes`, Edge Functions, policy RLS; applicare gli script APPLICARE_SUPABASE_*.sql se servono  

---

## 2. Cosa resta da fare (checklist)

### Su Supabase (Marco o chi ha accesso)
- [ ] Eseguire **APPLICARE_SUPABASE_fix_upload_pdf.sql** in SQL Editor (fix upload PDF).
- [ ] Eseguire **APPLICARE_SUPABASE_fix_leads_update.sql** in SQL Editor (fix stato Chiusa Vinta).
- [ ] Se il progetto usa il nuovo Supabase (DB copiato da Bolt): verificare schema, auth, bucket `lead-quotes`, Edge Functions; applicare gli script sopra se non già applicati.

### Collegamento al nuovo Supabase (se DB copiato da Bolt)
- [ ] Prendere **Project URL** e **anon key** dal progetto Supabase (Settings → API).
- [ ] Aggiornare **`.env`** locale con `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- [ ] Aggiornare **Environment Variables** su Vercel con gli stessi valori e fare **Redeploy**.

### Produzione (installer.daze.eu)
- [ ] Se la pagina era bianca: verificare che su Vercel ci siano `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Production e, se serve, Preview) e aver fatto Redeploy.

### Opzionale
- [ ] Configurare Git `user.name` e `user.email` se non già fatto (per commit da terminale).
- [ ] Se usi Bolt Database invece di Supabase: usare **ISTRUZIONI_FIX_BOLT_DATABASE.md** e i testi per la chat di Bolt.new.

---

## 3. File importanti nel repo

| File | Scopo |
|------|--------|
| **COLLEGARE_SUPABASE.md** | Collegare questo progetto al Supabase (DB copiato da Bolt) |
| **ISTRUZIONI_FIX_SUPABASE.md** | Istruzioni per applicare fix RLS su Supabase |
| **ISTRUZIONI_FIX_BOLT_DATABASE.md** | Istruzioni + testi chat per fix su Bolt Database |
| **APPLICARE_SUPABASE_fix_upload_pdf.sql** | Script SQL – fix upload PDF (storage lead-quotes) |
| **APPLICARE_SUPABASE_fix_leads_update.sql** | Script SQL – fix update stato lead |
| **DOVE_ERAVAMO_RIMASTI.md** | Questo file – riepilogo e checklist |
| **invia-lead-test.ps1** | Invio lead di test a mattia.valentino@daze.eu |
| **supabase/migrations/20260130120000_*.sql** | Migrazione fix storage RLS |
| **supabase/migrations/20260130130000_*.sql** | Migrazione fix leads UPDATE policy |

---

## 4. Comandi utili

```bash
# Avvio in locale
npm run dev

# Invio lead di test (PowerShell)
powershell -ExecutionPolicy Bypass -File ".\invia-lead-test.ps1"

# Push su GitHub (dopo modifiche)
git add .
git commit -m "Descrizione modifiche"
git push
```

---

*Ultimo aggiornamento: sessione in cui abbiamo indicizzato il progetto, sistemato sidebar, fix RLS (upload PDF + stato lead), script e istruzioni per Supabase/Bolt, e guida per collegare il progetto al nuovo Supabase.*
