-- =======================================================
-- 007_plano de manutencao.sql
-- Módulo de Planos de Manutenção e Revisões (Supabase / PostgreSQL)
-- =======================================================

CREATE TABLE IF NOT EXISTS planos_manutencao (
    id VARCHAR(50) PRIMARY KEY,
    fabricante VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    garantia_meses INT DEFAULT 12,
    horimetro_base INT DEFAULT 50,
    ativo BOOLEAN DEFAULT true,
    observacao TEXT,
    grupo VARCHAR(100) DEFAULT 'TRATORES',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revisoes_plano (
    id_revisao VARCHAR(50) PRIMARY KEY,
    id_plano VARCHAR(50) REFERENCES planos_manutencao(id) ON DELETE CASCADE,
    revisao_numero INT NOT NULL,
    horas_limite NUMERIC(10,2) NOT NULL,
    meses_limite INT DEFAULT 6,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas de Segurança RLS
ALTER TABLE planos_manutencao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total em planos_manutencao" ON planos_manutencao;
CREATE POLICY "Permitir leitura total em planos_manutencao" ON planos_manutencao FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir inserção total em planos_manutencao" ON planos_manutencao;
CREATE POLICY "Permitir inserção total em planos_manutencao" ON planos_manutencao FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualização total em planos_manutencao" ON planos_manutencao;
CREATE POLICY "Permitir atualização total em planos_manutencao" ON planos_manutencao FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir exclusão total em planos_manutencao" ON planos_manutencao;
CREATE POLICY "Permitir exclusão total em planos_manutencao" ON planos_manutencao FOR DELETE USING (true);

ALTER TABLE revisoes_plano ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total em revisoes_plano" ON revisoes_plano;
CREATE POLICY "Permitir leitura total em revisoes_plano" ON revisoes_plano FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir inserção total em revisoes_plano" ON revisoes_plano;
CREATE POLICY "Permitir inserção total em revisoes_plano" ON revisoes_plano FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualização total em revisoes_plano" ON revisoes_plano;
CREATE POLICY "Permitir atualização total em revisoes_plano" ON revisoes_plano FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir exclusão total em revisoes_plano" ON revisoes_plano;
CREATE POLICY "Permitir exclusão total em revisoes_plano" ON revisoes_plano FOR DELETE USING (true);
