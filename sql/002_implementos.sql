-- =======================================================
-- 002_implementos.sql
-- Módulo de Implementos (Supabase / PostgreSQL)
-- =======================================================

CREATE TABLE IF NOT EXISTS implementos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cliente_id BIGINT REFERENCES clientes(id) ON DELETE SET NULL,
    fabricante VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    categoria VARCHAR(100),
    numero_serie VARCHAR(100),
    chassis VARCHAR(100),
    ano_fabricacao INT,
    plano_id VARCHAR(50),
    horimetro INT DEFAULT 0,
    horimetro_inicial INT DEFAULT 0,
    observacoes TEXT,
    status VARCHAR(50) DEFAULT 'ATIVO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas de Segurança RLS
ALTER TABLE implementos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura total em implementos" ON implementos;
CREATE POLICY "Permitir leitura total em implementos" ON implementos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção total em implementos" ON implementos;
CREATE POLICY "Permitir inserção total em implementos" ON implementos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização total em implementos" ON implementos;
CREATE POLICY "Permitir atualização total em implementos" ON implementos FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusão total em implementos" ON implementos;
CREATE POLICY "Permitir exclusão total em implementos" ON implementos FOR DELETE USING (true);
