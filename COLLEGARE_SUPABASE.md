# Collegare il progetto al Supabase (database copiato da Bolt)

Hai copiato il database da Bolt su un progetto Supabase e l’hai scollegato da Bolt. Per usare quel Supabase da **questo** progetto (senza rompere nulla) segui questi passi.

---

## 1. Prendi URL e chiave dal nuovo Supabase

1. Apri il **progetto Supabase** dove hai copiato il database (quello scollegato da Bolt).
2. Vai in **Settings** (icona ingranaggio) → **API**.
3. Copia e tieni da parte:
   - **Project URL** (es. `https://xxxxxxxx.supabase.co`)
   - **anon public** key (la chiave “anon”, non la service_role).

---

## 2. Collega in locale (questo progetto)

1. Nella cartella di questo progetto apri il file **`.env`** (se non c’è, crealo nella root).
2. Imposta (o sostituisci) queste due variabili con i valori del **nuovo** Supabase:

```env
VITE_SUPABASE_URL=https://TUO_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Sostituisci con il **Project URL** e la **anon key** copiati al passo 1.

3. Salva il file. **Non** committare `.env` (è già in `.gitignore`).
4. Riavvia il dev server se era aperto: `npm run dev`.

Da qui in poi l’app in locale userà il database sul nuovo Supabase. Nulla nel codice va toccato: usa già Supabase.

---

## 3. Produzione (installer.daze.eu su Vercel)

Se il sito è deployato su Vercel:

1. Vercel → progetto → **Settings** → **Environment Variables**.
2. Aggiorna (o aggiungi) per **Production** (e se vuoi anche Preview):
   - `VITE_SUPABASE_URL` = stesso **Project URL** del passo 1
   - `VITE_SUPABASE_ANON_KEY` = stessa **anon key** del passo 1
3. Fai **Redeploy** del progetto (Deployments → ⋮ → Redeploy), così il build usa le nuove variabili.

---

## 4. Cose da verificare sul nuovo Supabase

Per non “rompere tutto” controlla che sul **nuovo** progetto Supabase ci siano:

### Schema e dati
- Tabelle che l’app si aspetta: `leads`, `installers`, `lead_assignments`, `lead_status_history`, `lead_notes`, `installation_companies`, ecc. (se le hai migrate da Bolt, dovrebbero esserci già).

### Auth
- **Authentication** → utenti (admin, installatori) con gli stessi ruoli/metadata che usa l’app (`app_metadata.role` o `user_metadata.role`: admin, installer, company_owner, company_admin). Se hai migrato gli utenti, verifica che email e ruoli siano corretti.

### Storage (se usi upload PDF)
- **Storage** → bucket **`lead-quotes`** creato.
- Policy RLS sul bucket come da **`APPLICARE_SUPABASE_fix_upload_pdf.sql`** (se le policy non ci sono o danno errore, esegui quello script in SQL Editor).

### Edge Functions (se le usi)
- **Edge Functions** come `receive-lead`, `send-lead-notification`, `send-lead-confirmation-notification`, `send-lead-closure-notification`, `send-push-notification`, ecc.  
Se le avevi su Bolt/altro progetto, vanno **ridistribuite** su questo Supabase dalla cartella `supabase/functions/` (con Supabase CLI: `supabase link` a questo progetto → `supabase functions deploy`).  
Se per ora non le usi (es. non ricevi lead da Zapier), puoi collegare prima il DB e aggiungere le functions dopo.

### Policy RLS su `leads` (update stato)
- Policy “Installer can update assigned leads” che permetta l’update anche per lead assegnate alla company. Se l’update stato non funziona, esegui **`APPLICARE_SUPABASE_fix_leads_update.sql`** in SQL Editor.

---

## 5. Riepilogo

| Dove | Cosa fare |
|------|-----------|
| **Supabase** | Copiare **Project URL** e **anon key** (Settings → API). |
| **Locale** | Mettere in `.env`: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` con quei valori. |
| **Vercel** | Stessi valori in Environment Variables → Redeploy. |
| **Supabase** | Verificare tabelle, auth, storage `lead-quotes`, functions (se usate), policy RLS; applicare gli script `APPLICARE_SUPABASE_*.sql` se servono. |

Non serve cambiare codice: l’app è già configurata per Supabase. Cambi solo **dove** punta (URL + anon key) con `.env` in locale e con le variabili su Vercel in produzione.
