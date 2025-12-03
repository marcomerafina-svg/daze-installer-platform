# Integrazione Zapier - Piattaforma Daze Lead Management

## Endpoint API

L'endpoint per ricevere lead da Zoho CRM è:

```
https://lrkkdastqrlxlyjewabg.supabase.co/functions/v1/receive-lead
```

## Configurazione Zapier

### Step 1: Trigger (Zoho CRM)
- Trigger: **New Lead** o **Updated Lead** in Zoho CRM
- Filtra per assicurarti che il campo "Installatore Assegnato" sia compilato

### Step 2: Action (Webhooks by Zapier)
- Action: **POST**
- URL: `https://lrkkdastqrlxlyjewabg.supabase.co/functions/v1/receive-lead`
- Payload Type: **JSON**
- Headers:
  - `Content-Type`: `application/json`

### Payload JSON

```json
{
  "firstName": "{{lead_first_name}}",
  "lastName": "{{lead_last_name}}",
  "email": "{{lead_email}}",
  "phone": "{{lead_phone}}",
  "address": "{{lead_address}}",
  "description": "{{lead_description}}",
  "installerEmail": "{{installer_email}}",
  "zohoLeadId": "{{lead_id}}"
}
```

### Campi Obbligatori
- `firstName` - Nome del cliente
- `lastName` - Cognome del cliente
- `phone` - Telefono del cliente
- `installerEmail` - Email dell'installatore a cui assegnare la lead (deve corrispondere all'email registrata nella piattaforma)

### Campi Opzionali
- `email` - Email del cliente
- `address` - Indirizzo completo del cliente
- `description` - Descrizione della richiesta (es: "Cliente interessato a stazione di ricarica 22kW")
- `zohoLeadId` - ID della lead su Zoho CRM (per tracciabilità)

## Risposta API

### Successo (200)
```json
{
  "success": true,
  "message": "Lead creata e assegnata con successo",
  "leadId": "uuid-della-lead",
  "installerId": "uuid-dell-installatore"
}
```

### Errori

#### 400 - Campi mancanti
```json
{
  "success": false,
  "error": "Campi obbligatori mancanti: firstName, lastName, phone, installerEmail"
}
```

#### 404 - Installatore non trovato
```json
{
  "success": false,
  "error": "Installatore non trovato o non attivo"
}
```

#### 500 - Errore server
```json
{
  "success": false,
  "error": "Descrizione dell'errore"
}
```

## Note Importanti

1. **Email Installatore**: Assicurati che l'email dell'installatore nel campo `installerEmail` corrisponda esattamente all'email registrata nella piattaforma Daze.

2. **Installatore Attivo**: L'installatore deve essere attivo (non disabilitato) nella piattaforma per ricevere lead.

3. **Formato Telefono**: Il campo telefono è obbligatorio. Assicurati che contenga sempre un numero valido.

4. **Testing**: Prima di attivare lo Zap in produzione, testa con alcuni lead di prova per verificare che tutto funzioni correttamente.

5. **Notifiche**: Quando una lead viene creata con successo, l'installatore riceverà una notifica in-app. Le notifiche email sono configurabili tramite l'Edge Function `send-lead-notification`.

## Esempio Completo

Zoho CRM → Zapier → Piattaforma Daze

Quando in Zoho CRM assegni una lead a "Mario Rossi" (email: mario.rossi@example.com):
1. Zapier intercetta l'evento
2. Zapier fa una POST all'endpoint con i dati della lead
3. L'API verifica che mario.rossi@example.com esista nella piattaforma
4. Crea la lead con stato "Nuova"
5. Assegna la lead a Mario Rossi
6. Mario Rossi vede immediatamente la nuova lead nella sua dashboard

## Troubleshooting

### La lead non appare nella piattaforma
- Verifica che l'email dell'installatore sia corretta
- Verifica che l'installatore sia attivo
- Controlla i log di Zapier per eventuali errori nella risposta

### Errore 404
- L'email dell'installatore non esiste nel database o l'installatore è disattivato
- Verifica nel pannello Admin che l'installatore sia presente e attivo

### Errore 400
- Manca uno dei campi obbligatori nel payload
- Verifica che firstName, lastName, phone e installerEmail siano tutti compilati
