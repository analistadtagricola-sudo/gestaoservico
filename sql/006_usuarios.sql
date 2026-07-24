-- =======================================================
-- 006_usuarios.sql
-- Módulo de Usuários e Permissões (Supabase / PostgreSQL)
-- =======================================================

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

-- Políticas de Segurança RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura total em usuarios" ON usuarios;
CREATE POLICY "Permitir leitura total em usuarios" ON usuarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção total em usuarios" ON usuarios;
CREATE POLICY "Permitir inserção total em usuarios" ON usuarios FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização total em usuarios" ON usuarios;
CREATE POLICY "Permitir atualização total em usuarios" ON usuarios FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusão total em usuarios" ON usuarios;
CREATE POLICY "Permitir exclusão total em usuarios" ON usuarios FOR DELETE USING (true);

-- Inserir usuário administrador padrão de forma idempotente
INSERT INTO usuarios (
    id, nome, usuario, email, perfil, ativo, senha, permissoes
) 
SELECT 
    'usr_1',
    'Administrador (Padrão)',
    'admin',
    'admin@oficina.com.br',
    'ADMINISTRADOR',
    true,
    '142536',
    '{"dashboard":{"consultar":true,"editar":true,"excluir":true},"clientes":{"consultar":true,"editar":true,"excluir":true},"implementos":{"consultar":true,"editar":true,"excluir":true},"os":{"consultar":true,"editar":true,"excluir":true},"agenda":{"consultar":true,"editar":true,"excluir":true},"financeiro":{"consultar":true,"editar":true,"excluir":true},"configuracoes":{"consultar":true,"editar":true,"excluir":true},"tecnicos":{"consultar":true,"editar":true,"excluir":true},"tipos_atendimento":{"consultar":true,"editar":true,"excluir":true},"comissoes":{"consultar":true,"editar":true,"excluir":true}}'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id = 'usr_1' OR usuario = 'admin'
);
