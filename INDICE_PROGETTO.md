# Indice del Progetto – Piattaforma Daze Lead Management

**Progetto**: Backup completo Daze – 30 gennaio 2026  
**URL produzione**: https://installer.daze.eu  
**Scopo**: Gestione e distribuzione lead agli installatori partner Daze (stazioni di ricarica EV).

---

## 1. Panoramica

| Aspetto | Dettaglio |
|--------|-----------|
| **Tipo** | Web app SPA (Single Page Application) |
| **Frontend** | React 18, TypeScript, Vite 5 |
| **Styling** | Tailwind CSS |
| **Routing** | React Router v7 |
| **Backend/DB** | Supabase (PostgreSQL, Auth, Edge Functions) |
| **Deploy** | Vercel (vercel.json) |

---

## 2. Struttura directory

```
project/
├── public/                 # Asset statici e PWA
│   ├── manifest.json
│   └── sw.js               # Service Worker
├── src/
│   ├── assets/             # Immagini e logo
│   ├── components/         # Componenti UI
│   │   ├── admin/
│   │   ├── company/
│   │   ├── installer/
│   │   └── shared/
│   ├── contexts/           # React Context (Auth)
│   ├── hooks/              # Custom hooks (push notifications)
│   ├── lib/                # Supabase, parser, helper
│   ├── pages/              # Pagine per ruolo
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── company/
│   │   └── installer/
│   └── types/              # Tipi TypeScript
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   └── migrations/         # Migrazioni SQL
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig*.json
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
└── vercel.json
```

---

## 3. File di configurazione

| File | Ruolo |
|------|--------|
| `package.json` | Dipendenze e script (dev, build, lint, typecheck) |
| `vite.config.ts` | Build Vite e alias |
| `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` | TypeScript |
| `tailwind.config.js` | Tailwind CSS |
| `postcss.config.js` | PostCSS (Tailwind) |
| `eslint.config.js` | ESLint |
| `vercel.json` | Deploy Vercel |
| `.env` | Variabili ambiente (Supabase URL/Key) |
| `.gitignore` | File ignorati da Git |

---

## 4. Frontend – `src/`

### 4.1 Entry e app

| File | Descrizione |
|------|-------------|
| `main.tsx` | Entry point React |
| `App.tsx` | Router e layout principale |
| `index.css` | Stili globali e Tailwind |
| `vite-env.d.ts` | Tipi ambiente Vite |

### 4.2 Contesti e hook

| File | Descrizione |
|------|-------------|
| `contexts/AuthContext.tsx` | Autenticazione e stato utente |
| `hooks/usePushNotifications.ts` | Hook per notifiche push |

### 4.3 Librerie – `src/lib/`

| File | Descrizione |
|------|-------------|
| `supabase.ts` | Client Supabase |
| `supabase-helpers.ts` | Helper query/RLS |
| `db-types-workaround.ts` | Workaround tipi DB |
| `serialParser.ts` | Parsing seriali wallbox |
| `pushNotifications.ts` | Logica notifiche push |

### 4.4 Tipi – `src/types/`

| File | Descrizione |
|------|-------------|
| `index.ts` | Tipi condivisi (lead, installatore, company, ecc.) |

### 4.5 Componenti – `src/components/`

**Admin** (`components/admin/`)

| File | Descrizione |
|------|-------------|
| `AdminLayout.tsx` | Layout area admin |
| `CreateCompanyModal.tsx` | Modale creazione azienda |

**Company** (`components/company/`)

| File | Descrizione |
|------|-------------|
| `CompanyLayout.tsx` | Layout area company |
| `AddTeamMemberModal.tsx` | Aggiunta membro team |
| `CompanyOnboardingModal.tsx` | Onboarding azienda |
| `OnboardingChecklist.tsx` | Checklist onboarding |

**Installer** (`components/installer/`)

| File | Descrizione |
|------|-------------|
| `InstallerLayout.tsx` | Layout area installatore |
| `NotificationsDropdown.tsx` | Dropdown notifiche |
| `PushNotificationBanner.tsx` | Banner abilitazione push |
| `PushNotificationSettings.tsx` | Impostazioni push |
| `RegisterInstallationModal.tsx` | Registrazione installazione |
| `WallboxSerialModal.tsx` | Inserimento seriale wallbox |

**Shared** (`components/shared/`)

| File | Descrizione |
|------|-------------|
| `DazeLogo.tsx` | Logo Daze |
| `ProtectedRoute.tsx` | Route protetta per ruolo |
| `TierBadge.tsx` | Badge tier rewards |
| `TierCard.tsx` | Card tier rewards |

### 4.6 Pagine – `src/pages/`

**Auth** (`pages/auth/`)

| File | Descrizione |
|------|-------------|
| `Login.tsx` | Login |

**Admin** (`pages/admin/`)

| File | Descrizione |
|------|-------------|
| `AdminDashboard.tsx` | Dashboard admin |
| `AdminLeads.tsx` | Elenco lead admin |
| `AreaManagers.tsx` | Gestione area managers |
| `Companies.tsx` | Gestione aziende |
| `Installers.tsx` | Gestione installatori |
| `PendingInstallations.tsx` | Installazioni in attesa |
| `Rewards.tsx` | Rewards admin |

**Company** (`pages/company/`)

| File | Descrizione |
|------|-------------|
| `CompanyDashboard.tsx` | Dashboard azienda |
| `CompanyLeads.tsx` | Lead azienda |
| `CompanyRewards.tsx` | Rewards azienda |
| `TeamManagement.tsx` | Gestione team |

**Installer** (`pages/installer/`)

| File | Descrizione |
|------|-------------|
| `InstallerDashboard.tsx` | Dashboard installatore |
| `Pipeline.tsx` | Pipeline lead (6 stati) |
| `LeadDetail.tsx` | Dettaglio lead |
| `Installations.tsx` | Installazioni |
| `Rewards.tsx` | Rewards installatore |
| `Contact.tsx` | Contatti |

---

## 5. Supabase Edge Functions – `supabase/functions/`

| Function | Descrizione |
|----------|-------------|
| `receive-lead` | Ricezione lead da Zapier/Zoho CRM |
| `send-lead-notification` | Notifica nuova lead |
| `send-lead-confirmation-notification` | Notifica conferma lead |
| `send-lead-closure-notification` | Notifica chiusura lead |
| `send-push-notification` | Invio notifica push |
| `create-company` | Creazione azienda |
| `create-test-installer` | Creazione installatore di test |
| `delete-user` | Eliminazione utente |
| `reset-owner-password` | Reset password owner |
| `update-user-password` | Aggiornamento password utente |

---

## 6. Migrazioni database – `supabase/migrations/`

Migrazioni in ordine cronologico (prefisso data):

| Migrazione | Contenuto sintetico |
|------------|---------------------|
| `20251029144241` | Schema iniziale (installers, leads, lead_assignments, ecc.) |
| `20251029154644` | Stati pipeline + quote serial |
| `20251029165937` | Area managers e aggiornamento installers |
| `20251030*` | Notifiche automatiche lead |
| `20251030144501` / `20251030144857` | Lead confirmation tracking |
| `20251030151337` | Fix auth trigger conferma |
| `20251031102357` | Tabelle products e serials |
| `20251031102427` | Seed products |
| `20251031102925` | Migrazione seriali a nuova tabella |
| `20251031110214` | Sistema rewards |
| `20251031120109` / `20251031120247` | Punti prodotti e ricalcolo retroattivo |
| `20251103124910` | Tabella push_subscriptions |
| `20251103125416` / `20251103132410` | Push in trigger e fix auth |
| `20251202154710` | Self-reported installations |
| `20251202154730` | Storage foto installazioni |
| `20251202160752` | Tabella installation_companies |
| `20251202160839` / `20251202160856` | Campi company su installers e RLS |
| `20251202160946` / `20251202161015` | Rewards e lead per company |
| `20251202161046` | Storico assegnazioni interne lead |
| `20251202161216` | Calcolo punti per company |
| `20251202170806` – `20251202171302` | Fix RLS companies/installers |
| `20251202171733` | Onboarding tracking companies |
| `20251202155425` | Rewards per approval status |
| `20260128140003` | Policy visibilità membri company |

---

## 7. Documentazione e utility

| File | Contenuto |
|------|-----------|
| `README.md` | Documentazione principale progetto |
| `SETUP.md` | Setup iniziale (admin, installatori, DB) |
| `BACKUP_README.md` | Istruzioni backup |
| `BACKUP_SUMMARY.txt` | Riepilogo backup |
| `ISTRUZIONI_BACKUP.txt` | Istruzioni backup (testo) |
| `NOTIFICATION_SYSTEM.md` | Sistema notifiche |
| `ZAPIER_INTEGRATION.md` | Integrazione Zapier |
| `CREATE_TEST_USERS.md` | Creazione utenti di test |
| `TEST_CREDENTIALS.md` | Credenziali di test |
| `generate_data_backup.py` | Script Python per backup dati |
| `create-installer.html` | Pagina/utility creazione installatore |
| `data_backup_complete.sql` | Backup dati |
| `database_backup_complete.sql` | Backup completo DB |

---

## 8. Pipeline lead (stati)

1. **Nuova** – Lead appena assegnata  
2. **Contattato** – Cliente contattato  
3. **Sopralluogo fissato** – Appuntamento fissato  
4. **Preventivo inviato** – Preventivo inviato  
5. **Chiusa vinta** – Vendita conclusa  
6. **Chiusa persa** – Lead non convertita  

---

## 9. Ruoli e aree

| Ruolo | Area | Descrizione |
|-------|------|-------------|
| **Admin** | `/admin/*` | Dashboard, installatori, aziende, lead, rewards, area managers |
| **Company (owner)** | `/company/*` | Dashboard, lead, rewards, team |
| **Installer** | `/installer/*` | Dashboard, pipeline, dettaglio lead, installazioni, rewards |

---

## 10. Comandi utili

```bash
npm install          # Installa dipendenze
npm run dev          # Avvio sviluppo
npm run build        # Build produzione
npm run lint         # Lint
npm run typecheck    # Controllo tipi TypeScript
npm run preview      # Anteprima build
```

---

*Indice generato per il backup completo Daze – 30 gennaio 2026.*
