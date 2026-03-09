-- ============================================================
-- SPRINT 22 : TABLE AUDIT LOGS
-- Traçabilité de toutes les actions effectuées sur un ticket.
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_audit_logs (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,          -- ex: 'created', 'status_changed', 'assigned', 'escalated', 'comment_added', 'resolved_cascade'
    details     JSONB DEFAULT '{}'::jsonb, -- ex: {"from": "nouveau", "to": "en_cours"} ou {"message": "..."}
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_audit_logs_ticket_id ON ticket_audit_logs(ticket_id);
CREATE INDEX idx_audit_logs_created_at ON ticket_audit_logs(created_at DESC);

-- RLS
ALTER TABLE ticket_audit_logs ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can read audit logs"
    ON ticket_audit_logs FOR SELECT
    TO authenticated
    USING (true);

-- Insertion pour tous les utilisateurs authentifiés (les actions sont insérées côté serveur)
CREATE POLICY "Authenticated users can insert audit logs"
    ON ticket_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);
