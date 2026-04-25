-- SPRINT GOD MODE REVAMP : Audit Logs & SLA Policies

-- 1. Table Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_can_read_audit" ON admin_audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'ADMIN' OR support_level = 'N4'))
);

-- (Inserts are handled by backend server actions using service_role)

-- 2. Table SLA Policies (Dynamic Configuration)
CREATE TABLE IF NOT EXISTS sla_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    priority TEXT NOT NULL UNIQUE,
    hours INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "everyone_reads_sla" ON sla_policies FOR SELECT USING (true);

CREATE POLICY "admin_manages_sla" ON sla_policies FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'ADMIN' OR support_level = 'N4'))
);

-- Seed defaults (from previous constants)
INSERT INTO sla_policies (priority, hours) VALUES
('critique', 2),
('haute', 8),
('normale', 48),
('basse', 120)
ON CONFLICT (priority) DO NOTHING;
