-- =======================================================
-- 004_tecnicos.sql
-- Módulo de Técnicos (Supabase / PostgreSQL)
-- =======================================================

CREATE TABLE IF NOT EXISTS tecnicos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    apelido VARCHAR(50),
    telefone VARCHAR(20),
    email VARCHAR(100),
    cargo VARCHAR(50),
    cor_agenda VARCHAR(20) DEFAULT '#3B82F6',
    google_calendar_id VARCHAR(255),
    comissao_tecnico NUMERIC(5,2) DEFAULT 0,
    comissao_auxiliar NUMERIC(5,2) DEFAULT 0,
    valor_hora NUMERIC(10,2) DEFAULT 0,
    valor_km NUMERIC(10,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas de Segurança RLS
ALTER TABLE tecnicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura total em tecnicos" ON tecnicos;
CREATE POLICY "Permitir leitura total em tecnicos" ON tecnicos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção total em tecnicos" ON tecnicos;
CREATE POLICY "Permitir inserção total em tecnicos" ON tecnicos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização total em tecnicos" ON tecnicos;
CREATE POLICY "Permitir atualização total em tecnicos" ON tecnicos FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusão total em tecnicos" ON tecnicos;
CREATE POLICY "Permitir exclusão total em tecnicos" ON tecnicos FOR DELETE USING (true);
