# Script per inviare una lead di test all'installatore mattia.valentino@daze.eu
# Esegui dalla cartella del progetto: .\invia-lead-test.ps1

$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
  Write-Host "File .env non trovato." -ForegroundColor Red
  exit 1
}

$anonKey = $null
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^VITE_SUPABASE_ANON_KEY=(.+)$') { $anonKey = $matches[1].Trim() }
}
if (-not $anonKey) {
  Write-Host "VITE_SUPABASE_ANON_KEY non trovato in .env" -ForegroundColor Red
  exit 1
}

$n = [int](Get-Random -Minimum 2 -Maximum 99)
$body = @{
  firstName    = "Cliente"
  lastName     = "Test $n"
  email        = "cliente.test$n@example.com"
  phone        = "+39 333 1234$n$n"
  address      = "Via Verdi $n, Roma"
  description  = "Lead di test #$n - richiesta stazione 22kW per uso domestico"
  installerEmail = "mattia.valentino@daze.eu"
  zohoLeadId   = "test-lead-$(Get-Date -Format 'yyyyMMdd-HHmm')"
} | ConvertTo-Json

$headers = @{
  "Content-Type"  = "application/json"
  "Authorization" = "Bearer $anonKey"
}

$url = "https://lrkkdastqrlxlyjewabg.supabase.co/functions/v1/receive-lead"
Write-Host "Invio lead di test a mattia.valentino@daze.eu..." -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -Headers $headers
  Write-Host "OK: $($response.message)" -ForegroundColor Green
  Write-Host "Lead ID: $($response.leadId)" -ForegroundColor Green
} catch {
  Write-Host "Errore: $_" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    Write-Host $reader.ReadToEnd()
  }
  exit 1
}
