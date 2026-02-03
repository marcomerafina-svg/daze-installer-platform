# Piano di Integrazione AWS - Daze Installer Platform

## 📋 Panoramica del Progetto

### Obiettivo
Integrare il software Daze Installer Platform con l'applicazione esistente su AWS per sincronizzare in **sola lettura** i dati relativi a:
- Installatori
- Aziende installatrici
- Installazioni wallbox completate

### Principio Fondamentale
**SOLO LETTURA** - Il software Daze non deve mai scrivere dati sul server AWS. Il flusso dati è unidirezionale: AWS → Daze.

---

## 🏗️ Architettura Proposta

### Opzione A: Sync Periodico (Consigliata)

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   AWS Server    │ ──API──▶│  Supabase Edge   │ ──────▶ │    Supabase     │
│  (App Esistente)│         │    Function      │         │    Database     │
└─────────────────┘         │   (Sync Job)     │         └─────────────────┘
                            └──────────────────┘                  │
                                                                  ▼
                                                         ┌─────────────────┐
                                                         │   Frontend      │
                                                         │   Daze App      │
                                                         └─────────────────┘
```

**Vantaggi:**
- Dati sempre disponibili anche se AWS è offline
- Performance migliori (lettura locale)
- Controllo completo sui dati sincronizzati

**Svantaggi:**
- Dati non in tempo reale (delay di 5-15 minuti)
- Necessità di gestire la deduplicazione


### Opzione B: Lettura Diretta (Real-time)

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   AWS Server    │ ◀──────▶│  Supabase Edge   │ ◀─────▶ │   Frontend      │
│  (App Esistente)│         │    Function      │         │   Daze App      │
└─────────────────┘         │   (Proxy API)    │         └─────────────────┘
                            └──────────────────┘
```

**Vantaggi:**
- Dati sempre aggiornati in tempo reale
- Nessuna duplicazione dati

**Svantaggi:**
- Dipendenza dalla disponibilità di AWS
- Latenza maggiore per ogni richiesta
- Costi API potenzialmente più alti

---

## 📊 Dati da Sincronizzare

### 1. Installatori
| Campo AWS | Campo Daze | Note |
|-----------|------------|------|
| `id` | `aws_installer_id` | Nuovo campo per mapping |
| `email` | `email` | Chiave per matching |
| `nome` | `first_name` | |
| `cognome` | `last_name` | |
| `telefono` | `phone` | |
| `azienda_id` | `company_id` | Richiede mapping aziende |

### 2. Aziende Installatrici
| Campo AWS | Campo Daze | Note |
|-----------|------------|------|
| `id` | `aws_company_id` | Nuovo campo per mapping |
| `ragione_sociale` | `company_name` | |
| `partita_iva` | `vat_number` | |
| `indirizzo` | `address` | |
| `email` | `email` | |

### 3. Installazioni
| Campo AWS | Campo Daze | Note |
|-----------|------------|------|
| `id` | `aws_installation_id` | Nuovo campo |
| `installer_id` | `installer_id` | Mapping tramite aws_installer_id |
| `data_installazione` | `installation_date` | |
| `seriale_wallbox` | `serial_number` | |
| `modello` | `product_id` | Mapping con tabella products |
| `indirizzo_cliente` | `customer_address` | |
| `note` | `notes` | |
| `foto` | `photo_urls` | Array di URL |

---

## 🔧 Fasi di Implementazione

### Fase 1: Preparazione Database (1-2 giorni)

**Task:**
1. Aggiungere colonne di mapping alle tabelle esistenti:
```sql
-- Installatori
ALTER TABLE installers ADD COLUMN aws_installer_id TEXT UNIQUE;
ALTER TABLE installers ADD COLUMN aws_synced_at TIMESTAMPTZ;

-- Aziende
ALTER TABLE installation_companies ADD COLUMN aws_company_id TEXT UNIQUE;
ALTER TABLE installation_companies ADD COLUMN aws_synced_at TIMESTAMPTZ;

-- Nuova tabella per installazioni AWS
CREATE TABLE aws_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aws_installation_id TEXT UNIQUE NOT NULL,
  installer_id UUID REFERENCES installers(id),
  installation_date TIMESTAMPTZ,
  serial_number TEXT,
  product_id UUID REFERENCES products(id),
  customer_name TEXT,
  customer_address TEXT,
  customer_phone TEXT,
  notes TEXT,
  photo_urls TEXT[],
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. Creare indici per performance
3. Configurare RLS policies

### Fase 2: Configurazione API AWS (2-3 giorni)

**Task:**
1. Ottenere credenziali API AWS (API Key, Token, ecc.)
2. Documentare tutti gli endpoint disponibili
3. Testare gli endpoint in ambiente di sviluppo
4. Definire rate limits e quote

**Informazioni necessarie da AWS:**
- [ ] URL base dell'API
- [ ] Metodo di autenticazione (API Key, OAuth, JWT)
- [ ] Documentazione degli endpoint
- [ ] Formato delle risposte (JSON schema)
- [ ] Rate limits
- [ ] Ambiente di test disponibile?

### Fase 3: Sviluppo Edge Functions (3-5 giorni)

**Edge Function: `sync-aws-data`**
```typescript
// Pseudocodice
Deno.serve(async (req) => {
  // 1. Autenticazione con AWS
  const awsToken = await getAWSToken();
  
  // 2. Fetch installatori da AWS
  const awsInstallers = await fetchAWSInstallers(awsToken);
  
  // 3. Sync con database Daze
  for (const installer of awsInstallers) {
    await upsertInstaller(installer);
  }
  
  // 4. Fetch installazioni recenti (ultime 24h)
  const awsInstallations = await fetchAWSInstallations(awsToken, last24h);
  
  // 5. Sync installazioni
  for (const installation of awsInstallations) {
    await upsertInstallation(installation);
  }
  
  return { synced: true, timestamp: new Date() };
});
```

**Edge Function: `get-aws-installation` (per lettura real-time)**
```typescript
// Proxy per lettura diretta quando necessario
Deno.serve(async (req) => {
  const { installationId } = await req.json();
  
  const awsData = await fetchFromAWS(`/installations/${installationId}`);
  
  return awsData;
});
```

### Fase 4: Scheduling Sync (1 giorno)

**Opzioni:**
1. **Supabase pg_cron** (consigliato)
```sql
SELECT cron.schedule(
  'sync-aws-data',
  '*/15 * * * *', -- Ogni 15 minuti
  $$SELECT net.http_post(
    'https://xxx.supabase.co/functions/v1/sync-aws-data',
    '{}',
    headers := '{"Authorization": "Bearer xxx"}'
  )$$
);
```

2. **External Cron Service** (es. cron-job.org, GitHub Actions)

3. **Webhook da AWS** (se disponibile)

### Fase 5: Aggiornamento Frontend (2-3 giorni)

**Modifiche necessarie:**

1. **Nuova sezione "Installazioni AWS"** nella dashboard installatore
2. **Componente lista installazioni** con dati sincronizzati
3. **Indicatore stato sync** (ultimo aggiornamento)
4. **Filtri e ricerca** per installazioni

### Fase 6: Testing & QA (2-3 giorni)

**Test da eseguire:**
- [ ] Sync completo funziona correttamente
- [ ] Mapping installatori/aziende corretto
- [ ] Gestione duplicati
- [ ] Gestione errori AWS offline
- [ ] Performance con grandi volumi di dati
- [ ] RLS policies funzionano correttamente

---

## ⚠️ Rischi e Mitigazioni

### Rischio 1: API AWS Non Documentata o Instabile
**Probabilità:** Media
**Impatto:** Alto

**Mitigazione:**
- Richiedere documentazione completa prima di iniziare
- Implementare retry logic con exponential backoff
- Logging dettagliato di tutte le chiamate API
- Alert in caso di errori ripetuti

### Rischio 2: Cambiamenti Schema AWS
**Probabilità:** Media
**Impatto:** Medio

**Mitigazione:**
- Validazione schema dei dati ricevuti
- Versionamento dell'integrazione
- Alert automatici se campi attesi mancano
- Mappatura flessibile con fallback

### Rischio 3: Rate Limiting AWS
**Probabilità:** Alta
**Impatto:** Medio

**Mitigazione:**
- Implementare caching aggressivo
- Sync incrementale (solo dati modificati)
- Rispettare rate limits con queue
- Sync notturno per dati storici

### Rischio 4: Dati Inconsistenti
**Probabilità:** Media
**Impatto:** Alto

**Mitigazione:**
- Chiavi di mapping univoche (aws_*_id)
- Timestamp di sync per tracciabilità
- Reconciliation periodica completa
- Log di tutte le operazioni di sync

### Rischio 5: Sicurezza Credenziali AWS
**Probabilità:** Bassa
**Impatto:** Critico

**Mitigazione:**
- Credenziali solo in Supabase Secrets (mai nel codice)
- Token con permessi minimi (solo lettura)
- Rotazione periodica delle credenziali
- Audit log degli accessi

### Rischio 6: Performance con Grandi Volumi
**Probabilità:** Media
**Impatto:** Medio

**Mitigazione:**
- Paginazione delle richieste AWS
- Sync incrementale con timestamp
- Indici database ottimizzati
- Batch processing

---

## 📅 Timeline Stimata

| Fase | Durata | Dipendenze |
|------|--------|------------|
| 1. Preparazione Database | 1-2 giorni | - |
| 2. Configurazione API AWS | 2-3 giorni | Credenziali AWS |
| 3. Sviluppo Edge Functions | 3-5 giorni | Fase 1, 2 |
| 4. Scheduling Sync | 1 giorno | Fase 3 |
| 5. Aggiornamento Frontend | 2-3 giorni | Fase 3 |
| 6. Testing & QA | 2-3 giorni | Tutte |

**Totale: 11-17 giorni lavorativi**

---

## 📝 Checklist Pre-Implementazione

### Da Ottenere
- [ ] Documentazione API AWS completa
- [ ] Credenziali API (ambiente test + produzione)
- [ ] Schema dati AWS (JSON examples)
- [ ] Rate limits e quote
- [ ] Contatto tecnico AWS per supporto

### Da Definire
- [ ] Frequenza di sync desiderata
- [ ] Dati storici: quanto indietro sincronizzare?
- [ ] Priorità: quali dati sono più importanti?
- [ ] Gestione conflitti: cosa fare se i dati divergono?

### Da Verificare
- [ ] AWS permette accesso API esterno?
- [ ] Ci sono restrizioni IP?
- [ ] È necessario un contratto/agreement?
- [ ] GDPR: i dati possono essere copiati?

---

## 💰 Considerazioni sui Costi

### Supabase
- Edge Functions: incluse nel piano (con limiti)
- Database storage: dipende dal volume dati
- Bandwidth: dipende dalla frequenza di sync

### AWS
- Costi API (se a pagamento)
- Bandwidth in uscita

### Stima Mensile
- Sync ogni 15 minuti = ~2.880 chiamate/mese
- Se 1000 installazioni/mese = ~3.000 record sync
- Costo stimato: **verificare con pricing AWS**

---

## 🔐 Sicurezza

### Principi
1. **Least Privilege**: Token AWS con permessi minimi
2. **Encryption**: HTTPS per tutte le comunicazioni
3. **Audit**: Log di tutte le operazioni
4. **Secrets Management**: Credenziali in Supabase Secrets

### Implementazione
```typescript
// Esempio gestione sicura credenziali
const AWS_API_KEY = Deno.env.get('AWS_API_KEY'); // Mai hardcoded
const AWS_API_URL = Deno.env.get('AWS_API_URL');

// Validazione prima di ogni chiamata
if (!AWS_API_KEY || !AWS_API_URL) {
  throw new Error('AWS credentials not configured');
}
```

---

## 📞 Prossimi Passi

1. **Riunione con team AWS** per ottenere documentazione API
2. **Definire scope MVP** (quali dati sincronizzare per primi)
3. **Setup ambiente di test** 
4. **Proof of Concept** con un endpoint

---

*Documento creato il: 3 Febbraio 2026*
*Versione: 1.0*
*Autore: Assistente AI*
