# Fix da applicare su Supabase (per chi ha accesso)

Se non hai accesso all’account Supabase, **invia questo file e le istruzioni sotto** a chi lo gestisce (es. Marco).

---

## Problema

Quando un installatore carica un **PDF preventivo** nella pagina **Dettaglio lead** su installer.daze.eu, compare:

**"Errore storage: new row violates row-level security policy"**

La policy RLS sul bucket `lead-quotes` era troppo restrittiva (solo assegnazione diretta all’installatore). Per lead assegnate alla company l’upload veniva bloccato.

---

## Cosa fare (chi ha accesso a Supabase)

1. Apri **Supabase** → progetto usato da installer.daze.eu  
2. Vai in **SQL Editor**  
3. Apri il file **`APPLICARE_SUPABASE_fix_upload_pdf.sql`** (nella root del repo)  
4. **Copia tutto** il contenuto e incollalo nell’editor  
5. Clicca **Run**  

Nessun dato viene cancellato: si aggiornano solo le policy di sicurezza sullo storage. Dopo l’esecuzione l’upload dei PDF preventivi torna a funzionare.

---

## 2. Fix aggiornamento stato lead (Chiusa Vinta)

**Problema:** L'installatore seleziona "Chiusa Vinta" ma la lead rimane "In lavorazione" anche per l'admin.

**File:** **`APPLICARE_SUPABASE_fix_leads_update.sql`** – SQL Editor → incolla tutto → Run.

---

## File da usare

- **`APPLICARE_SUPABASE_fix_upload_pdf.sql`** – RLS storage bucket lead-quotes
- **`APPLICARE_SUPABASE_fix_leads_update.sql`** – RLS tabella leads (UPDATE)

Eseguire entrambi in SQL Editor. Le stesse modifiche sono in **`supabase/migrations/`** per chi usa le migrazioni da CLI.
