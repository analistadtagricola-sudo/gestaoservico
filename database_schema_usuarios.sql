-- ====================================================================
-- SCRIPT DE CRIAÇÃO DA TABELA DE USUÁRIOS E OPERADORES (MÓDULO USUÁRIOS)
-- MODELO RELACIONAL SEPARADO (SEM LISTAS SERIALIZADAS)
-- ====================================================================

-- 1. Criação do tipo enumerado para Perfil/Função do usuário
CREATE TYPE usuario_perfil AS ENUM (
    'ADMINISTRADOR', 
    'GERENTE', 
    'FATURISTA', 
    'TECNICO'
);

-- 2. Criação da tabela de Usuários com colunas de permissão explícitas (sem serialização de listas)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    perfil usuario_perfil NOT NULL DEFAULT 'TECNICO',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    senha VARCHAR(100) NOT NULL,
    ultimo_acesso VARCHAR(50),
    foto TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Permissões do Módulo Dashboard
    perm_dashboard_consultar BOOLEAN NOT NULL DEFAULT TRUE,
    perm_dashboard_editar BOOLEAN NOT NULL DEFAULT FALSE,
    perm_dashboard_excluir BOOLEAN NOT NULL DEFAULT FALSE,

    -- Permissões do Módulo Clientes
    perm_clientes_consultar BOOLEAN NOT NULL DEFAULT TRUE,
    perm_clientes_editar BOOLEAN NOT NULL DEFAULT TRUE,
    perm_clientes_excluir BOOLEAN NOT NULL DEFAULT FALSE,

    -- Permissões do Módulo Implementos
    perm_implementos_consultar BOOLEAN NOT NULL DEFAULT TRUE,
    perm_implementos_editar BOOLEAN NOT NULL DEFAULT TRUE,
    perm_implementos_excluir BOOLEAN NOT NULL DEFAULT FALSE,

    -- Permissões do Módulo Ordens de Serviço (OS)
    perm_os_consultar BOOLEAN NOT NULL DEFAULT TRUE,
    perm_os_editar BOOLEAN NOT NULL DEFAULT TRUE,
    perm_os_excluir BOOLEAN NOT NULL DEFAULT FALSE,

    -- Permissões do Módulo Agenda
    perm_agenda_consultar BOOLEAN NOT NULL DEFAULT TRUE,
    perm_agenda_editar BOOLEAN NOT NULL DEFAULT TRUE,
    perm_agenda_excluir BOOLEAN NOT NULL DEFAULT FALSE,

    -- Permissões do Módulo Financeiro
    perm_financeiro_consultar BOOLEAN NOT NULL DEFAULT TRUE,
    perm_financeiro_editar BOOLEAN NOT NULL DEFAULT FALSE,
    perm_financeiro_excluir BOOLEAN NOT NULL DEFAULT FALSE,

    -- Permissões do Módulo Configurações
    perm_configuracoes_consultar BOOLEAN NOT NULL DEFAULT FALSE,
    perm_configuracoes_editar BOOLEAN NOT NULL DEFAULT FALSE,
    perm_configuracoes_excluir BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Coluna de compatibilidade retroativa para JSON (Opcional)
    permissoes TEXT
);

-- 3. Inserção de Operadores Predefinidos (Seeds)

-- Administrador (Padrão) - Senha: 142536
INSERT INTO public.usuarios (
    id, nome, usuario, email, perfil, ativo, senha, ultimo_acesso,
    perm_dashboard_consultar, perm_dashboard_editar, perm_dashboard_excluir,
    perm_clientes_consultar, perm_clientes_editar, perm_clientes_excluir,
    perm_implementos_consultar, perm_implementos_editar, perm_implementos_excluir,
    perm_os_consultar, perm_os_editar, perm_os_excluir,
    perm_agenda_consultar, perm_agenda_editar, perm_agenda_excluir,
    perm_financeiro_consultar, perm_financeiro_editar, perm_financeiro_excluir,
    perm_configuracoes_consultar, perm_configuracoes_editar, perm_configuracoes_excluir
) VALUES (
    'usr_1', 'Administrador (Padrão)', 'admin', 'admin@oficina.com.br', 'ADMINISTRADOR', TRUE, '142536', 'Hoje, 10:35',
    TRUE, TRUE, TRUE, -- Dashboard
    TRUE, TRUE, TRUE, -- Clientes
    TRUE, TRUE, TRUE, -- Implementos
    TRUE, TRUE, TRUE, -- OS
    TRUE, TRUE, TRUE, -- Agenda
    TRUE, TRUE, TRUE, -- Financeiro
    TRUE, TRUE, TRUE  -- Configurações
) ON CONFLICT (usuario) DO UPDATE SET 
    senha = EXCLUDED.senha;

-- Amanda Costa (Faturamento)
INSERT INTO public.usuarios (
    id, nome, usuario, email, perfil, ativo, senha, ultimo_acesso,
    perm_dashboard_consultar, perm_dashboard_editar, perm_dashboard_excluir,
    perm_clientes_consultar, perm_clientes_editar, perm_clientes_excluir,
    perm_implementos_consultar, perm_implementos_editar, perm_implementos_excluir,
    perm_os_consultar, perm_os_editar, perm_os_excluir,
    perm_agenda_consultar, perm_agenda_editar, perm_agenda_excluir,
    perm_financeiro_consultar, perm_financeiro_editar, perm_financeiro_excluir,
    perm_configuracoes_consultar, perm_configuracoes_editar, perm_configuracoes_excluir
) VALUES (
    'usr_2', 'Amanda Costa', 'amanda.faturamento', 'faturamento@oficina.com.br', 'FATURISTA', TRUE, '123', 'Ontem, 16:40',
    TRUE, FALSE, FALSE, -- Dashboard
    TRUE, TRUE, FALSE,  -- Clientes
    TRUE, TRUE, FALSE,  -- Implementos
    TRUE, TRUE, FALSE,  -- OS
    TRUE, TRUE, FALSE,  -- Agenda
    TRUE, TRUE, FALSE,  -- Financeiro
    FALSE, FALSE, FALSE -- Configurações
) ON CONFLICT (usuario) DO NOTHING;

-- Marcos Souza (Mecânico Líder)
INSERT INTO public.usuarios (
    id, nome, usuario, email, perfil, ativo, senha, ultimo_acesso,
    perm_dashboard_consultar, perm_dashboard_editar, perm_dashboard_excluir,
    perm_clientes_consultar, perm_clientes_editar, perm_clientes_excluir,
    perm_implementos_consultar, perm_implementos_editar, perm_implementos_excluir,
    perm_os_consultar, perm_os_editar, perm_os_excluir,
    perm_agenda_consultar, perm_agenda_editar, perm_agenda_excluir,
    perm_financeiro_consultar, perm_financeiro_editar, perm_financeiro_excluir,
    perm_configuracoes_consultar, perm_configuracoes_editar, perm_configuracoes_excluir
) VALUES (
    'usr_3', 'Marcos Souza (Mecânico Líder)', 'marcos.mecanico', 'marcos.campo@oficina.com.br', 'TECNICO', TRUE, '123', 'Hoje, 07:15',
    TRUE, FALSE, FALSE, -- Dashboard
    TRUE, TRUE, FALSE,  -- Clientes
    TRUE, TRUE, FALSE,  -- Implementos
    TRUE, TRUE, FALSE,  -- OS
    TRUE, TRUE, FALSE,  -- Agenda
    TRUE, FALSE, FALSE, -- Financeiro
    FALSE, FALSE, FALSE -- Configurações
) ON CONFLICT (usuario) DO NOTHING;
