/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Users, 
  Tractor, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  Plus,
  ArrowUpRight,
  ChevronRight,
  ShieldAlert,
  Activity,
  Briefcase,
  ListFilter
} from "lucide-react";
import { Cliente, Implemento, OrdemServico, Tecnico } from "../types";
import { getRevisionAlerts } from "../lib/revisionAlerts";
import { RevisoesAlertsModal } from "./RevisoesAlertsModal";

interface DashboardViewProps {
  clientes: Cliente[];
  implementos: Implemento[];
  tecnicos: Tecnico[];
  ordens: OrdemServico[];
  onNavigate: (view: string, targetId?: number, params?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  clientes,
  implementos,
  tecnicos,
  ordens,
  onNavigate
}) => {
  // Compute metric numbers
  const totalClientes = clientes.length;
  const clientesAtivos = clientes.filter(c => c.ativo !== false).length;
  const clientesAtivosPct = totalClientes > 0 ? Math.round((clientesAtivos / totalClientes) * 100) : 100;
  
  const totalImplementos = implementos.length;
  const implementosAtivos = implementos.filter(i => i.ativo !== false).length;
  const implementosAtivosPct = totalImplementos > 0 ? Math.round((implementosAtivos / totalImplementos) * 100) : 100;
  
  const totalTecnicos = tecnicos.length;
  const tecnicosAtivos = tecnicos.filter(t => t.ativo !== false).length;

  const osAbertas = ordens.filter(o => o.status === "ABERTA").length;
  const osAtendimento = ordens.filter(o => o.status === "EM ATENDIMENTO").length;
  const osAgendadas = ordens.filter(o => o.status === "AGENDADA").length;
  const osAguardando = ordens.filter(o => o.status === "AGUARDANDO").length;
  const osFinalizadas = ordens.filter(o => o.status === "FINALIZADA").length;

  // Calculate total earnings from finalized O.S.
  const faturamentoTotal = ordens
    .filter(o => o.status === "FINALIZADA")
    .reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0);

  // Filter latest orders (up to 5)
  const ultimasOS = ordens.slice(0, 5);

  // Calculate preventive maintenance revision alerts
  const [revisoesModalOpen, setRevisoesModalOpen] = useState(false);
  const revisionAlerts = getRevisionAlerts(implementos, ordens, clientes);
  const overdueCount = revisionAlerts.filter(a => a.status === "ATRASADA").length;
  const upcomingCount = revisionAlerts.filter(a => a.status === "PROXIMA").length;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04
      }
    }
  };

  const itemVariants = {
    hidden: { y: 12, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 120, damping: 14 } }
  };

  return (
    <motion.div 
      className="space-y-7"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">
            Painel Geral
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Métricas operacionais de campo, faturamento de ordens de serviço e frota monitorada.
          </p>
        </div>
      </div>

      {/* Main KPI counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI: Clientes */}
        <motion.div 
          variants={itemVariants}
          onClick={() => onNavigate("clientes")}
          className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md hover:border-gray-300 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-sky-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Clientes</span>
              <h2 className="text-3xl font-extrabold font-display text-brand-ink leading-tight">
                {totalClientes}
              </h2>
            </div>
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <strong className="text-sky-600 font-bold">{clientesAtivos} ativos</strong>
            </span>
            <span className="text-gray-400 font-mono">{clientesAtivosPct}%</span>
          </div>
        </motion.div>

        {/* KPI: Implementos */}
        <motion.div 
          variants={itemVariants}
          onClick={() => onNavigate("implementos")}
          className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md hover:border-gray-300 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-amber-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Implementos / Frota</span>
              <h2 className="text-3xl font-extrabold font-display text-brand-ink leading-tight">
                {totalImplementos}
              </h2>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
              <Tractor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
              <strong className="text-amber-600 font-bold">{implementosAtivos} frotas</strong>
            </span>
            <span className="text-gray-400 font-mono">{implementosAtivosPct}%</span>
          </div>
        </motion.div>

        {/* KPI: Técnicos */}
        <motion.div 
          variants={itemVariants}
          onClick={() => onNavigate("tecnicos")}
          className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md hover:border-gray-300 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-indigo-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Corpo Técnico</span>
              <h2 className="text-3xl font-extrabold font-display text-brand-ink leading-tight">
                {totalTecnicos}
              </h2>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <strong className="text-indigo-600 font-bold">{tecnicosAtivos} operando</strong>
            </span>
            <span className="text-gray-400">Ativos</span>
          </div>
        </motion.div>

        {/* KPI: Faturamento */}
        <motion.div 
          variants={itemVariants}
          onClick={() => onNavigate("comissoes")}
          className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md hover:border-gray-300 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-emerald-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Faturamento (O.S. Finalizadas)</span>
              <h2 className="text-2xl font-black font-mono text-brand-ink mt-1 tracking-tight">
                {faturamentoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h2>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <strong className="text-emerald-600 font-bold">{osFinalizadas} concluídas</strong>
            </span>
            <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 border border-emerald-100/50 px-1.5 py-0.5 rounded-md">Realizado</span>
          </div>
        </motion.div>
      </div>

      {/* Painel de Ordens de Serviço por Status */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-red" /> Ordens de Serviço por Status
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Card: Abertas */}
          <motion.div
            variants={itemVariants}
            onClick={() => onNavigate("os", undefined, { status: "ABERTA" })}
            className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between min-h-[140px]"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Abertas</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-extrabold font-display text-brand-ink leading-none">
                {osAbertas}
              </h2>
              <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wide">Aguardando início</p>
            </div>
          </motion.div>

          {/* Card: Agendadas */}
          <motion.div
            variants={itemVariants}
            onClick={() => onNavigate("os", undefined, { status: "AGENDADA" })}
            className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md hover:border-orange-300 transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between min-h-[140px]"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-orange-500" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Agendadas</span>
              <div className="p-2 bg-orange-50 text-orange-600 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-extrabold font-display text-brand-ink leading-none">
                {osAgendadas}
              </h2>
              <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wide">Programadas</p>
            </div>
          </motion.div>

          {/* Card: Em Atendimento */}
          <motion.div
            variants={itemVariants}
            onClick={() => onNavigate("os", undefined, { status: "EM ATENDIMENTO" })}
            className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between min-h-[140px]"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-500" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Em Atendimento</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-extrabold font-display text-brand-ink leading-none">
                {osAtendimento}
              </h2>
              <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wide">Executando em campo</p>
            </div>
          </motion.div>

          {/* Card: Aguardando Peças */}
          <motion.div
            variants={itemVariants}
            onClick={() => onNavigate("os", undefined, { status: "AGUARDANDO" })}
            className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between min-h-[140px]"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-purple-500" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Aguardando Peças</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-extrabold font-display text-brand-ink leading-none">
                {osAguardando}
              </h2>
              <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wide">Pendente de peças</p>
            </div>
          </motion.div>

          {/* Card: Finalizadas */}
          <motion.div
            variants={itemVariants}
            onClick={() => onNavigate("os", undefined, { status: "FINALIZADA" })}
            className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between min-h-[140px]"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Concluídas</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-extrabold font-display text-brand-ink leading-none">
                {osFinalizadas}
              </h2>
              <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wide">Finalizadas</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Grid: Latest Orders & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Orders */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs lg:col-span-2">
          <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
            <div>
              <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                Ordens de Serviço Recentes
              </h3>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Últimos atendimentos de assistência técnica.</p>
            </div>
            <button 
              onClick={() => onNavigate("os")}
              className="text-xs font-black text-brand-red flex items-center gap-1 hover:underline uppercase tracking-wider"
            >
              Ver todas <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {ultimasOS.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl bg-gray-50/20">
                Nenhuma Ordem de Serviço cadastrada recentemente.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="pb-3 w-20">O.S.</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Equipamento</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ultimasOS.map((os) => {
                    const statusColors: Record<string, string> = {
                      ABERTA: "bg-amber-50 text-amber-800 border-amber-200/50",
                      "EM ATENDIMENTO": "bg-blue-50 text-blue-800 border-blue-200/50",
                      AGENDADA: "bg-orange-50 text-orange-800 border-orange-200/50",
                      AGUARDANDO: "bg-purple-50 text-purple-800 border-purple-200/50",
                      FINALIZADA: "bg-emerald-50 text-emerald-800 border-emerald-200/50",
                      CANCELADA: "bg-rose-50 text-rose-800 border-rose-200/50"
                    };

                    return (
                      <tr key={os.id} className="text-xs hover:bg-gray-50/75 transition-colors">
                        <td className="py-3 font-black text-gray-800 font-mono">{os.numero_os}</td>
                        <td className="py-3 font-bold text-gray-700 max-w-[180px] truncate">
                          {os.clientes?.razao_social || "Cliente Indefinido"}
                        </td>
                        <td className="py-3 text-gray-500 font-semibold">{os.implementos?.modelo || "Serviço Geral"}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${statusColors[os.status] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
                            {os.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button 
                            onClick={() => onNavigate("os", os.id)}
                            className="text-xs font-black text-brand-red hover:underline uppercase tracking-wider"
                          >
                            Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Operations Guide & System Info */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="border-b border-gray-100 pb-4 mb-4">
              <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                Atalhos Rápidos
              </h3>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Operações de rotina do sistema.</p>
            </div>

            <div className="space-y-2.5">
              <button 
                onClick={() => onNavigate("os", 0)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-150 hover:border-brand-red hover:bg-rose-50/10 text-left transition-all duration-250 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-100">
                    <Plus className="w-4 h-4 shrink-0" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-700">Nova Ordem de Serviço</h4>
                    <p className="text-[10px] text-gray-400 font-semibold">Abertura rápida de novo atendimento técnico</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-brand-red group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>

              <button 
                onClick={() => onNavigate("implementos")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-150 hover:border-brand-red hover:bg-rose-50/10 text-left transition-all duration-250 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100">
                    <Tractor className="w-4 h-4 shrink-0" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-700">Frota Monitorada</h4>
                    <p className="text-[10px] text-gray-400 font-semibold">Verificar horímetros, modelos e clientes</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-brand-red group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>

              <button 
                onClick={() => onNavigate("planos")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-150 hover:border-brand-red hover:bg-rose-50/10 text-left transition-all duration-250 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100">
                    <FileText className="w-4 h-4 shrink-0" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-700">Planos de Revisão</h4>
                    <p className="text-[10px] text-gray-400 font-semibold">Configurar checklists preventivos de 250h/500h</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-brand-red group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>

              <button 
                onClick={() => onNavigate("comissoes")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-150 hover:border-brand-red hover:bg-rose-50/10 text-left transition-all duration-250 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100">
                    <DollarSign className="w-4 h-4 shrink-0" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-700">Comissões de Campo</h4>
                    <p className="text-[10px] text-gray-400 font-semibold">Auditar ganhos dos técnicos e mecânicos</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-brand-red group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner Widget: Revisões Preventivas Pendentes / Próximas */}
      {revisionAlerts.length > 0 ? (
        <motion.div 
          variants={itemVariants}
          className={`bg-white rounded-2xl p-5 shadow-xs border relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
            overdueCount > 0 ? "border-rose-200 bg-rose-50/40" : "border-amber-200 bg-amber-50/30"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl shrink-0 mt-0.5 border ${
              overdueCount > 0 
                ? "bg-rose-100 text-rose-700 border-rose-200" 
                : "bg-amber-100 text-amber-800 border-amber-200"
            }`}>
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-extrabold text-lg uppercase tracking-wide text-gray-900">
                  Alertas de Revisão Preventiva
                </h3>
                {overdueCount > 0 && (
                  <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs">
                    ⚠️ {overdueCount} {overdueCount === 1 ? "Vencida" : "Vencidas"}
                  </span>
                )}
                {upcomingCount > 0 && (
                  <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs">
                    🔔 {upcomingCount} {upcomingCount === 1 ? "Próxima" : "Próximas"} (&lt;50h)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 font-medium max-w-2xl">
                Existem máquinas na frota que atingiram ou estão próximas do limite de horímetro previsto nos planos de manutenção preventiva.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setRevisoesModalOpen(true)}
              className="px-4 py-2.5 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ListFilter className="w-4 h-4" />
              Ver Lista de Revisões ({revisionAlerts.length})
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          variants={itemVariants}
          className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs font-medium"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              <strong className="font-extrabold text-emerald-900 uppercase">Manutenção Preventiva em Dia:</strong> Nenhuma revisão por horímetro está pendente ou próxima do limite no momento.
            </span>
          </div>
          <button
            onClick={() => setRevisoesModalOpen(true)}
            className="text-xs font-bold text-emerald-700 hover:underline uppercase tracking-wider shrink-0"
          >
            Ver Frota Monitorada
          </button>
        </motion.div>
      )}

      {/* Revision Alerts Modal */}
      <RevisoesAlertsModal 
        isOpen={revisoesModalOpen}
        onClose={() => setRevisoesModalOpen(false)}
        alerts={revisionAlerts}
        onNavigate={onNavigate}
      />
    </motion.div>
  );
};
