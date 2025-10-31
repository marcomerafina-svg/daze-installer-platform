# Piattaforma Daze Lead Management

Piattaforma web per la gestione e distribuzione delle lead agli installatori partner di Daze, azienda specializzata in stazioni di ricarica per auto elettriche.

**🌐 URL Produzione**: [https://installer.daze.eu](https://installer.daze.eu)

## Caratteristiche Principali

### Area Admin
- **Dashboard** con statistiche globali (installatori, lead, conversioni)
- **Gestione Installatori** - Crea, attiva/disattiva installatori partner
- **Visualizzazione Lead** - Tutte le lead con filtri e ricerca
- Visibilità completa su tutta la piattaforma

### Area Installatore
- **Dashboard** con nuove lead in evidenza
- **Pipeline Visuale** - Gestione lead attraverso 6 stati
- **Dettaglio Lead** - Anagrafica completa, note private, storico
- **Notifiche In-App** - Badge per lead non visualizzate
- Isolamento dati: ogni installatore vede solo le proprie lead

### Integrazione Zoho CRM
- **API Endpoint** per ricevere lead automaticamente tramite Zapier
- Assegnazione automatica agli installatori
- Tracciabilità completa con ID Zoho

### Sicurezza
- **Supabase Authentication** per login/logout
- **Row Level Security (RLS)** - Isolamento dati garantito
- **Policy basate su ruoli** - Admin vede tutto, installatore solo le sue lead

## Stack Tecnologico

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth
- **Backend**: Supabase Edge Functions (Deno)
- **Icons**: Lucide React

## Stati Pipeline

1. **Nuova** - Lead appena assegnata
2. **Contattato** - Cliente contattato
3. **Sopralluogo fissato** - Appuntamento fissato
4. **Preventivo inviato** - Preventivo inviato
5. **Chiusa vinta** - Vendita conclusa ✅
6. **Chiusa persa** - Lead non convertita ❌

## Struttura Database

### Tabelle
- `installers` - Profili installatori con statistiche
- `leads` - Anagrafica lead (nome, telefono, email, indirizzo, descrizione)
- `lead_assignments` - Assegnazioni lead → installatori
- `lead_status_history` - Storico completo cambiamenti stato
- `lead_notes` - Note private degli installatori

### Row Level Security
Tutte le tabelle hanno RLS abilitato con policy specifiche per ruolo.

## API Endpoints

### Receive Lead (Zapier Integration)
```
POST https://lrkkdastqrlxlyjewabg.supabase.co/functions/v1/receive-lead
```

Payload esempio:
```json
{
  "firstName": "Mario",
  "lastName": "Rossi",
  "email": "mario@example.com",
  "phone": "+39 123 456 7890",
  "address": "Via Roma 123, Milano",
  "description": "Interessato a stazione 22kW per uso domestico",
  "installerEmail": "installatore@example.com",
  "zohoLeadId": "123456"
}
```

## Setup e Deploy

### Primo Setup
Consulta `SETUP.md` per:
- Creare l'account admin
- Aggiungere installatori
- Configurare il database (già fatto automaticamente)

### Integrazione Zapier
Consulta `ZAPIER_INTEGRATION.md` per:
- Configurare Zapier per invio automatico lead
- Formato payload richiesto
- Gestione errori

### Build
```bash
npm install
npm run build
```

### Development
```bash
npm run dev
```

## Prossimi Sviluppi

- [ ] Notifiche email configurabili con servizio SMTP
- [ ] Export dati in CSV/Excel
- [ ] Dashboard con grafici e analytics avanzati
- [ ] App mobile per installatori
- [ ] Sistema di commenti e chat interno

## Crediti

Sviluppato per **Daze** - Stazioni di ricarica per auto elettriche
Website: https://daze.eu

---

© 2025 Daze. Tutti i diritti riservati.
