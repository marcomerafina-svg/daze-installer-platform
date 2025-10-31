# Sistema di Notifiche Email Automatiche

## Panoramica

Il sistema invia automaticamente notifiche email agli installatori quando ricevono una nuova lead. Il sistema è completamente automatizzato e utilizza:

- **Resend** per l'invio delle email (dominio: `mails.daze.eu`)
- **Database Trigger** per attivare automaticamente l'invio
- **Supabase Edge Function** per gestire l'invio effettivo
- **Tabella di Log** per tracciare tutte le notifiche

## Architettura

```
Nuova Lead Assegnata
       ↓
Database Trigger (PostgreSQL)
       ↓
Edge Function: send-lead-notification
       ↓
Resend API
       ↓
Email Inviata all'Installatore
       ↓
Log Aggiornato (notification_logs)
```

## Componenti

### 1. Database Trigger

**Nome:** `trigger_notify_installer_on_assignment`

Viene attivato automaticamente quando:
- Viene inserito un nuovo record nella tabella `lead_assignments`
- L'evento è `AFTER INSERT`, quindi la lead è già assegnata

Il trigger:
1. Recupera i dati dell'installatore e della lead
2. Crea un record in `notification_logs` con status `pending`
3. Chiama l'Edge Function `send-lead-notification` tramite HTTP (pg_net)
4. Non blocca mai l'assegnazione della lead, anche in caso di errore

### 2. Edge Function

**Nome:** `send-lead-notification`
**URL:** `https://lrkkdastqrlxlyjewabg.supabase.co/functions/v1/send-lead-notification`

Responsabilità:
- Riceve i dati dal trigger (email installatore, dati lead, ecc.)
- Compone l'email HTML con design professionale
- Invia l'email tramite Resend API
- Aggiorna il log delle notifiche con il risultato (sent/failed)

### 3. Tabella notification_logs

Traccia tutte le notifiche email inviate:

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `id` | uuid | ID univoco del log |
| `assignment_id` | uuid | Riferimento all'assegnazione lead |
| `installer_id` | uuid | ID dell'installatore destinatario |
| `lead_id` | uuid | ID della lead |
| `email_sent_to` | text | Indirizzo email destinatario |
| `status` | text | `pending`, `sent`, o `failed` |
| `resend_message_id` | text | ID messaggio da Resend API |
| `error_message` | text | Messaggio di errore se fallito |
| `sent_at` | timestamptz | Data/ora invio |
| `created_at` | timestamptz | Data/ora creazione record |

## Configurazione

### Variabili d'Ambiente

Le seguenti variabili sono automaticamente configurate in Supabase:

```bash
RESEND_API_KEY=re_FMRWSXrP_JbYfJtMSxh6Ve8DqYtz17gFv
SUPABASE_URL=https://lrkkdastqrlxlyjewabg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[auto-configurato]
```

### Configurazione Resend

- **Dominio verificato:** `mails.daze.eu`
- **Email mittente:** `Daze <noreply@mails.daze.eu>`
- **Subject:** "Nuova Lead Ricevuta - Daze"

## Template Email

L'email inviata agli installatori include:

1. **Header con logo Daze** e gradiente blu
2. **Saluto personalizzato** con nome installatore
3. **Dettagli lead:**
   - Nome cliente completo
   - Numero di telefono
   - Descrizione/note (se presenti)
4. **Call-to-Action:** Pulsante "Vai alla Piattaforma" che porta a `https://installer.daze.eu/pipeline`
5. **Footer** con copyright e nota sul perché hanno ricevuto l'email

## Flusso di Funzionamento

### Scenario Standard

1. **Zoho CRM** invia una nuova lead tramite webhook
2. **Edge Function `receive-lead`** riceve i dati e crea:
   - Record in tabella `leads`
   - Record in tabella `lead_assignments` (assegna all'installatore)
3. **Trigger automatico** si attiva sull'inserimento in `lead_assignments`
4. **Trigger** chiama Edge Function `send-lead-notification`
5. **Edge Function** invia email tramite Resend
6. **Log aggiornato** con stato `sent` o `failed`

### Gestione Errori

Il sistema è progettato per essere resiliente:

- Se l'invio email fallisce, **la lead viene comunque assegnata**
- L'errore viene loggato in `notification_logs.error_message`
- Lo status viene impostato su `failed`
- L'admin può vedere i log e capire cosa è andato storto

## Monitoraggio

### Query Utili

**Verificare notifiche recenti:**
```sql
SELECT
  nl.*,
  i.first_name || ' ' || i.last_name as installer_name,
  l.first_name || ' ' || l.last_name as lead_name
FROM notification_logs nl
JOIN installers i ON nl.installer_id = i.id
JOIN leads l ON nl.lead_id = l.id
ORDER BY nl.created_at DESC
LIMIT 10;
```

**Vedere notifiche fallite:**
```sql
SELECT *
FROM notification_logs
WHERE status = 'failed'
ORDER BY created_at DESC;
```

**Statistiche invii:**
```sql
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM notification_logs
GROUP BY status;
```

## Risoluzione Problemi

### L'email non arriva

1. **Controlla notification_logs:**
   ```sql
   SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 5;
   ```

2. **Verifica status:**
   - `pending`: Email ancora in coda (problema con trigger)
   - `failed`: Errore nell'invio (controlla `error_message`)
   - `sent`: Email inviata con successo

3. **Controlla Resend Dashboard:**
   - Vai su resend.com
   - Verifica il dominio `mails.daze.eu` sia verificato
   - Controlla i log di invio con il `resend_message_id`

4. **Verifica spam/cartella indesiderati**

### Il trigger non si attiva

```sql
-- Verifica che il trigger esista
SELECT * FROM pg_trigger WHERE tgname = 'trigger_notify_installer_on_assignment';

-- Verifica che pg_net sia abilitato
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

### RESEND_API_KEY non configurato

Se vedi errori relativi a `RESEND_API_KEY not configured`:

1. Le variabili d'ambiente sono automaticamente configurate in Supabase
2. Controlla i log della Edge Function nel dashboard Supabase
3. Le variabili sono disponibili solo nel runtime della funzione, non localmente

## Sicurezza

### Row Level Security (RLS)

La tabella `notification_logs` ha RLS abilitato:

- **Admin:** Possono vedere tutti i log
- **Installer:** Possono vedere solo i propri log di notifica
- **Inserimento:** Solo il sistema (via trigger) può inserire log

### Permessi

Il trigger usa `SECURITY DEFINER` per eseguire con permessi elevati, necessario per:
- Accedere a `pg_net.http_post`
- Inserire in `notification_logs`
- Non esporre credenziali agli utenti

## Testing

### Test Manuale

Per testare il sistema, crea una nuova lead tramite `receive-lead`:

```bash
curl -X POST \
  https://lrkkdastqrlxlyjewabg.supabase.co/functions/v1/receive-lead \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Cliente",
    "phone": "+39 123 456 7890",
    "email": "test@example.com",
    "installerEmail": "installatore@daze.eu",
    "description": "Test notifica email"
  }'
```

### Verifica

Dopo il test:
1. Controlla `notification_logs` per il nuovo record
2. Verifica che lo status diventi `sent`
3. Controlla la casella email dell'installatore
4. Verifica il `resend_message_id` sia presente

## Manutenzione

### Pulizia Log Vecchi (Opzionale)

Per mantenere la tabella pulita, si può configurare una pulizia periodica:

```sql
-- Elimina log più vecchi di 90 giorni
DELETE FROM notification_logs
WHERE created_at < NOW() - INTERVAL '90 days'
AND status = 'sent';
```

### Monitoraggio Proattivo

Considera di configurare:
- Alert per notifiche `failed` ripetute
- Dashboard per visualizzare tasso di successo
- Report settimanali sulle notifiche inviate
