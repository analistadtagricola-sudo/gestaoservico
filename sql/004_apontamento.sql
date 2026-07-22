-- =======================================================
-- 004_apontamento.sql
-- Módulo de Apontamentos da OS (Supabase / PostgreSQL)
-- =======================================================

CREATE TABLE IF NOT EXISTS os_apontamentos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    os_id BIGINT REFERENCES ordens_servico(id) ON DELETE CASCADE,
    tecnico_id BIGINT REFERENCES tecnicos(id) ON DELETE SET NULL,
    data_apontamento DATE DEFAULT CURRENT_DATE,
    hora_inicio TIME,
    hora_fim TIME,
    horas_trabalhadas NUMERIC(6,2) DEFAULT 0,
    km_rodado NUMERIC(8,2) DEFAULT 0,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'SERVICO',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas de Segurança RLS
ALTER TABLE os_apontamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura total em os_apontamentos" ON os_apontamentos;
CREATE POLICY "Permitir leitura total em os_apontamentos" ON os_apontamentos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção total em os_apontamentos" ON os_apontamentos;
CREATE POLICY "Permitir inserção total em os_apontamentos" ON os_apontamentos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização total em os_apontamentos" ON os_apontamentos;
CREATE POLICY "Permitir atualização total em os_apontamentos" ON os_apontamentos FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusão total em os_apontamentos" ON os_apontamentos;
CREATE POLICY "Permitir exclusão total em os_apontamentos" ON os_apontamentos FOR DELETE USING (true);
