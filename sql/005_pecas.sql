-- =======================================================
-- 005_pecas.sql
-- Módulo de Peças e Peças de OS (Supabase / PostgreSQL)
-- =======================================================

CREATE TABLE IF NOT EXISTS pecas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    descricao VARCHAR(250) NOT NULL,
    unidade VARCHAR(10) DEFAULT 'UN',
    preco_custo NUMERIC(10,2) DEFAULT 0,
    preco_venda NUMERIC(10,2) DEFAULT 0,
    estoque_atual NUMERIC(10,2) DEFAULT 0,
    estoque_minimo NUMERIC(10,2) DEFAULT 0,
    categoria VARCHAR(100),
    marca VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os_pecas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    os_id BIGINT REFERENCES ordens_servico(id) ON DELETE CASCADE,
    peca_id BIGINT REFERENCES pecas(id) ON DELETE SET NULL,
    codigo_peca VARCHAR(50),
    descricao VARCHAR(250) NOT NULL,
    quantidade NUMERIC(10,2) NOT NULL DEFAULT 1,
    valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas de Segurança RLS
ALTER TABLE pecas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total em pecas" ON pecas;
CREATE POLICY "Permitir leitura total em pecas" ON pecas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir inserção total em pecas" ON pecas;
CREATE POLICY "Permitir inserção total em pecas" ON pecas FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualização total em pecas" ON pecas;
CREATE POLICY "Permitir atualização total em pecas" ON pecas FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir exclusão total em pecas" ON pecas;
CREATE POLICY "Permitir exclusão total em pecas" ON pecas FOR DELETE USING (true);

ALTER TABLE os_pecas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total em os_pecas" ON os_pecas;
CREATE POLICY "Permitir leitura total em os_pecas" ON os_pecas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir inserção total em os_pecas" ON os_pecas;
CREATE POLICY "Permitir inserção total em os_pecas" ON os_pecas FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualização total em os_pecas" ON os_pecas;
CREATE POLICY "Permitir atualização total em os_pecas" ON os_pecas FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir exclusão total em os_pecas" ON os_pecas;
CREATE POLICY "Permitir exclusão total em os_pecas" ON os_pecas FOR DELETE USING (true);
