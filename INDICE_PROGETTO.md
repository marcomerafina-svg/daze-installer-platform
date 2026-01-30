# Indice del Progetto – Piattaforma Daze Lead Management

**URL produzione:** https://installer.daze.eu  
**Data indicizzazione:** 30 gennaio 2026

---

## 1. Panoramica

Piattaforma web per la gestione e distribuzione delle lead agli installatori partner di **Daze** (stazioni di ricarica per auto elettriche). Tre aree principali: **Admin**, **Installatore**, **Azienda (Company)**.

### Stack tecnologico
| Livello | Tecnologia |
|--------|------------|
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS, PostCSS |
| Routing | React Router v7 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Backend | Supabase Edge Functions (Deno) |
| UI | Lucide React, @hello-pangea/dnd (drag & drop) |
| Deploy | Vercel (`vercel.json`) |

---

## 2. Struttura directory

```
installatori daze/
├── .bolt/                    # Config Bolt
├── public/                   # Asset statici
│   ├── manifest.json
│   └── sw.js                 # Service Worker (PWA/notifiche)
├── src/
│   ├── App.tsx               # Router e route protette
│   ├── main.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   ├── assets/               # Immagini, logo
│   ├── components/
│   │   ├── admin/            # AdminLayout, CreateCompanyModal
│   │   ├── company/          # CompanyLayout, Onboarding, Team
│   │   ├── installer/        # Layout, notifiche, modali wallbox/serial
│   │   └── shared/           # DazeLogo, ProtectedRoute, TierBadge/Card
│   ├── contexts/
│   │   └── AuthContext.tsx   # Stato auth e ruolo
│   ├── hooks/
│   │   └── usePushNotifications.ts
│   ├── lib/                  # supabase, helpers, serialParser, pushNotifications
│   ├── pages/
│   │   ├── admin/            # Dashboard, Leads, Installers, Companies, Rewards, ecc.
│   │   ├── auth/             # Login
│   │   ├── company/          # Dashboard, Team, Leads, Rewards
│   │   └── installer/        # Dashboard, Pipeline, LeadDetail, Installations, Rewards, Contact
│   └── types/
│       └── index.ts          # Tipi TypeScript e interfacce DB
├── supabase/
│   ├── functions/            # Edge Functions (Deno)
│   └── migrations/           # Migrazioni SQL
├── create-installer.html     # Tool creazione installatori
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig*.json
├── eslint.config.js
├── vercel.json
└── [documentazione: README, SETUP, ZAPIER, NOTIFICATION_SYSTEM, ecc.]
```

---

## 3. Routing e ruoli

### Ruoli (`UserRole`)
- `admin` – accesso completo
- `installer` – installatore (può anche accedere all’area company se associato)
- `company_owner` | `company_admin` – gestione azienda

### Route pubbliche
| Path | Componente | Note |
|------|------------|------|
| `/login` | `Login` | Unica route non protetta |
| `/` | Redirect → `/login` |
| `*` | Redirect → `/login` |

### Route Admin (solo `admin`)
| Path | Componente |
|------|------------|
| `/admin` | AdminDashboard |
| `/admin/area-managers` | AreaManagers |
| `/admin/installers` | Installers |
| `/admin/companies` | Companies |
| `/admin/leads` | AdminLeads |
| `/admin/rewards` | AdminRewards |
| `/admin/pending-installations` | PendingInstallations |

### Route Installatore (ruolo `installer`)
| Path | Componente |
|------|------------|
| `/installer` | InstallerDashboard |
| `/installer/pipeline` | Pipeline |
| `/installer/installations` | Installations |
| `/installer/rewards` | InstallerRewards (InstallerRewards) |
| `/installer/leads/:id` | LeadDetail |
| `/installer/contact` | Contact |

### Route Company (ruolo `installer`, visibilità company)
| Path | Componente |
|------|------------|
| `/company` | CompanyDashboard |
| `/company/team` | TeamManagement |
| `/company/leads` | CompanyLeads |
| `/company/rewards` | CompanyRewards |

---

## 4. Componenti principali

### Shared
- **ProtectedRoute** – Controllo ruoli e redirect
- **DazeLogo** – Logo Daze
- **TierBadge** / **TierCard** – Badge e card livelli rewards

### Admin
- **AdminLayout** – Layout area admin
- **CreateCompanyModal** – Creazione azienda

### Company
- **CompanyLayout** – Layout area azienda
- **CompanyOnboardingModal** – Onboarding azienda
- **OnboardingChecklist** – Checklist onboarding
- **AddTeamMemberModal** – Aggiunta membro team

### Installer
- **InstallerLayout** – Layout area installatore
- **NotificationsDropdown** – Dropdown notifiche
- **PushNotificationBanner** – Banner richiesta permesso push
- **PushNotificationSettings** – Impostazioni push
- **RegisterInstallationModal** – Registrazione installazione
- **WallboxSerialModal** – Inserimento/gestione seriale wallbox

---

## 5. Contesti e hook

- **AuthContext** – Utente, ruolo, login/logout, stato di caricamento
- **usePushNotifications** – Gestione sottoscrizioni e notifiche push

---

## 6. Librerie e servizi (`src/lib`)

| File | Scopo |
|------|--------|
| `supabase.ts` | Client Supabase |
| `supabase-helpers.ts` | Helper query/auth |
| `db-types-workaround.ts` | Tipi DB/RLS |
| `serialParser.ts` | Parsing seriali wallbox |
| `pushNotifications.ts` | Utility notifiche push |

---

## 7. Tipi principali (`src/types/index.ts`)

- **Auth**: `UserRole`, `AuthUser`
- **Lead**: `Lead`, `LeadStatus`, `LeadAssignment`, `LeadStatusHistory`, `LeadNote`, `LeadInternalAssignment`
- **Installatori**: `Installer`, `InstallerWithStats`, `AreaManager`, `CompanyRole`
- **Aziende**: `InstallationCompany`, `CompanyWithStats`, `CompanyStats`, `InstallerContribution`
- **Prodotti/Seriali**: `Product`, `WallboxSerial`, `SerialParseResult`, `InstallationSourceType`, `ApprovalStatus`
- **Installazioni**: `Installation`, `InstallationStats`
- **Rewards**: `RewardsTier`, `InstallerRewards`, `CompanyRewards`, `PointsTransaction`, `LeaderboardEntry`
- **Notifiche**: `NotificationLog`
- **Database**: interfaccia `Database` per tipizzazione tabelle Supabase

---

## 8. Supabase Edge Functions

| Function | Scopo |
|----------|--------|
| `create-company` | Creazione azienda |
| `create-test-installer` | Creazione installatore di test |
| `delete-user` | Eliminazione utente |
| `receive-lead` | Ricezione lead (Zapier/integrazioni) |
| `reset-owner-password` | Reset password owner |
| `send-lead-notification` | Invio notifica nuova lead |
| `send-lead-confirmation-notification` | Notifica conferma lead |
| `send-lead-closure-notification` | Notifica chiusura lead |
| `send-push-notification` | Invio notifica push |
| `update-user-password` | Aggiornamento password |

---

## 9. Migrazioni database (supabase/migrations)

- Schema iniziale, pipeline e quote/serial
- Area managers e installatori
- Notifiche automatiche lead (trigger, fix auth)
- Conferma lead e tracking
- Prodotti e seriali wallbox
- Sistema rewards (tier, punti, transazioni)
- Push subscriptions e trigger notifiche
- Installazioni self-reported e foto
- Tabelle `installation_companies`, campi company su installatori
- RLS per companies, lead assignments, internal assignments
- Onboarding companies, policy visibilità membri

---

## 10. Documentazione presente

| File | Contenuto |
|------|-----------|
| README.md | Panoramica, stack, API, setup |
| SETUP.md | Primo setup, admin, installatori |
| ZAPIER_INTEGRATION.md | Integrazione Zapier per lead |
| NOTIFICATION_SYSTEM.md | Sistema notifiche |
| CREATE_TEST_USERS.md | Creazione utenti di test |
| TEST_CREDENTIALS.md | Credenziali di test |
| ISTRUZIONI_BACKUP.txt | Istruzioni backup |
| BACKUP_README.md / BACKUP_SUMMARY.txt | Backup e ripristino |

---

## 11. Script e configurazione

### npm
- `npm run dev` – sviluppo (Vite)
- `npm run build` – build produzione
- `npm run preview` – anteprima build
- `npm run lint` – ESLint
- `npm run typecheck` – TypeScript (tsconfig.app.json)

### Configurazione
- **Vite**: `vite.config.ts` (plugin React)
- **TypeScript**: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- **Tailwind**: `tailwind.config.js`, `postcss.config.js`
- **ESLint**: `eslint.config.js`
- **Vercel**: `vercel.json`

---

## 12. File di backup / dati (root)

- `backup-completo-daze-20260130.tar.gz`
- `database_backup_complete.sql`, `data_backup_complete.sql`
- `database-backup-only-20260130.tar.gz`
- `generate_data_backup.py` – script generazione backup dati

---

*Indice generato per orientamento rapido nel codebase e nelle funzionalità del progetto.*
