-- Fix: RLS su storage bucket lead-quotes per upload PDF preventivi
-- L'errore "new row violates row-level security policy" si verifica quando l'installatore
-- carica un PDF: la policy esistente richiede lead_assignments.installer_id = utente,
-- ma per lead assegnate alla company (o con assegnazione interna) l'accesso va considerato
-- anche tramite assigned_to_company_id o internal assignment.
-- Questa migrazione sostituisce la policy di INSERT per gli installatori con una più inclusiva.

DROP POLICY IF EXISTS "Installer can upload quote PDFs for assigned leads" ON storage.objects;

CREATE POLICY "Installer can upload quote PDFs for assigned leads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lead-quotes'
  AND
  -- Installatore: ha accesso alla lead (assegnazione diretta O tramite company)
  EXISTS (
      SELECT 1 FROM lead_assignments la
      WHERE (storage.foldername(name))[1] = la.lead_id::text
      AND (
        -- Assegnazione diretta all'installatore
        la.installer_id IN (SELECT id FROM installers WHERE user_id = auth.uid())
        OR
        -- Lead assegnata alla company di cui l'utente è membro
        la.assigned_to_company_id IN (SELECT company_id FROM installers WHERE user_id = auth.uid() AND company_id IS NOT NULL)
      )
    )
);

-- Stessa logica per UPDATE (aggiornare/sostituire PDF)
DROP POLICY IF EXISTS "Installer can update quote PDFs for assigned leads" ON storage.objects;

CREATE POLICY "Installer can update quote PDFs for assigned leads"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lead-quotes'
  AND EXISTS (
    SELECT 1 FROM lead_assignments la
    WHERE (storage.foldername(name))[1] = la.lead_id::text
    AND (
      la.installer_id IN (SELECT id FROM installers WHERE user_id = auth.uid())
      OR la.assigned_to_company_id IN (SELECT company_id FROM installers WHERE user_id = auth.uid() AND company_id IS NOT NULL)
    )
  )
);
