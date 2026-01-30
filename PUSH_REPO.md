# Push su marcomerafina-svg/daze-installer-platform

Repository: **https://github.com/marcomerafina-svg/daze-installer-platform**  
Accesso con: **mattia.valentino@daze.eu**

Esegui questi comandi **nel terminale** (PowerShell o CMD), dalla cartella del progetto.

---

## 1. Vai nella cartella del progetto

```powershell
cd "c:\Users\dazet\Desktop\installatori daze"
```

---

## 2. Collega il remote (se non già fatto)

```powershell
git remote add origin https://github.com/marcomerafina-svg/daze-installer-platform.git
```

Se il remote `origin` esiste già ma punta altrove:

```powershell
git remote set-url origin https://github.com/marcomerafina-svg/daze-installer-platform.git
```

---

## 3. Aggiungi tutti i file e fai il commit

```powershell
git add .
git commit -m "Sostituzione repo: Piattaforma Daze Lead Management (versione completa)"
```

Se Git chiede di configurare nome ed email (prima volta):

```powershell
git config --global user.name "Mattia Valentino"
git config --global user.email "mattia.valentino@daze.eu"
```

Poi ripeti `git commit ...`.

---

## 4. Allinea al branch main e sovrascrivi la repository

```powershell
git branch -M main
git push --force -u origin main
```

Quando richiesto, autenticati con l’account GitHub legato a **mattia.valentino@daze.eu**:
- **Username**: il tuo username GitHub (es. `MattiaValentino` o quello associato a quell’email)
- **Password**: usa un **Personal Access Token** (non la password dell’account).  
  Crea un token qui: GitHub → Settings → Developer settings → [Personal access tokens](https://github.com/settings/tokens) → Generate new token (classic), con scope `repo`.

---

## Riepilogo

| Comando | Cosa fa |
|--------|---------|
| `git remote add origin https://github.com/marcomerafina-svg/daze-installer-platform.git` | Collega la repo GitHub |
| `git add .` | Aggiunge tutti i file (rispetta .gitignore) |
| `git commit -m "..."` | Crea il commit |
| `git branch -M main` | Usa il branch main |
| `git push --force -u origin main` | Sovrascrive il contenuto su GitHub con questo progetto |

Dopo il push, la repository su GitHub conterrà questo progetto e Vercel (se collegato a quel repo) farà un nuovo deploy in automatico.
