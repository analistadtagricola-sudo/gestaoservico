-- =======================================================
-- 008_veiculos e tipo servico.sql
-- Módulo de Veículos e Tipos de Atendimento (Supabase / PostgreSQL)
-- =======================================================

CREATE TABLE IF NOT EXISTS veiculos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    placa VARCHAR(20) UNIQUE NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    marca VARCHAR(100),
    ano INT,
    ativo BOOLEAN DEFAULT true,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tipos_atendimento (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas de Segurança RLS
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total em veiculos" ON veiculos;
CREATE POLICY "Permitir leitura total em veiculos" ON veiculos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir inserção total em veiculos" ON veiculos;
CREATE POLICY "Permitir inserção total em veiculos" ON veiculos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualização total em veiculos" ON veiculos;
CREATE POLICY "Permitir atualização total em veiculos" ON veiculos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir exclusão total em veiculos" ON veiculos;
CREATE POLICY "Permitir exclusão total em veiculos" ON veiculos FOR DELETE USING (true);

ALTER TABLE tipos_atendimento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total em tipos_atendimento" ON tipos_atendimento;
CREATE POLICY "Permitir leitura total em tipos_atendimento" ON tipos_atendimento FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir inserção total em tipos_atendimento" ON tipos_atendimento;
CREATE POLICY "Permitir inserção total em tipos_atendimento" ON tipos_atendimento FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualização total em tipos_atendimento" ON tipos_atendimento;
CREATE POLICY "Permitir atualização total em tipos_atendimento" ON tipos_atendimento FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir exclusão total em tipos_atendimento" ON tipos_atendimento;
CREATE POLICY "Permitir exclusão total em tipos_atendimento" ON tipos_atendimento FOR DELETE USING (true);
