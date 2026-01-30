# Credenziali di Test - Piattaforma Daze

⚠️ **IMPORTANTE:** Gli utenti devono essere creati manualmente attraverso il dashboard di Supabase.
Consulta il file `CREATE_TEST_USERS.md` per le istruzioni dettagliate.

## Account Admin

**Email:** `admin@daze.eu`
**Password:** `DazeAdmin2025!`

### Cosa puoi fare con questo account:
- Visualizzare la dashboard con statistiche globali
- Vedere tutte le 6 lead di esempio
- Gestire l'installatore (attivare/disattivare)
- Creare nuovi installatori
- Visualizzare dettagli completi di tutte le lead

---

## Account Installatore

**Email:** `installatore@daze.eu`
**Password:** `Installatore2025!`

**Nome:** Marco Bianchi
**Telefono:** +39 333 456 7890

### Cosa puoi fare con questo account:
- Vedere la dashboard con 1 nuova lead (Giuseppe Verdi)
- Visualizzare la pipeline con 6 lead in stati diversi
- Cambiare lo stato delle lead
- Aggiungere note private alle lead
- Vedere lo storico completo di ogni lead

---

## Dati Sample Creati

### Lead di Esempio (tutte assegnate a Marco Bianchi)

1. **Giuseppe Verdi** - NUOVA ⚡
   - Telefono: +39 340 123 4567
   - Milano
   - Stazione domestica 22kW per Tesla
   - **NON ANCORA VISUALIZZATA** (badge "NUOVO")

2. **Laura Rossi** - CONTATTATO
   - Telefono: +39 348 765 4321
   - Torino
   - Azienda con flotta elettrica, 3 colonnine 11kW
   - Con nota

3. **Antonio Esposito** - SOPRALLUOGO FISSATO
   - Telefono: +39 333 987 6543
   - Roma
   - Condominio 12 box auto
   - Con nota e storico completo

4. **Francesca Ferrari** - PREVENTIVO INVIATO
   - Telefono: +39 347 234 5678
   - Bologna
   - Wallbox 7.4kW domestico
   - Con nota

5. **Roberto Colombo** - CHIUSA VINTA ✅
   - Telefono: +39 339 876 5432
   - Firenze
   - Stazione 11kW con app smart
   - Con nota e storico completo (da Nuova → Vinta)

6. **Maria Bruno** - CHIUSA PERSA ❌
   - Telefono: +39 345 678 9012
   - Napoli
   - Lead persa per competitor
   - Con storico completo

---

## Statistiche Attese

### Dashboard Admin
- **Installatori Totali:** 1
- **Installatori Attivi:** 1
- **Lead Totali:** 6
- **Lead Nuove:** 1
- **Lead Vinte:** 1
- **Lead Perse:** 1
- **Tasso di conversione:** 17% (1 vinta su 6 totali)

### Dashboard Installatore (Marco Bianchi)
- **Lead Totali:** 6
- **Lead Attive:** 4 (escluse vinte e perse)
- **Lead Vinte:** 1
- **Nuove Lead non visualizzate:** 1 (Giuseppe Verdi)

---

## Test della Pipeline

Puoi testare il cambio stato accedendo come installatore e:

1. Vai alla **Pipeline**
2. Vedrai 6 colonne con le lead distribuite
3. Usa il dropdown sotto ogni lead per cambiarla di stato
4. Vai sul **Dettaglio Lead** per:
   - Vedere l'anagrafica completa
   - Aggiungere note private
   - Vedere lo storico cambiamenti
   - Cambiare stato rapidamente

---

## Test Integrazione Zapier

Per testare l'endpoint Zapier, puoi usare questo comando curl:

```bash
curl -X POST https://lrkkdastqrlxlyjewabg.supabase.co/functions/v1/receive-lead \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Cliente",
    "email": "test@example.com",
    "phone": "+39 333 000 0000",
    "address": "Via Test 123, Milano",
    "description": "Lead di test da Zapier",
    "installerEmail": "installatore@daze.eu",
    "zohoLeadId": "TEST123"
  }'
```

Se funziona correttamente, vedrai apparire la nuova lead nella dashboard dell'installatore!

---

## Note per il Testing

- Le lead hanno date realistiche (da 2 ore fa a 10 giorni fa)
- Giuseppe Verdi appare come "NUOVO" perché `is_viewed = false`
- Tutte le altre lead sono marcate come già visualizzate
- Lo storico mostra la progressione realistica attraverso gli stati
- Le note contengono informazioni realistiche sui progressi con i clienti

---

## Sicurezza dei Dati di Test

⚠️ **IMPORTANTE:** Queste sono credenziali di TEST.

Per la produzione:
1. Elimina questi account di test
2. Crea nuovi account admin con password sicure
3. Non condividere mai le credenziali in chiaro
4. Usa un gestore di password per conservarle

---

Buon testing! 🚀
