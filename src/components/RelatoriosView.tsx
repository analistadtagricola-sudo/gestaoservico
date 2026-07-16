/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
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
import { OrdemServico, Tecnico, Cliente, Implemento } from "../types";
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
  const [activeTab, setActiveTab] = useState<"geral" | "produtividade" | "clientes">("geral");
  const [reportSearch, setReportSearch] = useState("");

  // Stats Calculations
  const finalizadas = ordens.filter(o => o.status === "FINALIZADA");
  
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

  // Group hours by technician
  const getHorasPorTecnico = () => {
    const map: Record<string, number> = {};
    finalizadas.forEach(o => {
      if (!o.tecnico_id) return;
      const tech = tecnicos.find(t => t.id === o.tecnico_id);
      const name = tech?.apelido || tech?.nome || "Indefinido";
      
      // Calculate work hours based on O.S. total hours or average
      const hours = (o.valor_mao_obra || 0) / (tech?.valor_hora || 100);
      map[name] = (map[name] || 0) + (hours > 0 ? hours : 0);
    });
    return Object.entries(map).sort((a,b) => b[1] - a[1]);
  };

  // Calculate detailed productivity of all technicians
  const getProductivityReportData = () => {
    return tecnicos.map(t => {
      const techOS = finalizadas.filter(o => o.tecnico_id === t.id);
      const totalHours = techOS.reduce((sum, o) => {
        const hrs = (o.valor_mao_obra || 0) / (t.valor_hora || 100);
        return sum + (hrs > 0 ? hrs : 0);
      }, 0);
      const totalKm = techOS.reduce((sum, o) => sum + (o.km_rodado_total || 0), 0);
      const laborValue = techOS.reduce((sum, o) => sum + (o.valor_mao_obra || 0), 0);
      const travelValue = techOS.reduce((sum, o) => sum + (o.valor_deslocamento || 0), 0);
      const totalValue = techOS.reduce((sum, o) => sum + (o.valor_total || 0), 0);

      return {
        id: t.id,
        nome: t.nome,
        apelido: t.apelido,
        cargo: t.cargo || "Técnico de Campo",
        total_os: techOS.length,
        horas_trabalhadas: Number(totalHours.toFixed(1)),
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

            {/* Detailed Lists */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-display font-extrabold text-base uppercase text-brand-ink mb-3 border-b pb-1">
                  Faturamento por Tipo de Atendimento
                </h3>
                <div className="space-y-2">
                  {getFaturamentoPorTipo().length === 0 ? (
                    <div className="text-gray-400 py-4 text-center">Nenhum serviço faturado.</div>
                  ) : (
                    getFaturamentoPorTipo().map(([tipo, val]) => (
                      <div key={tipo} className="flex justify-between items-center text-xs py-1 border-b border-gray-50 last:border-0">
                        <span className="font-semibold text-gray-600">{tipo}</span>
                        <strong className="font-mono text-gray-800">{val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-display font-extrabold text-base uppercase text-brand-ink mb-3 border-b pb-1">
                  Horas de Campo por Técnico
                </h3>
                <div className="space-y-2">
                  {getHorasPorTecnico().length === 0 ? (
                    <div className="text-gray-400 py-4 text-center">Nenhum apontamento lançado.</div>
                  ) : (
                    getHorasPorTecnico().map(([name, hrs]) => (
                      <div key={name} className="flex justify-between items-center text-xs py-1 border-b border-gray-50 last:border-0">
                        <span className="font-semibold text-gray-600 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          {name}
                        </span>
                        <strong className="font-mono text-brand-red">{hrs.toFixed(1)} horas</strong>
                      </div>
                    ))
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
                    "Ordens Finalizadas": p.total_os,
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

          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-4">Profissional</th>
                  <th className="p-4">Cargo</th>
                  <th className="p-4 text-center">O.S. Finalizadas</th>
                  <th className="p-4 text-center">Horas de Campo</th>
                  <th className="p-4 text-center">KM Deslocamento</th>
                  <th className="p-4 text-right">Faturamento M.O.</th>
                  <th className="p-4 text-right">Faturamento Geral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredProductivity.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">Nenhum técnico correspondente.</td>
                  </tr>
                ) : (
                  filteredProductivity.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-brand-ink">
                        {p.nome} <span className="text-gray-400 font-normal">({p.apelido})</span>
                      </td>
                      <td className="p-4 text-gray-500 font-semibold">{p.cargo}</td>
                      <td className="p-4 text-center font-bold text-gray-800">{p.total_os}</td>
                      <td className="p-4 text-center font-mono font-bold text-brand-red">{p.horas_trabalhadas} h</td>
                      <td className="p-4 text-center font-mono text-gray-600">{p.km_percorrido} km</td>
                      <td className="p-4 text-right font-mono font-bold text-gray-700">
                        {p.faturamento_mao_obra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-700">
                        {p.faturamento_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                  ))
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
    </div>
  );
};
