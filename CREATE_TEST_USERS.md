# Come Creare gli Utenti di Test

Il tentativo di creare utenti via SQL diretto ha causato un errore. Gli utenti devono essere creati attraverso il dashboard di Supabase o l'API Auth.

## Metodo 1: Dashboard Supabase (Consigliato)

### Creare l'Admin

1. Vai su: https://supabase.com/dashboard/project/lrkkdastqrlxlyjewabg/auth/users
2. Clicca **"Add user"** → **"Create new user"**
3. Compila:
   - **Email:** `admin@daze.eu`
   - **Password:** `DazeAdmin2025!`
   - **Auto Confirm User:** ✅ Sì
4. Clicca **"Create user"**
5. Una volta creato l'utente, clicca sull'utente nella lista
6. Vai nella tab **"Raw User Meta Data"** o **"User Metadata"**
7. Nel campo `raw_app_meta_data`, aggiungi:
   ```json
   {"role": "admin"}
   ```
8. Salva

### Creare l'Installatore

1. Nella stessa pagina, clicca **"Add user"** → **"Create new user"**
2. Compila:
   - **Email:** `installatore@daze.eu`
   - **Password:** `Installatore2025!`
   - **Auto Confirm User:** ✅ Sì
3. Clicca **"Create user"**
4. Copia l'**UUID** dell'utente appena creato (lo trovi nella colonna ID)
5. Vai su **SQL Editor** in Supabase
6. Esegui questo SQL (sostituendo `USER_UUID` con l'UUID copiato):

```sql
INSERT INTO installers (
  user_id,
  first_name,
  last_name,
  email,
  phone,
  is_active
)
VALUES (
  'USER_UUID',  -- Sostituisci con l'UUID dell'utente
  'Marco',
  'Bianchi',
  'installatore@daze.eu',
  '+39 333 456 7890',
  true
);
```

7. Nel pannello Auth, clicca sull'utente installatore
8. Nel campo `raw_app_meta_data`, aggiungi:
   ```json
   {"role": "installer"}
   ```
9. Salva

## Metodo 2: Tramite SQL Editor (Alternativo)

Se preferisci SQL, usa queste query nel SQL Editor di Supabase:

### 1. Crea Admin
```sql
-- Usa la funzione admin di Supabase per creare l'utente
SELECT extensions.create_user(
  'admin@daze.eu',
  'DazeAdmin2025!',
  '{"role": "admin"}'::jsonb
);
```

### 2. Crea Installatore
```sql
-- Crea l'utente installatore
SELECT extensions.create_user(
  'installatore@daze.eu',
  'Installatore2025!',
  '{"role": "installer"}'::jsonb
);

-- Ottieni l'UUID dell'installatore appena creato
SELECT id FROM auth.users WHERE email = 'installatore@daze.eu';

-- Inserisci il profilo installatore (usa l'UUID ottenuto sopra)
INSERT INTO installers (user_id, first_name, last_name, email, phone, is_active)
VALUES (
  'UUID_QUI',  -- Sostituisci con l'UUID reale
  'Marco',
  'Bianchi',
  'installatore@daze.eu',
  '+39 333 456 7890',
  true
);
```

## Metodo 3: Script di Setup (Più Veloce)

Puoi anche creare uno script che usa l'Admin API di Supabase:

```javascript
// setup-users.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lrkkdastqrlxlyjewabg.supabase.co'
const supabaseServiceKey = 'TUA_SERVICE_ROLE_KEY' // Dalla dashboard

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createUsers() {
  // Crea admin
  const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
    email: 'admin@daze.eu',
    password: 'DazeAdmin2025!',
    email_confirm: true,
    user_metadata: { role: 'admin' },
    app_metadata: { role: 'admin' }
  })

  if (adminError) console.error('Admin error:', adminError)
  else console.log('Admin creato:', adminData.user.email)

  // Crea installatore
  const { data: installerData, error: installerError } = await supabase.auth.admin.createUser({
    email: 'installatore@daze.eu',
    password: 'Installatore2025!',
    email_confirm: true,
    user_metadata: { role: 'installer' },
    app_metadata: { role: 'installer' }
  })

  if (installerError) console.error('Installer error:', installerError)
  else {
    console.log('Installatore creato:', installerData.user.email)

    // Crea profilo installatore
    const { error: profileError } = await supabase
      .from('installers')
      .insert({
        user_id: installerData.user.id,
        first_name: 'Marco',
        last_name: 'Bianchi',
        email: 'installatore@daze.eu',
        phone: '+39 333 456 7890',
        is_active: true
      })

    if (profileError) console.error('Profile error:', profileError)
    else console.log('Profilo installatore creato')
  }
}

createUsers()
```

Esegui con: `node setup-users.js`

## Riassegnare le Lead

Dopo aver creato l'installatore, devi riassegnare le lead. Ottieni il nuovo `installer_id` e poi esegui:

```sql
-- Ottieni il nuovo installer_id
SELECT id FROM installers WHERE email = 'installatore@daze.eu';

-- Aggiorna tutte le assegnazioni (sostituisci NEW_INSTALLER_ID)
UPDATE lead_assignments
SET installer_id = 'NEW_INSTALLER_ID'
WHERE installer_id = '66791904-6c6f-431a-b297-797b9325d425';

-- Aggiorna lo storico (sostituisci NEW_INSTALLER_ID)
UPDATE lead_status_history
SET installer_id = 'NEW_INSTALLER_ID'
WHERE installer_id = '66791904-6c6f-431a-b297-797b9325d425';

-- Aggiorna le note (sostituisci NEW_INSTALLER_ID)
UPDATE lead_notes
SET installer_id = 'NEW_INSTALLER_ID'
WHERE installer_id = '66791904-6c6f-431a-b297-797b9325d425';
```

## Verifica

Dopo aver creato gli utenti, prova il login con:

**Admin:**
- Email: `admin@daze.eu`
- Password: `DazeAdmin2025!`

**Installatore:**
- Email: `installatore@daze.eu`
- Password: `Installatore2025!`

Se funziona, dovresti vedere il redirect corretto e le dashboard appropriate!

---

**Nota:** Il metodo 1 (Dashboard) è il più sicuro e consigliato perché gestisce automaticamente tutti gli schemi interni di Supabase Auth.
