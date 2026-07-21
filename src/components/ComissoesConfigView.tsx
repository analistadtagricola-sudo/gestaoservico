import React, { useState, useEffect } from "react";
import { 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Coins, 
  HelpCircle,
  Wrench,
  Info,
  ShieldAlert,
  Settings,
  RotateCcw
} from "lucide-react";
import { API } from "../lib/api";
import { TipoAtendimento } from "../types";

interface RegraAtendimento {
  tipo: string;
  baseCalculo: "faturamento_total" | "mao_de_obra_deslocamento" | "horas_e_km_customizado" | "fixo";
  valorTecnico: number;
  valorHoraComissao?: number;
  valorKmComissao?: number;
  regraAuxiliar: "racha_50_50" | "sem_comissao" | "valor_customizado";
  valorAuxiliar: number;
}

interface RegraPadrao {
  baseCalculo: "faturamento_total" | "mao_de_obra_deslocamento" | "horas_e_km_customizado" | "fixo";
  percentualTecnico: number;
  valorHoraComissao?: number;
  valorKmComissao?: number;
  regraAuxiliar: "racha_50_50" | "sem_comissao" | "valor_customizado";
  valorAuxiliar: number;
}

interface ComissoesConfigViewProps {
  onNavigate?: (view: string) => void;
}

export const ComissoesConfigView: React.FC<ComissoesConfigViewProps> = ({ onNavigate }) => {
  const [regraPadrao, setRegraPadrao] = useState<RegraPadrao>({
    baseCalculo: "faturamento_total",
    percentualTecnico: 20,
    valorHoraComissao: 50,
    valorKmComissao: 1.50,
    regraAuxiliar: "racha_50_50",
    valorAuxiliar: 0
  });

  const [regrasAtendimento, setRegrasAtendimento] = useState<RegraAtendimento[]>([]);
  const [tiposAtendimento, setTiposAtendimento] = useState<TipoAtendimento[]>([]);
  
  // Cost Centers States
  const [centrosCusto, setCentrosCusto] = useState<string[]>([]);
  const [novoCentroCusto, setNovoCentroCusto] = useState("");

  // New specific rule form fields
  const [novoTipo, setNovoTipo] = useState("");
  const [novoBaseCalculo, setNovoBaseCalculo] = useState<"faturamento_total" | "mao_de_obra_deslocamento" | "horas_e_km_customizado" | "fixo">("faturamento_total");
  const [novoValorTecnico, setNovoValorTecnico] = useState("");
  const [novoValorHoraComissao, setNovoValorHoraComissao] = useState("");
  const [novoValorKmComissao, setNovoValorKmComissao] = useState("");
  const [novoRegraAuxiliar, setNovoRegraAuxiliar] = useState<"racha_50_50" | "sem_comissao" | "valor_customizado">("racha_50_50");
  const [novoValorAuxiliar, setNovoValorAuxiliar] = useState("");

  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const DEFAULT_REGRAS_ATENDIMENTO: RegraAtendimento[] = [
    { tipo: "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - PLAINA", baseCalculo: "fixo", valorTecnico: 350, regraAuxiliar: "racha_50_50", valorAuxiliar: 0 },
    { tipo: "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - GRADES", baseCalculo: "fixo", valorTecnico: 350, regraAuxiliar: "racha_50_50", valorAuxiliar: 0 },
    { tipo: "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - INOCULADOR/MONITORAMENTO", baseCalculo: "fixo", valorTecnico: 200, regraAuxiliar: "racha_50_50", valorAuxiliar: 0 },
    { tipo: "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - KUHN (SEM ASSISTENCIA FABRICA)", baseCalculo: "fixo", valorTecnico: 150, regraAuxiliar: "racha_50_50", valorAuxiliar: 0 },
    { tipo: "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - JORGE MAQ. (SEM ASSISTENCIA FABRICA)", baseCalculo: "fixo", valorTecnico: 150, regraAuxiliar: "racha_50_50", valorAuxiliar: 0 },
    { tipo: "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - IMPLEMENTOS TERCEIROS", baseCalculo: "fixo", valorTecnico: 150, regraAuxiliar: "racha_50_50", valorAuxiliar: 0 },
    { tipo: "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - DRONES", baseCalculo: "fixo", valorTecnico: 500, regraAuxiliar: "racha_50_50", valorAuxiliar: 0 },
    { tipo: "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - PLATAFORMA", baseCalculo: "fixo", valorTecnico: 350, regraAuxiliar: "racha_50_50", valorAuxiliar: 0 },
    { tipo: "MANUTENÇÃO CORRETIVA", baseCalculo: "horas_e_km_customizado", valorTecnico: 20, valorHoraComissao: 200, valorKmComissao: 2.50, regraAuxiliar: "racha_50_50", valorAuxiliar: 0 },
    { tipo: "MANUTENÇÃO PREVENTIVA", baseCalculo: "horas_e_km_customizado", valorTecnico: 20, valorHoraComissao: 200, valorKmComissao: 2.50, regraAuxiliar: "racha_50_50", valorAuxiliar: 0 },
    { tipo: "GARANTIA", baseCalculo: "horas_e_km_customizado", valorTecnico: 20, valorHoraComissao: 200, valorKmComissao: 2.50, regraAuxiliar: "racha_50_50", valorAuxiliar: 0 },
  ];

  useEffect(() => {
    // Load config
    const savedConfig = localStorage.getItem("gst_comissoes_config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.regraPadrao) {
          const migratedRegraPadrao = {
            ...parsed.regraPadrao,
            baseCalculo: parsed.regraPadrao.baseCalculo
          };
          setRegraPadrao(migratedRegraPadrao);
        }
        
        // Handle migration from old format
        if (parsed.regrasEntrega && (!parsed.regrasAtendimento || parsed.regrasAtendimento.length === 0)) {
          const migrated = parsed.regrasEntrega.map((r: any) => ({
            tipo: r.tipo,
            baseCalculo: "fixo" as const,
            valorTecnico: parseFloat(r.valor) || 0,
            regraAuxiliar: "racha_50_50" as const,
            valorAuxiliar: 0
          }));
          setRegrasAtendimento(migrated);
        } else if (parsed.regrasAtendimento && parsed.regrasAtendimento.length > 0) {
          const loaded = parsed.regrasAtendimento.map((r: any) => ({
            ...r,
            baseCalculo: r.baseCalculo
          }));
          // Merge defaults with loaded rules so standard rules are always present alongside custom user rules
          const merged = [...DEFAULT_REGRAS_ATENDIMENTO];
          loaded.forEach((userRule: any) => {
            const idx = merged.findIndex(r => r.tipo.toLowerCase().trim() === userRule.tipo.toLowerCase().trim());
            if (idx >= 0) {
              merged[idx] = userRule;
            } else {
              merged.push(userRule);
            }
          });
          setRegrasAtendimento(merged);
        } else {
          setRegrasAtendimento(DEFAULT_REGRAS_ATENDIMENTO);
        }
      } catch (e) {
        setRegrasAtendimento(DEFAULT_REGRAS_ATENDIMENTO);
      }
    } else {
      setRegrasAtendimento(DEFAULT_REGRAS_ATENDIMENTO);
    }

    // Load Cost Centers
    const savedCentros = localStorage.getItem("gst_centros_custo");
    if (savedCentros) {
      try {
        setCentrosCusto(JSON.parse(savedCentros));
      } catch (e) {
        // ignore
      }
    } else {
      const defaultCentros = [
        "Oficina",
        "PDI / Entrega Técnica",
        "Pós-Vendas",
        "Comercial / Vendas",
        "Frota / Veículos",
        "Administrativo",
        "Garantia Fabricante"
      ];
      setCentrosCusto(defaultCentros);
      localStorage.setItem("gst_centros_custo", JSON.stringify(defaultCentros));
    }

    // Load active atendimento types from API
    const fetchTipos = async () => {
      try {
        const list = await API.tiposAtendimento.listar();
        setTiposAtendimento(list.filter(t => t.ativo !== false));
      } catch (e) {
        console.error("Erro ao listar tipos de atendimento:", e);
      }
    };
    fetchTipos();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddAtendimentoRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTipo.trim()) {
      showToast("Selecione ou digite um Tipo de Atendimento.", "error");
      return;
    }
    if (regrasAtendimento.some(r => r.tipo.toLowerCase().trim() === novoTipo.toLowerCase().trim())) {
      showToast("Já existe uma regra cadastrada para este Tipo de Atendimento.", "error");
      return;
    }

    const valTec = parseFloat(novoValorTecnico) || 0;
    const valAux = parseFloat(novoValorAuxiliar) || 0;
    const valHr = parseFloat(novoValorHoraComissao) || 0;
    const valKm = parseFloat(novoValorKmComissao) || 0;

    const novaRegra: RegraAtendimento = {
      tipo: novoTipo.trim(),
      baseCalculo: novoBaseCalculo,
      valorTecnico: valTec,
      valorHoraComissao: valHr,
      valorKmComissao: valKm,
      regraAuxiliar: novoRegraAuxiliar,
      valorAuxiliar: valAux
    };

    setRegrasAtendimento([...regrasAtendimento, novaRegra]);
    
    // Reset state
    setNovoTipo("");
    setNovoBaseCalculo("faturamento_total");
    setNovoValorTecnico("");
    setNovoValorHoraComissao("");
    setNovoValorKmComissao("");
    setNovoRegraAuxiliar("racha_50_50");
    setNovoValorAuxiliar("");
    
    showToast("Regra específica adicionada com sucesso!", "success");
  };

  const handleRemoveAtendimentoRule = (index: number) => {
    setRegrasAtendimento(regrasAtendimento.filter((_, i) => i !== index));
    showToast("Regra removida da tabela.", "success");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      regraPadrao,
      regrasAtendimento
    };
    localStorage.setItem("gst_comissoes_config", JSON.stringify(config));
    localStorage.setItem("gst_centros_custo", JSON.stringify(centrosCusto));
    
    // Dispatch events to update comissoes list if any other views are open
    window.dispatchEvent(new Event("comissoes_config_updated"));
    window.dispatchEvent(new Event("centros_custo_updated"));
    showToast("Configurações gerais salvas com sucesso!");
  };

  const handleAddCentroCusto = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = novoCentroCusto.trim();
    if (!clean) return;
    if (centrosCusto.some(c => c.toLowerCase() === clean.toLowerCase())) {
      showToast("Este Centro de Custo já está cadastrado.", "error");
      return;
    }
    const updated = [...centrosCusto, clean];
    setCentrosCusto(updated);
    setNovoCentroCusto("");
    localStorage.setItem("gst_centros_custo", JSON.stringify(updated));
    showToast("Centro de Custo adicionado!", "success");
    window.dispatchEvent(new Event("centros_custo_updated"));
  };

  const handleRemoveCentroCusto = (item: string) => {
    const updated = centrosCusto.filter(c => c !== item);
    setCentrosCusto(updated);
    localStorage.setItem("gst_centros_custo", JSON.stringify(updated));
    showToast("Centro de Custo removido com sucesso.", "success");
    window.dispatchEvent(new Event("centros_custo_updated"));
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl font-bold text-xs flex items-center gap-2 animate-fade ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">
          <p className="font-bold uppercase tracking-wider mb-1">Acesso Restrito & Painel de Privacidade</p>
          <p>Esta tela é de acesso exclusivo de administradores. Valores e regras de comissionamento configurados aqui serão calculados e exibidos somente na aba privada de Comissões, sem expor os ganhos nas Ordens de Serviço gerais dos técnicos.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* SECÇÃO 1: REGRA PADRÃO (VENDAS / FATURADO) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-150 bg-gray-50/50">
            <h2 className="font-display text-base font-extrabold uppercase text-gray-800 flex items-center gap-2">
              <Coins className="text-brand-red w-5 h-5" />
              Regra Padrão de Comissionamento (Vendas / Faturado)
            </h2>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">
              Aplicada automaticamente para ordens de serviço faturadas que não se enquadram em regras específicas.
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">Base de Cálculo</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 bg-white"
                  value={regraPadrao.baseCalculo}
                  onChange={(e) => setRegraPadrao({
                    ...regraPadrao, 
                    baseCalculo: e.target.value as "faturamento_total" | "mao_de_obra_deslocamento" | "horas_e_km_customizado" | "fixo"
                  })}
                >
                  <option value="mao_de_obra_deslocamento">Mão de Obra + Deslocamento (Exclui Terceiros e Peças)</option>
                  <option value="faturamento_total">Mão de Obra + Deslocamento (Padrão Vendas)</option>
                  <option value="horas_e_km_customizado">Horas e KM Reduzidos (Comissão s/ Valor Menor)</option>
                  <option value="fixo">Valor Fixo (R$)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
                  {regraPadrao.baseCalculo === "fixo" ? "Valor Técnico (R$)" : "Percentual Técnico (%)"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                    {regraPadrao.baseCalculo === "fixo" ? "R$" : "%"}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs font-bold text-gray-800"
                    value={regraPadrao.percentualTecnico}
                    onChange={(e) => setRegraPadrao({
                      ...regraPadrao,
                      percentualTecnico: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">Regra de Divisão com Auxiliar</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 bg-white"
                  value={regraPadrao.regraAuxiliar}
                  onChange={(e) => setRegraPadrao({
                    ...regraPadrao,
                    regraAuxiliar: e.target.value as "racha_50_50" | "sem_comissao" | "valor_customizado"
                  })}
                >
                  <option value="racha_50_50">Racha 50% / 50% com Técnico (Padrão)</option>
                  <option value="sem_comissao">Sem Comissão (Técnico recebe 100%)</option>
                  <option value="valor_customizado">Taxa/Percentual Customizado para Auxiliar</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
                  {regraPadrao.regraAuxiliar === "valor_customizado" ? (
                    regraPadrao.baseCalculo === "fixo" ? "Valor Auxiliar (R$)" : "Percentual Auxiliar (%)"
                  ) : "Status de Divisão"}
                </label>
                {regraPadrao.regraAuxiliar === "valor_customizado" ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                      {regraPadrao.baseCalculo === "fixo" ? "R$" : "%"}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs font-bold text-gray-800"
                      value={regraPadrao.valorAuxiliar}
                      onChange={(e) => setRegraPadrao({
                        ...regraPadrao,
                        valorAuxiliar: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>
                ) : (
                  <div className="w-full bg-gray-50 border border-gray-150 rounded-lg px-3 py-2.5 text-xs font-bold text-gray-400">
                    {regraPadrao.regraAuxiliar === "racha_50_50" ? "Divide comissão em 50/50" : "Auxiliar não pontua"}
                  </div>
                )}
              </div>
            </div>

            {regraPadrao.baseCalculo === "horas_e_km_customizado" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 border border-amber-200 rounded-xl p-4 animate-fade">
                <div>
                  <label className="text-[10px] font-black text-amber-800 uppercase tracking-wider block mb-1.5">Valor da Hora para Comissão (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="50.00"
                      className="w-full border border-amber-200 focus:border-amber-400 rounded-lg pl-8 pr-3 py-2 text-xs font-bold text-amber-950 bg-white"
                      value={regraPadrao.valorHoraComissao || ""}
                      onChange={(e) => setRegraPadrao({
                        ...regraPadrao,
                        valorHoraComissao: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>
                  <span className="text-[9px] text-amber-700/80 font-medium mt-1 block">
                    Utilizado como base no lugar do valor cheio faturado ao cliente.
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-black text-amber-800 uppercase tracking-wider block mb-1.5">Valor do KM Rodado para Comissão (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="1.50"
                      className="w-full border border-amber-200 focus:border-amber-400 rounded-lg pl-8 pr-3 py-2 text-xs font-bold text-amber-950 bg-white"
                      value={regraPadrao.valorKmComissao || ""}
                      onChange={(e) => setRegraPadrao({
                        ...regraPadrao,
                        valorKmComissao: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>
                  <span className="text-[9px] text-amber-700/80 font-medium mt-1 block">
                    Utilizado como base para deslocamento no lugar do valor cheio faturado ao cliente.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECÇÃO 2: TABELA DE REGRAS ESPECÍFICAS POR TIPO DE ATENDIMENTO */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-150 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-extrabold uppercase text-gray-800 flex items-center gap-2">
                <Wrench className="text-brand-red w-5 h-5" />
                Tabela de Valores de Comissionamento (Regras Específicas / Débito Interno)
              </h2>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">
                Configure regras sob medida para Débitos Internos, Garantias de Fábrica, Entregas Técnicas de Fábrica, etc.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const merged = [...DEFAULT_REGRAS_ATENDIMENTO];
                regrasAtendimento.forEach(userRule => {
                  if (!merged.some(r => r.tipo.toLowerCase().trim() === userRule.tipo.toLowerCase().trim())) {
                    merged.push(userRule);
                  }
                });
                setRegrasAtendimento(merged);
                const currentConfig = JSON.parse(localStorage.getItem("gst_comissoes_config") || "{}");
                localStorage.setItem("gst_comissoes_config", JSON.stringify({
                  ...currentConfig,
                  regraPadrao,
                  regrasAtendimento: merged
                }));
                window.dispatchEvent(new Event("comissoes_config_updated"));
                showToast("Tabela padrão de Débito Interno e Entregas Técnicas restaurada e salva com sucesso!", "success");
              }}
              className="px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg shadow-sm transition-all flex items-center gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-brand-red" />
              Restaurar Regras Padrão
            </button>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Form to Add New Atendimento Rule */}
            <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-brand-red" /> Cadastrar Regra Específica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Tipo Atendimento Dropdown/Input combo */}
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Tipo de Atendimento
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs font-bold text-gray-800 bg-white"
                      value={novoTipo}
                      onChange={(e) => setNovoTipo(e.target.value)}
                    >
                      <option value="">-- Selecionar Tipo --</option>
                      {tiposAtendimento.map((t) => (
                        <option key={t.id} value={t.nome}>{t.nome}</option>
                      ))}
                    </select>
                    <input
                      placeholder="Outro..."
                      className="w-1/3 border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold text-gray-800 bg-white placeholder-gray-400"
                      value={novoTipo}
                      onChange={(e) => setNovoTipo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Base de calculo */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Base Cálculo</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs font-bold text-gray-800 bg-white"
                    value={novoBaseCalculo}
                    onChange={(e) => setNovoBaseCalculo(e.target.value as any)}
                  >
                    <option value="faturamento_total">Faturamento Total</option>
                    <option value="mao_de_obra_deslocamento">M.O. + Deslocamento</option>
                    <option value="horas_e_km_customizado">Horas e KM Reduzidos</option>
                    <option value="fixo">Valor Fixo (R$)</option>
                  </select>
                </div>

                {/* Valor Tecnico */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    {novoBaseCalculo === "fixo" ? "Técnico (R$)" : "Técnico (%)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={novoBaseCalculo === "fixo" ? "150,00" : (novoBaseCalculo === "horas_e_km_customizado" ? "100" : "20")}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-800"
                    value={novoValorTecnico}
                    onChange={(e) => setNovoValorTecnico(e.target.value)}
                  />
                </div>

                {/* Regra Auxiliar */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Relação Auxiliar</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs font-bold text-gray-800 bg-white"
                    value={novoRegraAuxiliar}
                    onChange={(e) => setNovoRegraAuxiliar(e.target.value as any)}
                  >
                    <option value="racha_50_50">Racha 50% / 50%</option>
                    <option value="sem_comissao">Sem Comissão</option>
                    <option value="valor_customizado">Customizado (R$ ou %)</option>
                  </select>
                </div>

                {/* Valor Auxiliar */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    {novoRegraAuxiliar === "valor_customizado" ? (
                      novoBaseCalculo === "fixo" ? "Auxiliar (R$)" : "Auxiliar (%)"
                    ) : "Valor Auxiliar"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={novoRegraAuxiliar !== "valor_customizado"}
                    placeholder={novoRegraAuxiliar === "valor_customizado" ? (novoBaseCalculo === "fixo" ? "75,00" : "10") : "Desabilitado"}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-800 disabled:bg-gray-150 disabled:text-gray-400"
                    value={novoValorAuxiliar}
                    onChange={(e) => setNovoValorAuxiliar(e.target.value)}
                  />
                </div>

                {/* Add button */}
                <div className="md:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddAtendimentoRule}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded-lg py-2 flex items-center justify-center font-bold text-xs shadow-sm transition-all h-[36px]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Conditional custom fields for Specific Rule */}
              {novoBaseCalculo === "horas_e_km_customizado" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 border border-amber-200 rounded-xl p-4 animate-fade mt-2">
                  <div>
                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Valor da Hora para Comissão (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="50.00"
                        className="w-full border border-amber-200 focus:border-amber-400 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-amber-950 bg-white"
                        value={novoValorHoraComissao}
                        onChange={(e) => setNovoValorHoraComissao(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Valor do KM Rodado para Comissão (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="1.50"
                        className="w-full border border-amber-200 focus:border-amber-400 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-amber-950 bg-white"
                        value={novoValorKmComissao}
                        onChange={(e) => setNovoValorKmComissao(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* List / Table of Specific Rules */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3 text-left">Tipo de Atendimento</th>
                    <th className="p-3 text-left">Base de Cálculo</th>
                    <th className="p-3 text-right">Comissão Técnico</th>
                    <th className="p-3 text-left">Comissão Auxiliar</th>
                    <th className="p-3 w-32 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span>Ações</span>
                        {onNavigate && (
                          <button 
                            type="button" 
                            onClick={() => onNavigate("tipos_atendimento")}
                            className="flex items-center justify-center gap-1 text-brand-red hover:underline cursor-pointer bg-brand-red/5 px-1.5 py-0.5 rounded transition-colors"
                            title="Cadastrar novos tipos de atendimento"
                          >
                            <Settings className="w-3 h-3" /> <span>Editar Tipos</span>
                          </button>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {regrasAtendimento.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 font-semibold">
                        Nenhuma regra de atendimento específica cadastrada. O sistema usará a regra padrão de faturamento de 20% para todas.
                      </td>
                    </tr>
                  ) : (
                    regrasAtendimento.map((regra, index) => {
                      // Human explanation
                      let labelAux = "";
                      if (regra.regraAuxiliar === "racha_50_50") {
                        labelAux = "Racha 50% da comissão do Técnico";
                      } else if (regra.regraAuxiliar === "sem_comissao") {
                        labelAux = "Não comissionado";
                      } else {
                        labelAux = regra.baseCalculo === "fixo" 
                          ? `R$ ${Number(regra.valorAuxiliar).toFixed(2)} Fixo` 
                          : `${regra.valorAuxiliar}% da base`;
                      }

                      return (
                        <tr key={index} className="hover:bg-gray-50/50">
                          <td className="p-3 text-gray-900 font-bold uppercase">{regra.tipo}</td>
                          <td className="p-3 text-gray-600 font-semibold">
                            {regra.baseCalculo === "faturamento_total" && "Faturamento Total (O.S. Total)"}
                            {regra.baseCalculo === "mao_de_obra_deslocamento" && "Mão de Obra + Deslocamento"}
                            {regra.baseCalculo === "horas_e_km_customizado" && (
                              <div className="flex flex-col">
                                <span>Horas e KM Reduzidos</span>
                                <span className="text-[10px] text-amber-600 font-mono">
                                  R$ {Number(regra.valorHoraComissao || 0).toFixed(2)}/h + R$ {Number(regra.valorKmComissao || 0).toFixed(2)}/km
                                </span>
                              </div>
                            )}
                            {regra.baseCalculo === "fixo" && "Taxa Fixa Independente"}
                          </td>
                          <td className="p-3 text-gray-800 text-right font-mono font-bold">
                            {regra.baseCalculo === "fixo" 
                              ? `R$ ${Number(regra.valorTecnico).toFixed(2)}` 
                              : `${regra.valorTecnico}%`}
                          </td>
                          <td className="p-3 text-gray-700 font-medium">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                              <Info className="w-3 h-3 text-gray-500" />
                              {labelAux}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button 
                              type="button" 
                              onClick={() => handleRemoveAtendimentoRule(index)} 
                              className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition-all"
                              title="Remover Regra"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* SECÇÃO 3: CADASTRO DE CENTROS DE CUSTO */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-150 bg-gray-50/50">
            <h2 className="font-display text-base font-extrabold uppercase text-gray-800 flex items-center gap-2">
              <Settings className="text-brand-red w-5 h-5" />
              Cadastro de Centros de Custo (Débito Interno)
            </h2>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">
              Defina e gerencie os centros de custo disponíveis para seleção nas Ordens de Serviço de Débito Interno.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60 max-w-xl">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-2">Novo Centro de Custo</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Pós-Vendas, Oficina Filial, Frota..."
                  value={novoCentroCusto}
                  onChange={(e) => setNovoCentroCusto(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:border-brand-red focus:outline-none bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddCentroCusto}
                  className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-3">Centros de Custo Ativos</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {centrosCusto.length === 0 ? (
                  <div className="col-span-full p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    Nenhum centro de custo cadastrado. Adicione um acima.
                  </div>
                ) : (
                  centrosCusto.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100/75 rounded-lg border border-gray-150 transition-all"
                    >
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wide truncate max-w-[180px]" title={item}>
                        {item}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCentroCusto(item)}
                        className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition-all"
                        title="Excluir Centro de Custo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Global Save Action */}
        <div className="flex items-center justify-between p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-[11px] text-gray-500 font-semibold leading-relaxed max-w-lg">
            As alterações acima são aplicadas em tempo real aos cálculos das comissões de todas as ordens de serviço finalizadas no sistema. Certifique-se de salvar para persistir suas modificações de forma permanente.
          </p>
          <button
            type="submit"
            className="btn bg-brand-red hover:bg-brand-red-dark text-white text-xs font-black uppercase tracking-wider h-11 px-8 rounded-lg shadow-md flex items-center gap-2"
          >
            Salvar Configurações Gerais
          </button>
        </div>

      </form>
    </div>
  );
};
