-- =======================================================
-- 000_schema_completo.sql
-- SCRIPT COMPLETO DO BANCO DE DADOS DA OFICINA (SUPABASE / POSTGRESQL)
-- Execute este script no SQL Editor do Supabase para criar todo o banco.
-- =======================================================

-- 1. CLIENTES
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

-- 2. TÉCNICOS
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

-- 3. VEÍCULOS E TIPOS DE ATENDIMENTO
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

-- 4. PLANOS DE MANUTENÇÃO E REVISÕES
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

-- 5. IMPLEMENTOS
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

-- 6. ORDENS DE SERVIÇO
CREATE TABLE IF NOT EXISTS ordens_servico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero_os VARCHAR(50) UNIQUE,
    status VARCHAR(50) DEFAULT 'ABERTA',
    cliente_id BIGINT REFERENCES clientes(id) ON DELETE SET NULL,
    implemento_id BIGINT REFERENCES implementos(id) ON DELETE SET NULL,
    tecnico_id BIGINT REFERENCES tecnicos(id) ON DELETE SET NULL,
    tipo_atendimento_id BIGINT REFERENCES tipos_atendimento(id) ON DELETE SET NULL,
    veiculo_id BIGINT REFERENCES veiculos(id) ON DELETE SET NULL,
    reclamacao TEXT,
    causa TEXT,
    solucao TEXT,
    horimetro_atual INT,
    data_abertura DATE DEFAULT CURRENT_DATE,
    data_fechamento DATE,
    previsao_entrega DATE,
    valor_pecas NUMERIC(10,2) DEFAULT 0,
    valor_servicos NUMERIC(10,2) DEFAULT 0,
    valor_desconto NUMERIC(10,2) DEFAULT 0,
    valor_total NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. APONTAMENTOS
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

-- 8. PEÇAS
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

-- 9. USUÁRIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    perfil VARCHAR(50) DEFAULT 'OPERADOR',
    ativo BOOLEAN DEFAULT true,
    senha VARCHAR(255) NOT NULL,
    ultimo_acesso VARCHAR(100),
    foto TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    perm_dashboard_consultar BOOLEAN DEFAULT true,
    perm_dashboard_editar BOOLEAN DEFAULT true,
    perm_dashboard_excluir BOOLEAN DEFAULT true,
    perm_clientes_consultar BOOLEAN DEFAULT true,
    perm_clientes_editar BOOLEAN DEFAULT true,
    perm_clientes_excluir BOOLEAN DEFAULT true,
    perm_implementos_consultar BOOLEAN DEFAULT true,
    perm_implementos_editar BOOLEAN DEFAULT true,
    perm_implementos_excluir BOOLEAN DEFAULT true,
    perm_os_consultar BOOLEAN DEFAULT true,
    perm_os_editar BOOLEAN DEFAULT true,
    perm_os_excluir BOOLEAN DEFAULT true,
    perm_agenda_consultar BOOLEAN DEFAULT true,
    perm_agenda_editar BOOLEAN DEFAULT true,
    perm_agenda_excluir BOOLEAN DEFAULT true,
    perm_financeiro_consultar BOOLEAN DEFAULT true,
    perm_financeiro_editar BOOLEAN DEFAULT true,
    perm_financeiro_excluir BOOLEAN DEFAULT true,
    perm_configuracoes_consultar BOOLEAN DEFAULT true,
    perm_configuracoes_editar BOOLEAN DEFAULT true,
    perm_configuracoes_excluir BOOLEAN DEFAULT true,
    perm_tecnicos_consultar BOOLEAN DEFAULT true,
    perm_tecnicos_editar BOOLEAN DEFAULT true,
    perm_tecnicos_excluir BOOLEAN DEFAULT true,
    perm_tipos_atendimento_consultar BOOLEAN DEFAULT true,
    perm_tipos_atendimento_editar BOOLEAN DEFAULT true,
    perm_tipos_atendimento_excluir BOOLEAN DEFAULT true,
    perm_comissoes_consultar BOOLEAN DEFAULT true,
    perm_comissoes_editar BOOLEAN DEFAULT true,
    perm_comissoes_excluir BOOLEAN DEFAULT true,
    permissoes JSONB
);

-- 10. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisoes_plano ENABLE ROW LEVEL SECURITY;
ALTER TABLE implementos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_apontamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- POLITICAS RLS PERMISSIVAS
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Permitir leitura total em %I" ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Permitir leitura total em %I" ON %I FOR SELECT USING (true);', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Permitir inserção total em %I" ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Permitir inserção total em %I" ON %I FOR INSERT WITH CHECK (true);', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Permitir atualização total em %I" ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Permitir atualização total em %I" ON %I FOR UPDATE USING (true);', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Permitir exclusão total em %I" ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Permitir exclusão total em %I" ON %I FOR DELETE USING (true);', tbl, tbl);
    END LOOP;
END $$;

-- USUÁRIO PADRÃO ADMIN
INSERT INTO usuarios (
    id, nome, usuario, email, perfil, ativo, senha, permissoes
) VALUES (
    'usr_1',
    'Administrador (Padrão)',
    'admin',
    'admin@oficina.com.br',
    'ADMINISTRADOR',
    true,
    '142536',
    '{"dashboard":{"consultar":true,"editar":true,"excluir":true},"clientes":{"consultar":true,"editar":true,"excluir":true},"implementos":{"consultar":true,"editar":true,"excluir":true},"os":{"consultar":true,"editar":true,"excluir":true},"agenda":{"consultar":true,"editar":true,"excluir":true},"financeiro":{"consultar":true,"editar":true,"excluir":true},"configuracoes":{"consultar":true,"editar":true,"excluir":true},"tecnicos":{"consultar":true,"editar":true,"excluir":true},"tipos_atendimento":{"consultar":true,"editar":true,"excluir":true},"comissoes":{"consultar":true,"editar":true,"excluir":true}}'
) ON CONFLICT (usuario) DO NOTHING;
