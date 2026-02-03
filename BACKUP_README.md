# BACKUP COMPLETO PROGETTO DAZE

**Data backup:** 30 Gennaio 2026

## Contenuto del Backup

Questo backup contiene:

1. **Codice sorgente completo** - Tutto il progetto React/Vite
2. **Schema database** - Tutte le migrazioni Supabase
3. **Dati database** - Snapshot completo di tutti i dati
4. **Configurazione** - File .env con credenziali Supabase

## Struttura File

```
project/                          - Codice sorgente completo
├── supabase/migrations/          - Tutte le migrazioni del database
├── src/                          - Codice React
├── .env                          - Variabili d'ambiente
└── ...

database_backup_complete.sql      - Schema completo (migrazioni concatenate)
data_backup_complete.sql          - Dati essenziali del database
BACKUP_README.md                  - Questo file
```

## Come Ripristinare

### 1. Ripristino Codice Sorgente

```bash
# Estrai l'archivio
tar -xzf project-export.tar.gz
cd project

# Installa le dipendenze
npm install

# Verifica che il file .env sia presente con le credenziali
cat .env
```

### 2. Ripristino Database

#### Opzione A: Usa il Progetto Supabase Esistente

Se vuoi continuare a usare lo stesso database Supabase:

```bash
# Non serve fare nulla - le credenziali nel .env puntano già al database corretto
# Tutti i dati sono già presenti
```

#### Opzione B: Crea un Nuovo Progetto Supabase

Se vuoi creare un nuovo database da zero:

1. **Crea un nuovo progetto su https://supabase.com**

2. **Applica tutte le migrazioni:**
   ```bash
   # Usa il CLI di Supabase o esegui le migrazioni tramite SQL Editor
   # Oppure usa il file database_backup_complete.sql
   ```

3. **Importa i dati:**
   ```bash
   # Esegui il file data_backup_complete.sql nel SQL Editor di Supabase
   ```

4. **Aggiorna il file .env** con le nuove credenziali:
   ```
   VITE_SUPABASE_URL=<nuovo-url>
   VITE_SUPABASE_ANON_KEY=<nuova-key>
   ```

### 3. Avvia il Progetto

```bash
npm run dev
```

Il progetto sarà disponibile su http://localhost:5173

## Note Importanti

### Utenti e Autenticazione

**ATTENZIONE:** Gli utenti sono gestiti da Supabase Auth e NON sono inclusi nel backup dati.

La tabella `installers` contiene i riferimenti agli utenti tramite `user_id`, ma gli account utente effettivi risiedono in `auth.users` (tabella di sistema Supabase).

Per ripristinare completamente gli utenti su un nuovo progetto:

1. Crea manualmente gli account utente in Supabase (Dashboard → Authentication)
2. Aggiorna i record nella tabella `installers` con i nuovi `user_id`

### Credenziali di Test

Consulta il file `TEST_CREDENTIALS.md` per le credenziali degli utenti di test.

### Database Supabase Attuale

Il progetto è attualmente configurato per usare:
- URL: Vedi file `.env`
- Region: Fornito da Supabase
- Progetto: Configurato e funzionante

## Tabelle Principali

### Schema Database

- `installers` - Installatori e membri delle aziende
- `installation_companies` - Aziende installatrici
- `leads` - Lead commerciali (25 record)
- `lead_assignments` - Assegnazioni lead a installatori (25 record)
- `lead_status_history` - Storico cambi stato lead (108 record)
- `lead_notes` - Note sulle lead (9 record)
- `wallbox_serials` - Seriali wallbox installate (8 record)
- `products` - Catalogo prodotti Dazebox (11 prodotti)
- `rewards_tiers` - Livelli del programma fedeltà (5 tier)
- `installer_rewards` - Punti reward installatori (6 record)
- `company_rewards` - Punti reward aziende (1 record)
- `points_transactions` - Storico transazioni punti (2 record)
- `push_subscriptions` - Sottoscrizioni notifiche push (4 record)
- `area_managers` - Manager area geografica (2 record)
- `notification_logs` - Log notifiche inviate (12 record)

## Edge Functions Supabase

Le seguenti Edge Functions sono deployate su Supabase:

1. `receive-lead` - Webhook per ricezione lead da Zapier/Zoho
2. `send-lead-notification` - Invio notifiche email nuove lead
3. `send-lead-confirmation-notification` - Notifica conferma contatto lead
4. `send-lead-closure-notification` - Notifica chiusura lead
5. `send-push-notification` - Invio notifiche push
6. `create-company` - Creazione nuova azienda installatrice
7. `create-test-installer` - Creazione installatori di test
8. `delete-user` - Eliminazione utente
9. `update-user-password` - Aggiornamento password utente
10. `reset-owner-password` - Reset password owner

Il codice di tutte le functions è nella directory `supabase/functions/`.

## Storage Buckets

Il progetto usa i seguenti bucket Supabase Storage:

- `installation-photos` - Foto delle installazioni auto-reportate
- `lead-quotes` - PDF dei preventivi

## Supporto

Per problemi o domande sul backup/ripristino:
- Controlla i log di Supabase per errori di database
- Verifica che tutte le variabili d'ambiente siano configurate
- Assicurati che tutte le migrazioni siano state applicate nell'ordine corretto

## Checklist Ripristino

- [ ] Codice sorgente estratto
- [ ] npm install completato
- [ ] File .env presente e verificato
- [ ] Database Supabase accessibile
- [ ] Migrazioni applicate (se nuovo database)
- [ ] Dati importati (se nuovo database)
- [ ] Edge Functions deployate (se nuovo progetto)
- [ ] Storage buckets creati (se nuovo progetto)
- [ ] Utenti di test creati (opzionale)
- [ ] Applicazione avviata con npm run dev
- [ ] Login funzionante

---

**Backup creato il:** 30 Gennaio 2026
**Versione progetto:** 1.0
**Database:** Supabase PostgreSQL
