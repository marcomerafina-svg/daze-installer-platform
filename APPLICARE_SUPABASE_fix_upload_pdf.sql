-- =============================================================================
-- FIX UPLOAD PDF PREVENTIVI (installer.daze.eu)
-- =============================================================================
-- Da eseguire su Supabase: SQL Editor → incolla tutto → Run
-- Risolve: "Errore storage: new row violates row-level security policy"
-- quando un installatore carica un PDF preventivo nella pagina Dettaglio lead.
-- =============================================================================

DROP POLICY IF EXISTS "Installer can upload quote PDFs for assigned leads" ON storage.objects;

CREATE POLICY "Installer can upload quote PDFs for assigned leads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lead-quotes'
  AND
  EXISTS (
      SELECT 1 FROM lead_assignments la
      WHERE (storage.foldername(name))[1] = la.lead_id::text
      AND (
        la.installer_id IN (SELECT id FROM installers WHERE user_id = auth.uid())
        OR la.assigned_to_company_id IN (SELECT company_id FROM installers WHERE user_id = auth.uid() AND company_id IS NOT NULL)
      )
    )
);

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
