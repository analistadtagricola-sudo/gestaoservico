-- ============================================================================
-- SQL Schema: Controle de Chamados de Garantia e Vinculação com Ordem de Serviço
-- Sistema: GST Agrícola
-- ============================================================================

CREATE TABLE IF NOT EXISTS garantias_chamados (
    id VARCHAR(36) PRIMARY KEY,
    implemento_id INT NOT NULL,
    cliente_id INT NOT NULL,
    data_abertura DATE NOT NULL DEFAULT CURRENT_DATE,
    solicitante VARCHAR(150) NOT NULL,
    tipo_problema VARCHAR(100) NOT NULL, -- 'MECANICO', 'HIDRAULICO', 'ELETRICO', 'ESTRUTURAL', 'PECAS'
    descricao TEXT NOT NULL,
    horimetro DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ABERTO', -- 'ABERTO', 'EM_ANALISE', 'APROVADO_PARA_OS', 'CONVERTIDO_OS', 'REJEITADO'
    parecer_tecnico TEXT,
    ordem_servico_id INT NULL, -- ID da OS gerada após aprovação
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by implement & status
CREATE INDEX IF NOT EXISTS idx_garantias_chamados_impl ON garantias_chamados(implemento_id);
CREATE INDEX IF NOT EXISTS idx_garantias_chamados_status ON garantias_chamados(status);
