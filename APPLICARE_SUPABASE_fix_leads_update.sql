-- =============================================================================
-- FIX AGGIORNAMENTO STATO LEAD (installer.daze.eu)
-- =============================================================================
-- Da eseguire su Supabase: SQL Editor → incolla tutto → Run
-- Risolve: lo stato "Chiusa Vinta" (o altro) selezionato dall'installatore
-- non viene salvato e la lead rimane "In lavorazione" anche per l'admin.
-- Causa: la policy RLS permetteva UPDATE solo con installer_id diretto;
-- per lead assegnate alla company (assigned_to_company_id) l'update veniva bloccato.
-- =============================================================================

DROP POLICY IF EXISTS "Installer can update assigned leads" ON leads;

CREATE POLICY "Installer can update assigned leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lead_assignments la
      JOIN installers i ON i.user_id = auth.uid()
      WHERE la.lead_id = leads.id
      AND (
        la.installer_id = i.id
        OR la.assigned_to_company_id = i.company_id
      )
    )
  );
