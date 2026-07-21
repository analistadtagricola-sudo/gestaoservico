/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  FileText, 
  Printer, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Wrench, 
  Clock, 
  Truck,
  Download,
  AlertTriangle,
  Users,
  Briefcase,
  User,
  LayoutGrid
} from "lucide-react";
import { OrdemServico, Tecnico, Cliente, Implemento, Apontamento } from "../types";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";

interface RelatoriosViewProps {
  ordens: OrdemServico[];
  tecnicos: Tecnico[];
  clientes: Cliente[];
  implementos: Implemento[];
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  ordens,
  tecnicos,
  clientes,
  implementos
}) => {
  const [selectedOSId, setSelectedOSId] = useState<string>("");
  const [printMode, setPrintMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"geral" | "produtividade" | "clientes" | "debito_interno">("geral");
  const [reportSearch, setReportSearch] = useState("");
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([]);

  // Load pointing hours from database and localstorage
  useEffect(() => {
    const fetchApontamentos = async () => {
      try {
        const { data, error } = await supabase.from("os_apontamentos").select("*");
        if (error) throw error;

        const dbItems: Apontamento[] = (data || []).map(item => ({
          id: item.id,
          os_id: item.os_id,
          tecnico_id: item.tecnico_id,
          data_servico: item.data,
          hora_inicial: item.hora_inicio,
          hora_final: item.hora_fim,
          descricao_servico: item.descricao || item.servico || "",
          horas_trabalhadas: Number(item.horas_trabalhadas || 0),
          km_rodado: Number(item.km_rodado || 0)
        }));

        const saved = localStorage.getItem("gst_apontamentos");
        let localItems: Apontamento[] = [];
        if (saved) {
          try {
            const list = JSON.parse(saved);
            localItems = list.filter((a: any) => !dbItems.find(db => String(db.id) === String(a.id)));
          } catch (e) {}
        }

        setApontamentos([...dbItems, ...localItems]);
      } catch (err) {
        console.warn("Could not fetch from database, loading from localStorage only:", err);
        const saved = localStorage.getItem("gst_apontamentos");
        if (saved) {
          try {
            setApontamentos(JSON.parse(saved));
          } catch (e) {}
        }
      }
    };

    fetchApontamentos();
  }, [ordens]);

  // Stats Calculations
  const finalizadas = ordens.filter(o => o.status === "FINALIZADA");

  // Load commissions config for internal debit calculations
  const [comissoesConfig, setComissoesConfig] = useState<any>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gst_comissoes_config");
      if (saved) {
        setComissoesConfig(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not load comissoes config", e);
    }
  }, []);

  const getValorDebitoInterno = (o: OrdemServico) => {
    if (!o.modo_debito_interno) return 0;
    if (o.valor_referencia_servico && o.valor_referencia_servico > 0) {
      return o.valor_referencia_servico;
    }
    
    try {
      if (comissoesConfig) {
        const normalizeStr = (str: string | undefined | null) => {
          if (!str) return "";
          return String(str)
            .toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ");
        };
        const normTipoAtendimento = normalizeStr(o.tipo_atendimento);
        let matchedRule = comissoesConfig.regrasAtendimento?.find((r: any) => normalizeStr(r.tipo) === normTipoAtendimento);
        if (!matchedRule && normTipoAtendimento) {
          matchedRule = comissoesConfig.regrasAtendimento?.find((r: any) => {
            const rNorm = normalizeStr(r.tipo);
            return normTipoAtendimento.includes(rNorm) || rNorm.includes(normTipoAtendimento);
          });
        }
        const rule = matchedRule || comissoesConfig.regraPadrao;
        if (rule) {
          if (rule.baseCalculo === "fixo") {
            return 0;
          } else {
            const hRate = Number(rule.valorHoraComissao ?? 50);
            const kRate = Number(rule.valorKmComissao ?? 1.50);
            const hrs = parseFloat(o.horas_trabalhadas_total || "0") || 0;
            const kms = Number(o.km_rodado_total || 0);
            return (hrs * hRate) + (kms * kRate);
          }
        }
      }
    } catch (e) {
      console.warn("Error calculating fallback internal debit value", e);
    }
    
    const hrs = parseFloat(o.horas_trabalhadas_total || "0") || 0;
    const kms = Number(o.km_rodado_total || 0);
    return (hrs * 50) + (kms * 1.50);
  };

  const internalDebits = finalizadas.filter(o => o.modo_debito_interno);
  const totalDebitoInterno = internalDebits.reduce((sum, o) => sum + getValorDebitoInterno(o), 0);
  const totalHorasDebitoInterno = internalDebits.reduce((sum, o) => sum + (parseFloat(o.horas_trabalhadas_total || "0") || 0), 0);
  const totalKmDebitoInterno = internalDebits.reduce((sum, o) => sum + (o.km_rodado_total || 0), 0);
  const qtdDebitoInterno = internalDebits.length;

  const getDebitoPorCentroCusto = () => {
    const map: Record<string, number> = {};
    internalDebits.forEach(o => {
      const centro = o.centro_custo_debito || "Não Definido";
      map[centro] = (map[centro] || 0) + getValorDebitoInterno(o);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const getDebitoPorTipoAtendimento = () => {
    const map: Record<string, number> = {};
    internalDebits.forEach(o => {
      const tipo = o.tipo_atendimento || "OUTRO";
      map[tipo] = (map[tipo] || 0) + getValorDebitoInterno(o);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const getDebitoPorTecnico = () => {
    const map: Record<string, number> = {};
    internalDebits.forEach(o => {
      const tech = tecnicos.find(t => t.id === o.tecnico_id);
      const name = tech?.apelido || tech?.nome || "Indefinido";
      map[name] = (map[name] || 0) + getValorDebitoInterno(o);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };
  
  const faturamentoTotal = finalizadas.reduce((sum, o) => sum + (o.valor_total || 0), 0);
  const faturamentoPecas = finalizadas.reduce((sum, o) => sum + Math.max(0, (o.valor_total || 0) - ((o.valor_mao_obra || 0) + (o.valor_deslocamento || 0) + (o.valor_terceiros || 0))), 0);
  const faturamentoMaoObra = finalizadas.reduce((sum, o) => sum + (o.valor_mao_obra || 0), 0);
  const faturamentoKm = finalizadas.reduce((sum, o) => sum + (o.valor_deslocamento || 0), 0);
  const faturamentoTerceiros = finalizadas.reduce((sum, o) => sum + (o.valor_terceiros || 0), 0);

  // Excel Export Helper
  const handleExportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // Group costs by type of service (GARANTIA, ASSISTENCIA TECNICA, REVISAO)
  const getFaturamentoPorTipo = () => {
    const map: Record<string, number> = {};
    finalizadas.forEach(o => {
      const tipo = o.tipo_atendimento || "OUTRO";
      map[tipo] = (map[tipo] || 0) + (o.valor_total || 0);
    });
    return Object.entries(map).sort((a,b) => b[1] - a[1]);
  };

  // Helper to compute actual pointed hours (Realizado)
  const getTechHoursRealizadas = (techId: number) => {
    const fromApontamentos = apontamentos
      .filter(a => Number(a.tecnico_id) === techId && finalizadas.some(o => Number(o.id) === Number(a.os_id)))
      .reduce((sum, a) => sum + Number(a.horas_trabalhadas || 0), 0);
    
    if (fromApontamentos > 0) return fromApontamentos;

    // Fallback if no apontamentos details, use hours on finished OS
    const techOS = finalizadas.filter(o => o.tecnico_id === techId || o.auxiliar_id === techId);
    return techOS.reduce((sum, o) => {
      let hrs = 0;
      if (o.horas_trabalhadas_total) {
        hrs = parseFloat(o.horas_trabalhadas_total) || 0;
      } else {
        hrs = (o.valor_mao_obra || 0) / (tecnicos.find(tec => tec.id === techId)?.valor_hora || 100);
      }
      return sum + (hrs > 0 ? hrs : 0);
    }, 0);
  };

  // Helper to compute billed hours (Faturado)
  const getTechHoursFaturadas = (techId: number) => {
    const techOS = finalizadas.filter(o => o.tecnico_id === techId || o.auxiliar_id === techId);
    return techOS.reduce((sum, o) => {
      const mainTech = tecnicos.find(tec => tec.id === o.tecnico_id);
      
      let hrs = 0;
      if (o.horas_trabalhadas_total) {
        hrs = parseFloat(o.horas_trabalhadas_total) || 0;
      } else {
        const rate = o.valor_hora_unitario || mainTech?.valor_hora || 100;
        hrs = (o.valor_mao_obra || 0) / rate;
      }
      return sum + (hrs > 0 ? hrs : 0);
    }, 0);
  };

  // Group hours by technician (using pointed hours as realized standard)
  const getHorasPorTecnico = () => {
    const map: Record<string, number> = {};
    tecnicos.forEach(t => {
      const hrs = getTechHoursRealizadas(Number(t.id));
      if (hrs > 0) {
        const name = t.apelido || t.nome || "Indefinido";
        map[name] = hrs;
      }
    });
    return Object.entries(map).sort((a,b) => b[1] - a[1]);
  };

  // Calculate detailed productivity of all technicians
  const getProductivityReportData = () => {
    return tecnicos.map(t => {
      const techOS = finalizadas.filter(o => o.tecnico_id === t.id || o.auxiliar_id === t.id);
      const totalKm = techOS.reduce((sum, o) => sum + (o.km_rodado_total || 0), 0);
      const laborValue = techOS.reduce((sum, o) => sum + (o.valor_mao_obra || 0), 0);
      const travelValue = techOS.reduce((sum, o) => sum + (o.valor_deslocamento || 0), 0);
      const totalValue = techOS.reduce((sum, o) => sum + (o.valor_total || 0), 0);

      const osComoTitular = techOS.filter(o => o.tecnico_id === t.id).length;
      const osComoAuxiliar = techOS.filter(o => o.auxiliar_id === t.id).length;

      const horasRealizadas = getTechHoursRealizadas(Number(t.id));
      const horasFaturadas = getTechHoursFaturadas(Number(t.id));

      return {
        id: t.id,
        nome: t.nome,
        apelido: t.apelido,
        cargo: t.cargo || "Técnico de Campo",
        total_os: techOS.length,
        os_titular: osComoTitular,
        os_auxiliar: osComoAuxiliar,
        horas_trabalhadas: Number(horasRealizadas.toFixed(1)), // Realizadas
        horas_faturadas: Number(horasFaturadas.toFixed(1)),   // Faturadas
        km_percorrido: totalKm,
        faturamento_mao_obra: laborValue,
        faturamento_deslocamento: travelValue,
        faturamento_total: totalValue
      };
    });
  };

  // Calculate detailed faturamento by customer
  const getCustomerReportData = () => {
    return clientes.map(c => {
      const clientOS = finalizadas.filter(o => o.cliente_id === c.id);
      const laborValue = clientOS.reduce((sum, o) => sum + (o.valor_mao_obra || 0), 0);
      const travelValue = clientOS.reduce((sum, o) => sum + (o.valor_deslocamento || 0), 0);
      const totalValue = clientOS.reduce((sum, o) => sum + (o.valor_total || 0), 0);
      const totalKm = clientOS.reduce((sum, o) => sum + (o.km_rodado_total || 0), 0);

      return {
        id: c.id,
        razao_social: c.razao_social,
        nome_fantasia: c.nome_fantasia || "",
        cidade: c.cidade,
        uf: c.uf,
        total_os: clientOS.length,
        total_km: totalKm,
        valor_mao_obra: laborValue,
        valor_deslocamento: travelValue,
        valor_total: totalValue
      };
    });
  };

  const selectedOS = ordens.find(o => String(o.id) === selectedOSId);

  // Handle browser native print trigger
  const handleTriggerPrint = () => {
    window.print();
  };

  if (printMode && selectedOS) {
    // Elegant full-screen printable O.S. layout mimicking the apps script os_impressao
    const osClient = clientes.find(c => c.id === selectedOS.cliente_id);
    const osEquip = implementos.find(i => i.id === selectedOS.implemento_id);
    const osTech = tecnicos.find(t => t.id === selectedOS.tecnico_id);
    const osAux = tecnicos.find(t => t.id === selectedOS.auxiliar_id);

    return (
      <div className="bg-white p-8 max-w-4xl mx-auto border shadow-md font-sans text-brand-ink space-y-6 printable-area print:p-0 print:border-0 print:shadow-none">
        {/* Print controls floating header */}
        <div className="flex justify-between items-center bg-gray-50 p-4 border rounded-xl print:hidden">
          <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-brand-red animate-pulse" />
            Clique em "Imprimir Relatório" para abrir o diálogo de impressão.
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPrintMode(false)}
              className="py-1 px-3 bg-gray-200 hover:bg-gray-300 rounded font-bold text-xs"
            >
              Voltar
            </button>
            <button
              onClick={handleTriggerPrint}
              className="py-1 px-3 bg-brand-red text-white hover:bg-brand-red-dark rounded font-bold text-xs flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir Relatório
            </button>
          </div>
        </div>

        {/* Printable Header */}
        <div className="flex justify-between items-center border-b-2 border-brand-ink pb-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🚜</div>
            <div>
              <h2 className="font-display font-extrabold text-2xl uppercase tracking-wide">GESTÃO DE SERVIÇOS</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Laudo Técnico de Atendimento em Campo</p>
            </div>
          </div>
          <div className="text-right border-l-2 border-brand-ink pl-6">
            <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">Ordem de Serviço</span>
            <strong className="font-display text-3xl font-extrabold">{selectedOS.numero_os}</strong>
          </div>
        </div>

        {/* Customer & Equipment block */}
        <div className="grid grid-cols-2 gap-6 text-xs">
          <div className="border border-brand-ink/40 p-3 rounded space-y-1">
            <h4 className="font-bold text-[10px] text-gray-400 uppercase border-b pb-0.5 mb-1.5 tracking-wider">Identificação do Proprietário</h4>
            <div><strong>Razão Social:</strong> {osClient?.razao_social}</div>
            {osClient?.nome_fantasia && <div><strong>Fazenda:</strong> {osClient.nome_fantasia}</div>}
            <div><strong>CNPJ/CPF:</strong> {osClient?.cpf_cnpj || "—"}</div>
            <div><strong>Localização:</strong> {osClient?.cidade} — {osClient?.uf}</div>
            <div><strong>Contato:</strong> {osClient?.celular || osClient?.telefone || "—"}</div>
          </div>

          <div className="border border-brand-ink/40 p-3 rounded space-y-1">
            <h4 className="font-bold text-[10px] text-gray-400 uppercase border-b pb-0.5 mb-1.5 tracking-wider">Identificação da Máquina</h4>
            <div><strong>Fabricante:</strong> {osEquip?.fabricante}</div>
            <div><strong>Modelo / Versão:</strong> {osEquip?.modelo}</div>
            <div className="font-mono font-bold"><strong>Nº de Série / Chassi:</strong> {osEquip?.numero_serie}</div>
            <div><strong>Ano:</strong> {osEquip?.ano || "—"}</div>
            <div><strong>Horímetro Final verificado:</strong> {selectedOS.horimetro_final || "—"} h</div>
          </div>
        </div>

        {/* Demands */}
        <div className="border border-brand-ink/40 p-3 rounded text-xs space-y-2">
          <h4 className="font-bold text-[10px] text-gray-400 uppercase border-b pb-0.5 mb-1 tracking-wider">Reclamação ou Diagnóstico de Solicitação</h4>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedOS.reclamacao}</p>
        </div>

        {/* Laudo técnico */}
        <div className="border border-brand-ink/40 p-3 rounded text-xs space-y-2">
          <h4 className="font-bold text-[10px] text-gray-400 uppercase border-b pb-0.5 mb-1 tracking-wider">Serviço Executado / Laudo de Campo</h4>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {selectedOS.servico_executado || "Serviço finalizado em conformidade com as regras preventivas do fabricante."}
          </p>
        </div>

        {/* Financial Recap Table */}
        <div className="border border-brand-ink/40 rounded overflow-hidden text-xs">
          <div className="bg-gray-100 p-2 font-bold uppercase tracking-wider text-[10px] text-gray-500 border-b">
            Demonstrativo Financeiro do Atendimento
          </div>
          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <strong className="text-gray-400 uppercase font-bold text-[9px] block">Peças / Filtros:</strong>
              <span className="font-mono font-bold text-sm block">
                {faturamentoPecas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <div>
              <strong className="text-gray-400 uppercase font-bold text-[9px] block">Mão de Obra:</strong>
              <span className="font-mono font-bold text-sm block">
                {(selectedOS.valor_mao_obra || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <div>
              <strong className="text-gray-400 uppercase font-bold text-[9px] block">Deslocamento (KM):</strong>
              <span className="font-mono font-bold text-sm block">
                {(selectedOS.valor_deslocamento || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <div>
              <strong className="text-gray-400 uppercase font-bold text-[9px] block">Outros / Hospedagem:</strong>
              <span className="font-mono font-bold text-sm block">
                {(selectedOS.valor_terceiros || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          </div>

          <div className="bg-brand-ink text-white p-3 flex justify-between items-center text-sm font-bold border-t">
            <span>CUSTO TOTAL DE ATENDIMENTO:</span>
            <span className="font-mono text-base font-extrabold">
              {(selectedOS.valor_total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        </div>

        {/* Date and Signatures */}
        <div className="pt-12 text-xs">
          <p className="text-right text-gray-500">
            Atendimento concluído em: <strong className="text-brand-ink">{selectedOS.data_atendimento ? new Date(selectedOS.data_atendimento).toLocaleDateString("pt-BR") : "—"}</strong>
          </p>

          <div className="grid grid-cols-2 gap-12 mt-12 pt-8 text-center text-gray-400">
            <div className="border-t border-brand-ink/40 pt-2 text-brand-ink">
              <strong className="block text-xs uppercase">{osTech?.nome || "Assinatura do Técnico"}</strong>
              <span className="text-[10px] text-gray-400 uppercase font-bold block mt-0.5">Técnico de Campo Executor</span>
            </div>
            <div className="border-t border-brand-ink/40 pt-2 text-brand-ink">
              <strong className="block text-xs uppercase">Assinatura do Produtor / Cliente</strong>
              <span className="text-[10px] text-gray-400 uppercase font-bold block mt-0.5">Cliente Proprietário Recebedor</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filters for table tabs
  const filteredProductivity = getProductivityReportData().filter(p => 
    p.nome.toLowerCase().includes(reportSearch.toLowerCase()) || 
    p.apelido.toLowerCase().includes(reportSearch.toLowerCase()) ||
    p.cargo.toLowerCase().includes(reportSearch.toLowerCase())
  );

  const filteredCustomerReport = getCustomerReportData().filter(c => 
    c.razao_social.toLowerCase().includes(reportSearch.toLowerCase()) || 
    (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(reportSearch.toLowerCase())) ||
    c.cidade.toLowerCase().includes(reportSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs animate-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase text-brand-ink">
            Relatórios e Emissões
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Exportação de planilhas de faturamento, laudos de campo impressos e desempenho da equipe de campo.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => { setActiveTab("geral"); setReportSearch(""); }}
            className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all ${
              activeTab === "geral" ? "bg-white text-brand-ink shadow-sm font-extrabold" : "text-gray-500 hover:text-brand-ink"
            }`}
          >
            Visão Geral e Laudos
          </button>
          <button
            onClick={() => { setActiveTab("produtividade"); setReportSearch(""); }}
            className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all ${
              activeTab === "produtividade" ? "bg-white text-brand-ink shadow-sm font-extrabold" : "text-gray-500 hover:text-brand-ink"
            }`}
          >
            Produtividade da Equipe
          </button>
          <button
            onClick={() => { setActiveTab("clientes"); setReportSearch(""); }}
            className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all ${
              activeTab === "clientes" ? "bg-white text-brand-ink shadow-sm font-extrabold" : "text-gray-500 hover:text-brand-ink"
            }`}
          >
            Faturamento por Cliente
          </button>
          <button
            onClick={() => { setActiveTab("debito_interno"); setReportSearch(""); }}
            className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all ${
              activeTab === "debito_interno" ? "bg-white text-brand-ink shadow-sm font-extrabold" : "text-gray-500 hover:text-brand-ink"
            }`}
          >
            Débito Interno
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === "geral" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side: General Stats */}
          <div className="space-y-6 lg:col-span-2">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                <DollarSign className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Faturamento Técnico</span>
                <span className="font-display text-2xl font-extrabold text-gray-800 mt-1 block">
                  {faturamentoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                <Wrench className="w-5 h-5 mx-auto text-brand-red mb-1" />
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Peças Substituídas</span>
                <span className="font-display text-2xl font-extrabold text-gray-800 mt-1 block">
                  {faturamentoPecas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                <Truck className="w-5 h-5 mx-auto text-sky-600 mb-1" />
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">KM Deslocados</span>
                <span className="font-display text-2xl font-extrabold text-gray-800 mt-1 block">
                  {faturamentoKm.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>

            {/* Detailed Lists & Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h3 className="font-display font-extrabold text-base uppercase text-brand-ink border-b pb-1">
                  Faturamento por Tipo de Atendimento
                </h3>
                <div className="space-y-4">
                  {getFaturamentoPorTipo().length === 0 ? (
                    <div className="text-gray-400 py-4 text-center">Nenhum serviço faturado.</div>
                  ) : (
                    getFaturamentoPorTipo().map(([tipo, val]) => {
                      const maxVal = Math.max(...getFaturamentoPorTipo().map(([_, v]) => v), 1);
                      const pct = (val / maxVal) * 100;
                      return (
                        <div key={tipo} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700">{tipo}</span>
                            <strong className="font-mono text-gray-800">{val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                          </div>
                          <div className="bg-gray-100 h-2.5 rounded-full overflow-hidden w-full">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                              className="bg-brand-ink h-full rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h3 className="font-display font-extrabold text-base uppercase text-brand-ink border-b pb-1">
                  Horas de Campo por Técnico (Realizado x Faturado)
                </h3>
                <div className="space-y-3">
                  {getHorasPorTecnico().length === 0 ? (
                    <div className="text-gray-400 py-4 text-center">Nenhum apontamento lançado.</div>
                  ) : (
                    getHorasPorTecnico().slice(0, 4).map(([name, hrs]) => {
                      const tech = tecnicos.find(t => t.apelido === name || t.nome === name);
                      const techId = tech?.id;
                      const hrsFaturadas = techId ? getTechHoursFaturadas(Number(techId)) : 0;
                      const maxVal = Math.max(...getHorasPorTecnico().map(([_, h]) => {
                        const tc = tecnicos.find(t => t.apelido === _ || t.nome === _);
                        const hf = tc?.id ? getTechHoursFaturadas(Number(tc.id)) : 0;
                        return Math.max(h, hf);
                      }), 1);
                      const pctRealizado = (hrs / maxVal) * 100;
                      const pctFaturado = (hrsFaturadas / maxVal) * 100;

                      return (
                        <div key={name} className="space-y-1 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                              {name}
                            </span>
                            <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
                              <span className="text-brand-red">{hrs.toFixed(1)}h R</span>
                              <span className="text-gray-400">|</span>
                              <span className="text-gray-700">{hrsFaturadas.toFixed(1)}h F</span>
                            </div>
                          </div>
                          {/* Realized bar */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-bold text-gray-400 w-2">R</span>
                            <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-brand-red h-full" style={{ width: `${pctRealizado}%` }} />
                            </div>
                          </div>
                          {/* Faturado bar */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-bold text-gray-400 w-2">F</span>
                            <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-gray-700 h-full" style={{ width: `${pctFaturado}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Print Selector Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-display font-extrabold text-xl uppercase text-brand-ink">
                Emissão de Laudos Técnicos (O.S.)
              </h3>
              <p className="text-gray-500 text-xs">Selecione uma Ordem de Serviço finalizada para abrir o layout de impressão em papel.</p>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">Código da O.S.</label>
                <select
                  value={selectedOSId}
                  onChange={(e) => setSelectedOSId(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs bg-gray-50 focus:bg-white focus:border-brand-red font-bold text-brand-ink"
                >
                  <option value="">Selecione...</option>
                  {finalizadas.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.numero_os} — {o.clientes?.razao_social}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  if (!selectedOSId) return;
                  setPrintMode(true);
                }}
                disabled={!selectedOSId}
                className="w-full btn bg-brand-red text-white hover:bg-brand-red-dark border-none shadow flex items-center justify-center gap-2 py-2 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                Gerar Laudo para Impressão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TECHNICIAN PRODUCTIVITY REPORT */}
      {activeTab === "produtividade" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                Relatório de Produtividade Técnica
              </h3>
              <p className="text-gray-500 text-xs">Métricas de horas executadas, chamados finalizados e faturamento gerado por profissional.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar técnico..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg w-48 text-xs bg-gray-50/50"
                />
              </div>

              <button
                onClick={() => {
                  const cleanedData = filteredProductivity.map(p => ({
                    "Nome": p.nome,
                    "Apelido": p.apelido,
                    "Cargo": p.cargo,
                    "Total O.S. Finalizadas": p.total_os,
                    "Como Titular": p.os_titular,
                    "Como Auxiliar": p.os_auxiliar,
                    "Horas Trabalhadas": p.horas_trabalhadas,
                    "KM Percorrido": p.km_percorrido,
                    "Faturamento M.O. (R$)": p.faturamento_mao_obra,
                    "Faturamento Km (R$)": p.faturamento_deslocamento,
                    "Faturamento Total (R$)": p.faturamento_total
                  }));
                  handleExportToExcel(cleanedData, "Produtividade_Tecnicos");
                }}
                className="btn border border-gray-200 hover:bg-gray-50 text-gray-600 flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {/* Comparativo de Produtividade: Realizado x Faturado */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-3 gap-2">
              <div>
                <h4 className="font-display font-extrabold text-sm uppercase text-brand-ink flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-brand-red" />
                  Gráfico de Desempenho: Realizado vs. Faturado
                </h4>
                <p className="text-[10px] text-gray-500 font-semibold">
                  Compara o tempo real trabalhado em campo (Apontamentos) com a estimativa de horas cobradas na O.S. (Faturamento M.O.).
                </p>
              </div>
              <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-brand-red rounded"></span>
                  <span>Realizado (Lançado)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-gray-700 rounded"></span>
                  <span>Faturado (Cobrado)</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {filteredProductivity.length === 0 ? (
                <div className="text-gray-400 text-center py-4">Sem dados para exibir no gráfico.</div>
              ) : (
                filteredProductivity.slice(0, 5).map(p => {
                  const maxVal = Math.max(...filteredProductivity.map(item => Math.max(item.horas_trabalhadas, item.horas_faturadas, 1)));
                  const pctRealizado = (p.horas_trabalhadas / maxVal) * 100;
                  const pctFaturado = (p.horas_faturadas / maxVal) * 100;
                  const desvio = p.horas_trabalhadas - p.horas_faturadas;

                  return (
                    <div key={p.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="md:col-span-1">
                        <strong className="text-gray-800 text-xs block">{p.nome}</strong>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">{p.cargo}</span>
                      </div>
                      <div className="md:col-span-2 space-y-1.5">
                        {/* Realizado Bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200/50 h-3 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pctRealizado}%` }}
                              transition={{ duration: 0.6 }}
                              className="bg-brand-red h-full rounded-full"
                            />
                          </div>
                          <span className="w-12 text-right font-mono font-bold text-brand-red text-[10px]">{p.horas_trabalhadas}h R</span>
                        </div>
                        {/* Faturado Bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200/50 h-3 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pctFaturado}%` }}
                              transition={{ duration: 0.6 }}
                              className="bg-gray-700 h-full rounded-full"
                            />
                          </div>
                          <span className="w-12 text-right font-mono font-bold text-gray-700 text-[10px]">{p.horas_faturadas}h F</span>
                        </div>
                      </div>
                      <div className="md:col-span-1 text-right">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Desvio / Diferença</span>
                        <strong className={`font-mono text-[10px] ${desvio > 0 ? "text-amber-600" : desvio < 0 ? "text-emerald-600" : "text-gray-500"}`}>
                          {desvio > 0 ? `+${desvio.toFixed(1)}h ociosas` : desvio < 0 ? `${Math.abs(desvio).toFixed(1)}h extra fat.` : "Faturamento ideal"}
                        </strong>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-4">Profissional</th>
                  <th className="p-4">Cargo</th>
                  <th className="p-4 text-center">O.S. Finalizadas</th>
                  <th className="p-4 text-center">Realizado (Apont.)</th>
                  <th className="p-4 text-center">Faturado (M.O.)</th>
                  <th className="p-4 text-center">Desvio</th>
                  <th className="p-4 text-center">KM Deslocamento</th>
                  <th className="p-4 text-right">Faturamento M.O.</th>
                  <th className="p-4 text-right">Faturamento Geral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredProductivity.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400">Nenhum técnico correspondente.</td>
                  </tr>
                ) : (
                  filteredProductivity.map(p => {
                    const desvio = p.horas_trabalhadas - p.horas_faturadas;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 font-bold text-brand-ink">
                          {p.nome} <span className="text-gray-400 font-normal">({p.apelido})</span>
                        </td>
                        <td className="p-4 text-gray-500 font-semibold">{p.cargo}</td>
                        <td className="p-4 text-center font-bold text-gray-800">
                          <div>{p.total_os}</div>
                          <div className="text-[10px] text-gray-400 font-normal">
                            {p.os_titular} Titular | {p.os_auxiliar} Auxiliar
                          </div>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-brand-red">{p.horas_trabalhadas} h</td>
                        <td className="p-4 text-center font-mono font-bold text-gray-700">{p.horas_faturadas} h</td>
                        <td className={`p-4 text-center font-mono font-bold ${desvio > 0 ? "text-amber-600" : desvio < 0 ? "text-emerald-600" : "text-gray-400"}`}>
                          {desvio > 0 ? `+${desvio.toFixed(1)} h` : desvio < 0 ? `${desvio.toFixed(1)} h` : "—"}
                        </td>
                        <td className="p-4 text-center font-mono text-gray-600">{p.km_percorrido} km</td>
                        <td className="p-4 text-right font-mono font-bold text-gray-700">
                          {p.faturamento_mao_obra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-700">
                          {p.faturamento_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLIENT REVENUE BREAKDOWN REPORT */}
      {activeTab === "clientes" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                Faturamento e Chamados por Cliente
              </h3>
              <p className="text-gray-500 text-xs">Análise de custos operacionais, mão de obra faturada e quilometragem despendida por produtor rural.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar cliente..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg w-48 text-xs bg-gray-50/50"
                />
              </div>

              <button
                onClick={() => {
                  const cleanedData = filteredCustomerReport.map(c => ({
                    "Razão Social": c.razao_social,
                    "Fazenda / Nome Fantasia": c.nome_fantasia,
                    "Cidade": c.cidade,
                    "UF": c.uf,
                    "O.S. Finalizadas": c.total_os,
                    "KM Rodados": c.total_km,
                    "Valor Mão de Obra (R$)": c.valor_mao_obra,
                    "Valor Deslocamento (R$)": c.valor_deslocamento,
                    "Faturamento Total (R$)": c.valor_total
                  }));
                  handleExportToExcel(cleanedData, "Faturamento_Clientes");
                }}
                className="btn border border-gray-200 hover:bg-gray-50 text-gray-600 flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-4">Cliente / Propriedade</th>
                  <th className="p-4">Cidade / UF</th>
                  <th className="p-4 text-center">Atendimentos</th>
                  <th className="p-4 text-center">KM Acumulados</th>
                  <th className="p-4 text-right">Mão de Obra</th>
                  <th className="p-4 text-right">Deslocamentos</th>
                  <th className="p-4 text-right">Investimento Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredCustomerReport.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">Nenhum cliente correspondente.</td>
                  </tr>
                ) : (
                  filteredCustomerReport.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-brand-ink">
                        {c.razao_social}
                        {c.nome_fantasia && <span className="block text-gray-400 font-semibold text-[10px] uppercase mt-0.5">Fazenda: {c.nome_fantasia}</span>}
                      </td>
                      <td className="p-4 text-gray-600 font-semibold">{c.cidade} — {c.uf}</td>
                      <td className="p-4 text-center font-bold text-gray-800">{c.total_os}</td>
                      <td className="p-4 text-center font-mono text-gray-600">{c.total_km} km</td>
                      <td className="p-4 text-right font-mono font-bold text-gray-700">
                        {c.valor_mao_obra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-gray-700">
                        {c.valor_deslocamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-700">
                        {c.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INTERNAL DEBIT REPORT TAB */}
      {activeTab === "debito_interno" && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
              <DollarSign className="w-5 h-5 mx-auto text-amber-600 mb-1" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Faturamento Débito Interno</span>
              <span className="font-display text-2xl font-extrabold text-amber-900 mt-1 block">
                {totalDebitoInterno.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              <span className="text-[9px] text-amber-600 mt-0.5 block italic">Mão de Obra e KM Reduzidos</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <FileText className="w-5 h-5 mx-auto text-gray-600 mb-1" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Serviços Lançados</span>
              <span className="font-display text-2xl font-extrabold text-gray-800 mt-1 block">
                {qtdDebitoInterno} O.S.
              </span>
              <span className="text-[9px] text-gray-400 mt-0.5 block">Atendimentos internos</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <Clock className="w-5 h-5 mx-auto text-gray-600 mb-1" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Horas Acumuladas</span>
              <span className="font-display text-2xl font-extrabold text-gray-800 mt-1 block">
                {totalHorasDebitoInterno.toFixed(1)} h
              </span>
              <span className="text-[9px] text-gray-400 mt-0.5 block">Tempo de campo dedicado</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <Truck className="w-5 h-5 mx-auto text-gray-600 mb-1" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Quilometragem Interna</span>
              <span className="font-display text-2xl font-extrabold text-gray-800 mt-1 block">
                {totalKmDebitoInterno.toLocaleString("pt-BR")} km
              </span>
              <span className="text-[9px] text-gray-400 mt-0.5 block">Distância percorrida</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List and Table of Internal Debits */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                    Lançamentos de Débito Interno
                  </h3>
                  <p className="text-gray-500 text-xs">Ordens de serviço finalizadas debitadas internamente para filiais/centros de custo.</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filtrar O.S., técnico..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg w-44 text-xs bg-gray-50/50 focus:bg-white"
                    />
                  </div>

                  <button
                    onClick={() => {
                      const cleanedData = internalDebits.map(o => {
                        const tech = tecnicos.find(t => t.id === o.tecnico_id);
                        const aux = o.auxiliar_id ? tecnicos.find(t => t.id === o.auxiliar_id) : null;
                        const client = clientes.find(c => c.id === o.cliente_id);
                        return {
                          "Nº O.S.": o.numero_os,
                          "Data": o.data_atendimento ? new Date(o.data_atendimento).toLocaleDateString("pt-BR") : "—",
                          "Técnico": tech?.apelido || tech?.nome || "—",
                          "Auxiliar": aux?.apelido || aux?.nome || "—",
                          "Cliente": client?.razao_social || "—",
                          "Fazenda / Nome": client?.nome_fantasia || "—",
                          "Tipo de Atendimento": o.tipo_atendimento || "—",
                          "Centro de Custo": o.centro_custo_debito || "—",
                          "Observação": o.observacao_debito || "—",
                          "Horas Trabalhadas": parseFloat(o.horas_trabalhadas_total || "0") || 0,
                          "KM Rodados": o.km_rodado_total || 0,
                          "Valor Faturamento Interno (R$)": getValorDebitoInterno(o)
                        };
                      });
                      handleExportToExcel(cleanedData, "Relatorio_Debito_Interno");
                    }}
                    className="btn border border-gray-200 hover:bg-gray-50 text-gray-600 flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold"
                  >
                    <Download className="w-3.5 h-3.5" /> Exportar Planilha
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="p-3">O.S. / Data</th>
                      <th className="p-3">Cliente / Fazenda</th>
                      <th className="p-3">Técnico / Equipe</th>
                      <th className="p-3">Centro de Custo / Obs</th>
                      <th className="p-3 text-center">Horas e KM</th>
                      <th className="p-3 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {internalDebits.filter(o => {
                      const tech = tecnicos.find(t => t.id === o.tecnico_id);
                      const aux = o.auxiliar_id ? tecnicos.find(t => t.id === o.auxiliar_id) : null;
                      const client = clientes.find(c => c.id === o.cliente_id);
                      const sLower = reportSearch.toLowerCase();
                      return (
                        o.numero_os.toLowerCase().includes(sLower) ||
                        (o.centro_custo_debito || "").toLowerCase().includes(sLower) ||
                        (o.observacao_debito || "").toLowerCase().includes(sLower) ||
                        (o.tipo_atendimento || "").toLowerCase().includes(sLower) ||
                        (tech?.nome || "").toLowerCase().includes(sLower) ||
                        (tech?.apelido || "").toLowerCase().includes(sLower) ||
                        (client?.razao_social || "").toLowerCase().includes(sLower)
                      );
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">Nenhum débito interno correspondente ao filtro.</td>
                      </tr>
                    ) : (
                      internalDebits.filter(o => {
                        const tech = tecnicos.find(t => t.id === o.tecnico_id);
                        const aux = o.auxiliar_id ? tecnicos.find(t => t.id === o.auxiliar_id) : null;
                        const client = clientes.find(c => c.id === o.cliente_id);
                        const sLower = reportSearch.toLowerCase();
                        return (
                          o.numero_os.toLowerCase().includes(sLower) ||
                          (o.centro_custo_debito || "").toLowerCase().includes(sLower) ||
                          (o.observacao_debito || "").toLowerCase().includes(sLower) ||
                          (o.tipo_atendimento || "").toLowerCase().includes(sLower) ||
                          (tech?.nome || "").toLowerCase().includes(sLower) ||
                          (tech?.apelido || "").toLowerCase().includes(sLower) ||
                          (client?.razao_social || "").toLowerCase().includes(sLower)
                        );
                      }).map(o => {
                        const tech = tecnicos.find(t => t.id === o.tecnico_id);
                        const aux = o.auxiliar_id ? tecnicos.find(t => t.id === o.auxiliar_id) : null;
                        const client = clientes.find(c => c.id === o.cliente_id);
                        const val = getValorDebitoInterno(o);

                        return (
                          <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-3 font-bold text-gray-800">
                              <span className="block font-mono text-[11px]">{o.numero_os}</span>
                              <span className="text-[10px] text-gray-400 font-normal">
                                {o.data_atendimento ? new Date(o.data_atendimento).toLocaleDateString("pt-BR") : "—"}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-gray-700 block max-w-[150px] truncate">{client?.razao_social}</span>
                              {client?.nome_fantasia && (
                                <span className="text-[9px] text-amber-600 block uppercase font-bold tracking-wide">
                                  {client.nome_fantasia}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-gray-700 block">{tech?.apelido || tech?.nome || "—"}</span>
                              {aux && (
                                <span className="text-[9px] text-gray-400 block font-normal">
                                  Aux: {aux.apelido || aux.nome}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 rounded text-[9px] font-bold uppercase inline-block mb-1">
                                {o.centro_custo_debito || "Centro de Custo não definido"}
                              </span>
                              {o.observacao_debito && (
                                <span className="text-[10px] text-gray-500 block italic max-w-[180px] truncate" title={o.observacao_debito}>
                                  "{o.observacao_debito}"
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="font-mono font-bold text-gray-700 text-[11px]">{parseFloat(o.horas_trabalhadas_total || "0").toFixed(1)} h</div>
                              <div className="text-[10px] text-gray-400">{o.km_rodado_total || 0} km</div>
                            </td>
                            <td className="p-3 text-right font-mono font-extrabold text-amber-800 text-[12px]">
                              {val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Side Cards: Distributions by CC, service type and technician */}
            <div className="space-y-6">
              {/* Distribution by Centro de Custo */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h3 className="font-display font-extrabold text-sm uppercase text-brand-ink border-b pb-1">
                  Débito por Centro de Custo
                </h3>
                <div className="space-y-4">
                  {getDebitoPorCentroCusto().length === 0 ? (
                    <div className="text-gray-400 py-4 text-center">Nenhum débito lançado.</div>
                  ) : (
                    getDebitoPorCentroCusto().map(([centro, val]) => {
                      const maxVal = Math.max(...getDebitoPorCentroCusto().map(([_, v]) => v), 1);
                      const pct = (val / maxVal) * 100;
                      return (
                        <div key={centro} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700 uppercase tracking-wide text-[10px]">{centro}</span>
                            <strong className="font-mono text-amber-800 font-extrabold">
                              {val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </strong>
                          </div>
                          <div className="bg-gray-100 h-2 rounded-full overflow-hidden w-full">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                              className="bg-amber-500 h-full rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Distribution by Tipo de Atendimento */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h3 className="font-display font-extrabold text-sm uppercase text-brand-ink border-b pb-1">
                  Débito por Tipo de Atendimento
                </h3>
                <div className="space-y-4">
                  {getDebitoPorTipoAtendimento().length === 0 ? (
                    <div className="text-gray-400 py-4 text-center">Nenhum débito lançado.</div>
                  ) : (
                    getDebitoPorTipoAtendimento().map(([tipo, val]) => {
                      const maxVal = Math.max(...getDebitoPorTipoAtendimento().map(([_, v]) => v), 1);
                      const pct = (val / maxVal) * 100;
                      return (
                        <div key={tipo} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700">{tipo}</span>
                            <strong className="font-mono text-amber-800 font-extrabold">
                              {val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </strong>
                          </div>
                          <div className="bg-gray-100 h-2 rounded-full overflow-hidden w-full">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                              className="bg-brand-ink h-full rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Distribution by Técnico */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h3 className="font-display font-extrabold text-sm uppercase text-brand-ink border-b pb-1">
                  Atividade de Técnicos (Débito Interno)
                </h3>
                <div className="space-y-4">
                  {getDebitoPorTecnico().length === 0 ? (
                    <div className="text-gray-400 py-4 text-center">Nenhum débito lançado.</div>
                  ) : (
                    getDebitoPorTecnico().map(([name, val]) => {
                      const maxVal = Math.max(...getDebitoPorTecnico().map(([_, v]) => v), 1);
                      const pct = (val / maxVal) * 100;
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              {name}
                            </span>
                            <strong className="font-mono text-amber-800 font-extrabold">
                              {val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </strong>
                          </div>
                          <div className="bg-gray-100 h-2 rounded-full overflow-hidden w-full">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                              className="bg-gray-700 h-full rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
