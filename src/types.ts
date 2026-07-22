/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Cliente {
  id?: number;
  codigo_sankhya?: string;
  tipo_pessoa?: "J" | "F";
  ativo?: boolean;
  razao_social: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  inscricao_estadual?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade: string;
  uf: string;
  telefone?: string;
  celular?: string;
  email?: string;
  observacao?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Implemento {
  id?: number;
  cliente_id?: number;
  fabricante: string;
  categoria: string;
  modelo: string;
  numero_serie: string;
  ano?: number;
  horimetro_atual?: number;
  data_entrega?: string;
  ativo?: boolean;
  observacao?: string;
  plano_id?: string;
  clientes?: {
    id: number;
    razao_social: string;
    cidade: string;
    uf: string;
  };
}

export interface Tecnico {
  id?: number;
  nome: string;
  apelido: string;
  cargo?: string;
  telefone?: string;
  email?: string;
  ativo?: boolean;
  cor_agenda?: string;
  google_calendar_id?: string;
  valor_hora?: number;
  valor_km?: number;
  comissao_tecnico?: number;
  comissao_auxiliar?: number;
}

export interface OrdemServico {
  id?: number;
  numero_os: string;
  status: "ABERTA" | "EM ATENDIMENTO" | "AGENDADA" | "AGUARDANDO" | "FINALIZADA" | "CANCELADA";
  cliente_id: number;
  implemento_id: number;
  data_abertura?: string;
  data_encerramento?: string;
  created_at?: string;
  tipo_atendimento?: string;
  prioridade?: "NORMAL" | "ALTA" | "URGENTE";
  reclamacao: string;
  observacao?: string;
  solicitante?: string;
  tecnico_id?: number;
  auxiliar_id?: number;
  data_atendimento?: string;
  data_termino?: string;
  hora_inicial?: string;
  hora_final?: string;
  servico_executado?: string;
  
  // Financial & finalization details
  horas_trabalhadas_total?: string;
  km_rodado_total?: number;
  km_inicial?: number;
  km_final?: number;
  valor_km_unitario?: number;
  valor_hora_unitario?: number;
  veiculo_usado?: string;
  valor_deslocamento?: number;
  valor_mao_obra?: number;
  valor_terceiros?: number;
  nota_fiscal?: string;
  num_nota_fiscal?: string;
  data_nota_fiscal?: string;
  valor_total?: number;
  horimetro?: number;
  horimetro_final?: number;
  revisao_executada?: string;

  // Custom commission overrides for variants of Entrega Técnica / custom values
  comissao_custom_opcao?: "automatico" | "personalizado";
  comissao_custom_valor_tecnico?: number;
  comissao_custom_valor_auxiliar?: number;

  // Internal debit database fields
  modo_debito_interno?: boolean;
  classificacao_atendimento_interno?: string;
  valor_referencia_servico?: number;
  base_calculo_referencia?: string;
  centro_custo_debito?: string;
  observacao_debito?: string;

  // Embedded relations from Supabase queries
  clientes?: {
    id: number;
    razao_social: string;
    cidade: string;
    uf: string;
    telefone?: string;
    celular?: string;
  };
  implementos?: {
    id: number;
    fabricante: string;
    categoria: string;
    modelo: string;
    numero_serie: string;
    ano?: number;
    data_entrega?: string;
    ativo?: boolean;
  };
}

export interface Apontamento {
  id?: number;
  os_id: number;
  tecnico_id: number;
  data_servico: string;
  hora_inicial: string;
  hora_final: string;
  horas_trabalhadas: number;
  km_rodado?: number;
  descricao_servico: string;
  tecnicos?: {
    id: number;
    nome: string;
    apelido: string;
  };
}

export interface PlanoManutencao {
  id: string;
  fabricante: string;
  modelo: string;
  garantia_meses: number;
  horimetro_base: number;
  ativo: boolean;
  observacao?: string;
  grupo?: string;
}

export interface PlanoRevisao {
  id_revisao?: string;
  id_plano: string;
  revisao_numero: number;
  horas_limite: number;
  meses_limite: number;
  descricao: string;
}
export interface Permission {
  consultar: boolean;
  editar: boolean;
  excluir: boolean;
}

export interface Permissions {
  dashboard: Permission;
  clientes: Permission;
  implementos: Permission;
  os: Permission;
  agenda: Permission;
  financeiro: Permission;
  configuracoes: Permission;
  tecnicos: Permission;
  tipos_atendimento: Permission;
  comissoes: Permission;
}

export interface Usuario {
  id: string;
  nome: string;
  usuario: string;
  email: string;
  perfil: "ADMINISTRADOR" | "GERENTE" | "FATURISTA" | "TECNICO";
  ativo: boolean;
  permissoes: Permissions;
  ultimo_acesso?: string;
  foto?: string;
  senha: string;
}

export interface Veiculo {
  id?: number;
  placa: string;
  modelo: string;
  marca?: string;
  ano?: number;
  ativo?: boolean;
  observacao?: string;
}

export interface TipoAtendimento {
  id?: number;
  nome: string;
  descricao?: string;
  ativo?: boolean;
}

