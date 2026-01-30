-- Fix: RLS su leads - UPDATE per installatori
-- L'aggiornamento stato (es. "Chiusa Vinta") non veniva persistito perché la policy
-- "Installer can update assigned leads" richiede solo lead_assignments.installer_id = utente.
-- Per lead assegnate alla company (assigned_to_company_id) l'installer_id può essere null
-- o diverso; i membri della company devono poter aggiornare lo stato.
-- Questa migrazione estende la policy per consentire UPDATE anche quando la lead è
-- assegnata alla company di cui l'utente è membro.

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
