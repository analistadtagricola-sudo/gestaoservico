-- =======================================================
-- 001_clientes.sql
-- Módulo de Clientes (Supabase / PostgreSQL)
-- =======================================================

CREATE TABLE IF NOT EXISTS clientes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_sankhya VARCHAR(50),
    tipo_pessoa VARCHAR(2) DEFAULT 'F',
    ativo BOOLEAN DEFAULT true,
    razao_social VARCHAR(250) NOT NULL,
    nome_fantasia VARCHAR(250),
    cpf_cnpj VARCHAR(20),
    inscricao_estadual VARCHAR(30),
    endereco VARCHAR(250),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    uf VARCHAR(10) NOT NULL DEFAULT 'RO',
    cep VARCHAR(10),
    telefone VARCHAR(20),
    celular VARCHAR(20),
    email VARCHAR(100),
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas de Segurança RLS (Row Level Security)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura total em clientes" ON clientes;
CREATE POLICY "Permitir leitura total em clientes" ON clientes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção total em clientes" ON clientes;
CREATE POLICY "Permitir inserção total em clientes" ON clientes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização total em clientes" ON clientes;
CREATE POLICY "Permitir atualização total em clientes" ON clientes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusão total em clientes" ON clientes;
CREATE POLICY "Permitir exclusão total em clientes" ON clientes FOR DELETE USING (true);
