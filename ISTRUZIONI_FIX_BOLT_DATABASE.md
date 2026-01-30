# Fix da applicare su Bolt Database (se il progetto usa Bolt Database, non Supabase)

Se il progetto usa **Bolt Database** (Bolt Cloud), le policy RLS **non** si modificano da Supabase ma da **dentro Bolt**. Segui questi passi.

---

## Dove fare le modifiche in Bolt

1. Apri il **progetto su Bolt** (bolt.new o Bolt Cloud).
2. Clicca l’**icona Database** in alto al centro.
3. Vai in **Tables** (o **Security** / **Security Audit**, se presenti).
4. Per ogni tabella puoi **View policies** (vedere le policy RLS).  
   Per **modificare** le policy, la documentazione Bolt dice:  
   **“To make updates, ask Bolt for help or check the Security Audit tab for automatic fixes.”**

Quindi puoi:
- usare la **Security Audit** (se c’è) per correzioni automatiche, oppure
- **chiedere a Bolt** (chatbox / AI) di applicare le modifiche sotto.

---

## Cosa chiedere a Bolt (testo da incollare nella chat)

Puoi copiare e incollare questo testo nella chat di Bolt, così l’AI può applicare le due fix.

---

**Fix 1 – Upload PDF preventivi (storage bucket `lead-quotes`)**

Quando un installatore carica un PDF preventivo nella pagina Dettaglio lead compare:  
“Errore storage: new row violates row-level security policy”.

La policy di INSERT sul bucket storage `lead-quotes` deve permettere l’upload non solo quando `lead_assignments.installer_id` è l’installatore corrente, ma anche quando la lead è assegnata alla company dell’installatore (`lead_assignments.assigned_to_company_id = installers.company_id`).  
Quindi: consentire INSERT (e UPDATE) su `lead-quotes` se l’utente è un installatore con una `lead_assignment` per quella lead (path = `lead_id/file.pdf`) dove **o** `la.installer_id = installer.id` **o** `la.assigned_to_company_id = installer.company_id`.

---

**Fix 2 – Aggiornamento stato lead (tabella `leads`)**

Quando l’installatore seleziona “Chiusa Vinta” (o altro stato), la lead rimane “In lavorazione” anche per l’admin perché l’UPDATE non viene salvato.

La policy di UPDATE sulla tabella `leads` per gli installatori deve permettere l’update non solo quando la lead è assegnata direttamente a loro (`lead_assignments.installer_id = loro id`), ma anche quando la lead è assegnata alla loro company (`lead_assignments.assigned_to_company_id = loro company_id`).  
Quindi: consentire UPDATE su `leads` per gli installatori se esiste una `lead_assignment` per quella lead dove **o** `la.installer_id = i.id` **o** `la.assigned_to_company_id = i.company_id` (con `i` = installatore dell’utente corrente).

---

Dopo aver applicato queste due modifiche (tramite Security Audit o risposta di Bolt), l’upload PDF e il cambio stato (es. Chiusa Vinta) dovrebbero funzionare correttamente.

---

## Se invece usi Supabase

Se in produzione l’app si connette a **Supabase** (con `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nel .env), allora il backend è Supabase e le modifiche vanno fatte lì. In quel caso usa:

- **`ISTRUZIONI_FIX_SUPABASE.md`**
- **`APPLICARE_SUPABASE_fix_upload_pdf.sql`**
- **`APPLICARE_SUPABASE_fix_leads_update.sql`**

e eseguili su Supabase (SQL Editor), come descritto in quel file.
