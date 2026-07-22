-- =======================================================
-- 003_ordem de servico.sql
-- Módulo de Ordens de Serviço (Supabase / PostgreSQL)
-- =======================================================

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

-- Políticas de Segurança RLS
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura total em ordens_servico" ON ordens_servico;
CREATE POLICY "Permitir leitura total em ordens_servico" ON ordens_servico FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção total em ordens_servico" ON ordens_servico;
CREATE POLICY "Permitir inserção total em ordens_servico" ON ordens_servico FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização total em ordens_servico" ON ordens_servico;
CREATE POLICY "Permitir atualização total em ordens_servico" ON ordens_servico FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusão total em ordens_servico" ON ordens_servico;
CREATE POLICY "Permitir exclusão total em ordens_servico" ON ordens_servico FOR DELETE USING (true);
