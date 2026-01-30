# Setup Piattaforma Daze Lead Management

## Deploy su Vercel

### Prerequisiti
- Account Vercel (gratuito su https://vercel.com)
- Repository GitHub/GitLab con il codice
- Accesso al pannello DNS di daze.eu

### Passaggi Deploy

1. **Importa il progetto su Vercel**
   - Vai su https://vercel.com/new
   - Seleziona il repository del progetto
   - Framework: Vite
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `dist`

2. **Configura le variabili d'ambiente**
   - Vai su Settings → Environment Variables
   - Aggiungi:
     ```
     VITE_SUPABASE_URL=https://lrkkdastqrlxlyjewabg.supabase.co
     VITE_SUPABASE_ANON_KEY=[la tua chiave anon]
     ```

3. **Deploy iniziale**
   - Clicca su "Deploy"
   - Vercel genererà un URL temporaneo (es: `your-project.vercel.app`)
   - Testa che tutto funzioni

4. **Configura il dominio personalizzato**
   - Vai su Settings → Domains
   - Clicca su "Add"
   - Inserisci: `installer.daze.eu`
   - Vercel ti fornirà le istruzioni DNS

5. **Configura DNS su daze.eu**
   - Accedi al pannello DNS del tuo provider
   - Aggiungi un record CNAME:
     ```
     Type: CNAME
     Name: installer
     Value: cname.vercel-dns.com
     TTL: Auto (o 3600)
     ```
   - Salva le modifiche

6. **Verifica il dominio**
   - Torna su Vercel
   - Attendi la verifica DNS (5-30 minuti)
   - Certificato SSL HTTPS configurato automaticamente

7. **Aggiorna Supabase**
   - Vai su https://supabase.com/dashboard/project/lrkkdastqrlxlyjewabg
   - Vai su Authentication → URL Configuration
   - Aggiungi `https://installer.daze.eu` alla lista "Redirect URLs"
   - Aggiungi `https://installer.daze.eu` alla lista "Site URL"

### Deploy Automatico
Ogni push sul branch principale attiverà automaticamente un nuovo deploy su Vercel.

## Primo Accesso Admin

### Creare l'account Admin

Per creare il tuo primo account amministratore, devi utilizzare Supabase direttamente:

1. Vai su: https://supabase.com/dashboard/project/lrkkdastqrlxlyjewabg
2. Vai su **Authentication** → **Users**
3. Clicca su **Add User** → **Create new user**
4. Compila:
   - Email: la tua email admin
   - Password: scegli una password sicura
   - Conferma password
5. Dopo aver creato l'utente, vai su **Table Editor** → **auth.users**
6. Trova il tuo utente appena creato
7. Modifica il campo `raw_app_metadata` e imposta:
   ```json
   {"role": "admin"}
   ```
8. Salva

Ora puoi accedere alla piattaforma con:
- URL: https://installer.daze.eu
- Email: la tua email admin
- Password: la password che hai scelto

## Aggiungere Installatori

Una volta fatto l'accesso come admin:

1. Vai su **Installatori** nel menu laterale
2. Clicca su **Nuovo Installatore**
3. Compila il form:
   - Nome
   - Cognome
   - Email (questa deve corrispondere all'email che usi su Zoho CRM)
   - Telefono
   - Password iniziale (da comunicare all'installatore)
4. Clicca su **Crea Installatore**

L'installatore potrà ora accedere con la sua email e password.

## Struttura del Database

Il database è già configurato con:
- Tabella `installers` - Profili installatori
- Tabella `leads` - Anagrafica lead
- Tabella `lead_assignments` - Assegnazioni lead → installatori
- Tabella `lead_status_history` - Storico cambiamenti stato
- Tabella `lead_notes` - Note degli installatori sulle lead

## Row Level Security (RLS)

La sicurezza è gestita automaticamente:
- **Admin**: vede e gestisce tutto
- **Installer**: vede solo le proprie lead assegnate

Non è necessaria alcuna configurazione aggiuntiva.

## Stati Pipeline

Le lead possono avere i seguenti stati:
1. **Nuova** - Lead appena assegnata
2. **Contattato** - Cliente contattato per la prima volta
3. **Sopralluogo fissato** - Appuntamento fissato presso il cliente
4. **Preventivo inviato** - Preventivo inviato al cliente
5. **Chiusa vinta** - Lead convertita in vendita
6. **Chiusa persa** - Lead non convertita

## Integrazione Zoho CRM

Consulta il file `ZAPIER_INTEGRATION.md` per:
- Configurare Zapier per inviare lead automaticamente
- Endpoint API
- Formato dati richiesto
- Gestione errori

## Notifiche

### Notifiche In-App
Quando un installatore riceve una nuova lead:
- Appare un badge rosso nell'icona notifiche (header)
- La lead appare nella sezione "Nuove Lead" della dashboard
- Un badge "NUOVO" indica le lead non ancora visualizzate

### Notifiche Email
Le notifiche email sono preparate ma richiedono configurazione SMTP.
L'Edge Function `send-lead-notification` è pronta ma necessita di:
- Servizio email (es: SendGrid, Mailgun, Resend)
- Configurazione credenziali SMTP

## Funzionalità Admin

### Dashboard
- Statistiche globali
- Numero installatori attivi
- Lead totali, nuove, vinte, perse
- Tasso di conversione

### Gestione Installatori
- Lista completa installatori
- Statistiche per installatore
- Attiva/Disattiva installatori
- Crea nuovi installatori

### Visualizzazione Lead
- Tutte le lead della piattaforma
- Filtri per stato
- Ricerca per nome, email, telefono
- Dettaglio completo di ogni lead
- Informazioni sull'installatore assegnato

## Funzionalità Installatore

### Dashboard
- Lead nuove in evidenza
- Statistiche personali (totali, attive, vinte)
- Accesso rapido alle lead recenti

### Pipeline
- Vista kanban con 6 colonne (stati)
- Cambio stato tramite dropdown
- Contatori lead per ogni stato
- Informazioni rapide (nome, telefono, email)

### Dettaglio Lead
- Anagrafica completa cliente
- Telefono (con link tel:)
- Email (con link mailto:)
- Indirizzo
- Descrizione necessità
- Cambio stato rapido
- Aggiunta note private
- Storico completo cambiamenti stato

## Best Practices

### Per Admin
1. Crea gli installatori prima di iniziare a usare Zapier
2. Assicurati che le email degli installatori in piattaforma corrispondano a quelle su Zoho CRM
3. Monitora regolarmente le statistiche nella dashboard
4. Disattiva installatori non più attivi invece di eliminarli (per mantenere lo storico)

### Per Installatori
1. Controlla quotidianamente le nuove lead
2. Aggiorna lo stato delle lead man mano che procedi
3. Usa le note per tenere traccia delle conversazioni e dettagli importanti
4. Contatta i clienti tempestivamente

## Supporto

Per problemi tecnici:
- Verifica prima la console del browser (F12)
- Controlla i log di Supabase
- Verifica le RLS policies se hai problemi di permessi

## Sicurezza

- Le password sono gestite da Supabase Auth (bcrypt)
- Tutte le comunicazioni sono su HTTPS
- RLS garantisce isolamento dati tra installatori
- L'API Zapier non richiede autenticazione JWT per facilitare l'integrazione
- I dati sensibili non sono esposti nei log
