/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  BookOpen, 
  Calendar, 
  Settings, 
  Wrench, 
  PlusCircle, 
  ArrowLeft,
  AlertCircle,
  Copy,
  ShieldAlert,
  Clock,
  ListFilter,
  Tractor,
  Building2,
  Layers,
  CheckCircle2,
  ChevronRight,
  Database
} from "lucide-react";
import { PlanoManutencao, PlanoRevisao, Implemento, OrdemServico, Cliente } from "../types";
import { API } from "../lib/api";
import { getRevisionAlerts, RevisionAlert } from "../lib/revisionAlerts";

interface PlanosViewProps {
  onNavigate?: (view: string, targetId?: number) => void;
}

export const PlanosView: React.FC<PlanosViewProps> = ({ onNavigate }) => {
  const [planos, setPlanos] = useState<PlanoManutencao[]>([]);
  const [selectedPlano, setSelectedPlano] = useState<PlanoManutencao | null>(null);
  const [revisoes, setRevisoes] = useState<PlanoRevisao[]>([]);

  // Main Tabs inside PlanosView
  const [mainTab, setMainTab] = useState<"planos" | "alertas">("planos");

  // Fleet data for Alertas tab
  const [implementos, setImplementos] = useState<Implemento[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [alertSearch, setAlertSearch] = useState("");
  const [alertFilter, setAlertFilter] = useState<"TODAS" | "ATRASADA" | "PROXIMA">("TODAS");

  // Modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isRevModalOpen, setIsRevModalOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<PlanoManutencao | null>(null);
  const [editingRevisao, setEditingRevisao] = useState<PlanoRevisao | null>(null);

  // Form states for Plan
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [garantia, setGarantia] = useState<number>(12);
  const [horimetroBase, setHorimetroBase] = useState<number>(50);
  const [ativo, setAtivo] = useState(true);
  const [observacao, setObservacao] = useState("");
  const [grupo, setGrupo] = useState("TRATORES");

  // Form states for Revision
  const [revisaoNum, setRevisaoNum] = useState<number>(1);
  const [horasLimite, setHorasLimite] = useState<number>(250);
  const [mesesLimite, setMesesLimite] = useState<number>(12);
  const [revDesc, setRevDesc] = useState("");

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadPlanos();
    loadFleetData();
  }, []);

  const loadFleetData = async () => {
    try {
      const [implList, osList, cliList] = await Promise.all([
        API.implementos.listar(),
        API.ordensServico.listar(),
        API.clientes.listar()
      ]);
      setImplementos(implList || []);
      setOrdens(osList || []);
      setClientes(cliList || []);
    } catch (e) {
      console.error("Error loading fleet data in PlanosView:", e);
    }
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadPlanos = async () => {
    const list = await API.planos.listar();
    setPlanos(list || []);
  };

  const loadRevisoes = async (planoId: string) => {
    const list = await API.planos.revisoes.listar(planoId);
    setRevisoes(list || []);
  };

  // Plan CRUD
  const openPlanForm = (plano: PlanoManutencao | null = null) => {
    if (plano) {
      setEditingPlano(plano);
      setFabricante(plano.fabricante);
      setModelo(plano.modelo);
      setGarantia(plano.garantia_meses);
      setHorimetroBase(plano.horimetro_base);
      setAtivo(plano.ativo);
      setObservacao(plano.observacao || "");
      setGrupo(plano.grupo || "TRATORES");
    } else {
      setEditingPlano(null);
      setFabricante("");
      setModelo("");
      setGarantia(12);
      setHorimetroBase(50);
      setAtivo(true);
      setObservacao("");
      setGrupo("TRATORES");
    }
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fabricante.trim() || !modelo.trim()) {
      showToast("Fabricante e Modelo são obrigatórios.", "error");
      return;
    }

    const payload: PlanoManutencao = {
      id: editingPlano?.id || "",
      fabricante: fabricante.toUpperCase(),
      modelo: modelo.toUpperCase(),
      garantia_meses: Number(garantia),
      horimetro_base: Number(horimetroBase),
      ativo,
      observacao,
      grupo
    };

    const savedPlano = await API.planos.salvar(payload);
    showToast("Plano de manutenção salvo com sucesso!");
    setIsPlanModalOpen(false);
    await loadPlanos();
    if (selectedPlano && selectedPlano.id === payload.id) {
      setSelectedPlano(savedPlano || payload);
    }
  };

  // Delete Confirmation Modal State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: "plan" | "revisao";
    id?: string;
    title: string;
    subtitle?: string;
    rev?: PlanoRevisao;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeletePlan = (p: PlanoManutencao) => {
    setDeleteConfirmTarget({
      type: "plan",
      id: p.id,
      title: `Excluir Plano: ${p.fabricante} — ${p.modelo}`,
      subtitle: "Todas as regras de revisões cadastradas para este modelo também serão excluídas do sistema."
    });
  };

  const confirmDeleteRevision = (rev: PlanoRevisao) => {
    setDeleteConfirmTarget({
      type: "revisao",
      title: `Excluir ${rev.revisao_numero}ª Revisão (${rev.horas_limite}h)`,
      subtitle: rev.descricao ? `Operação: ${rev.descricao}` : "Esta etapa de revisão será permanentemente removida.",
      rev
    });
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmTarget) return;
    setIsDeleting(true);
    try {
      if (deleteConfirmTarget.type === "plan" && deleteConfirmTarget.id) {
        await API.planos.excluir(deleteConfirmTarget.id);
        showToast("Plano de manutenção excluído com sucesso.");
        await loadPlanos();
        if (selectedPlano?.id === deleteConfirmTarget.id) {
          setSelectedPlano(null);
          setRevisoes([]);
        }
      } else if (deleteConfirmTarget.type === "revisao" && deleteConfirmTarget.rev) {
        const r = deleteConfirmTarget.rev;
        await API.planos.revisoes.excluir(r.id_revisao || "", r.id_plano, r.revisao_numero);
        showToast("Revisão excluída com sucesso.");
        if (selectedPlano) {
          await loadRevisoes(selectedPlano.id);
        }
      }
      setDeleteConfirmTarget(null);
    } catch (err: any) {
      showToast("Erro ao excluir: " + (err.message || "Erro desconhecido"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy plan state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [planToCopy, setPlanToCopy] = useState<PlanoManutencao | null>(null);
  const [copyFabricante, setCopyFabricante] = useState("");
  const [copyModelo, setCopyModelo] = useState("");
  const [copyGrupo, setCopyGrupo] = useState("TRATORES");
  const [copyObservacao, setCopyObservacao] = useState("");
  const [isCopying, setIsCopying] = useState(false);

  const openCopyModal = (plano: PlanoManutencao) => {
    setPlanToCopy(plano);
    setCopyFabricante(plano.fabricante);
    setCopyModelo(`${plano.modelo} (CÓPIA)`);
    setCopyGrupo(plano.grupo || "TRATORES");
    setCopyObservacao(plano.observacao || "");
    setIsCopyModalOpen(true);
  };

  const handleCopyPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planToCopy) return;
    if (!copyFabricante.trim() || !copyModelo.trim()) {
      showToast("Fabricante e Modelo são obrigatórios.", "error");
      return;
    }

    setIsCopying(true);
    try {
      // 1. Create the new plan
      const newPlanPayload: PlanoManutencao = {
        id: "",
        fabricante: copyFabricante.trim().toUpperCase(),
        modelo: copyModelo.trim().toUpperCase(),
        garantia_meses: Number(planToCopy.garantia_meses || 12),
        horimetro_base: Number(planToCopy.horimetro_base || 50),
        ativo: true,
        observacao: copyObservacao.trim(),
        grupo: copyGrupo.trim().toUpperCase()
      };

      const savedNewPlan = await API.planos.salvar(newPlanPayload);

      // 2. Fetch original revisions
      const sourceRevisoes = await API.planos.revisoes.listar(planToCopy.id);

      // 3. Copy all revisions to the new plan
      if (sourceRevisoes && sourceRevisoes.length > 0) {
        for (const rev of sourceRevisoes) {
          const newRevPayload: PlanoRevisao = {
            id_plano: savedNewPlan.id,
            revisao_numero: rev.revisao_numero,
            horas_limite: rev.horas_limite,
            meses_limite: rev.meses_limite,
            descricao: rev.descricao
          };
          await API.planos.revisoes.salvar(newRevPayload);
        }
      }

      showToast(`Plano duplicado com sucesso para ${savedNewPlan.fabricante} - ${savedNewPlan.modelo}!`);
      setIsCopyModalOpen(false);
      await loadPlanos();
      // If currently viewing details, update selected plan to the new one
      if (selectedPlano) {
        setSelectedPlano(savedNewPlan);
        await loadRevisoes(savedNewPlan.id);
      }
    } catch (err: any) {
      showToast(err.message || "Erro ao duplicar plano.", "error");
    } finally {
      setIsCopying(false);
    }
  };

  // Revision CRUD
  const openRevForm = (rev: PlanoRevisao | null = null) => {
    if (!selectedPlano) return;
    if (rev) {
      setEditingRevisao(rev);
      setRevisaoNum(rev.revisao_numero);
      setHorasLimite(rev.horas_limite);
      setMesesLimite(rev.meses_limite);
      setRevDesc(rev.descricao);
    } else {
      setEditingRevisao(null);
      // Auto-project next revision number
      const nextNum = revisoes.reduce((max, r) => Math.max(max, r.revisao_numero), 0) + 1;
      setRevisaoNum(nextNum);
      setHorasLimite(nextNum * 250);
      setMesesLimite(nextNum * 6);
      setRevDesc("");
    }
    setIsRevModalOpen(true);
  };

  const handleSaveRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlano) return;

    const payload: PlanoRevisao = {
      id_revisao: editingRevisao?.id_revisao || "",
      id_plano: selectedPlano.id,
      revisao_numero: Number(revisaoNum),
      horas_limite: Number(horasLimite),
      meses_limite: Number(mesesLimite),
      descricao: revDesc
    };

    try {
      await API.planos.revisoes.salvar(payload);
      showToast("Revisão salva com sucesso!");
      setIsRevModalOpen(false);
      await loadRevisoes(selectedPlano.id);
    } catch (err: any) {
      showToast(err.message || "Erro ao salvar revisão.", "error");
    }
  };

  const handleDeleteRevision = async (rev: PlanoRevisao) => {
    if (!confirm(`Deseja realmente excluir a ${rev.revisao_numero}ª Revisão (${rev.horas_limite}h)?`)) return;
    await API.planos.revisoes.excluir(rev.id_revisao || "", rev.id_plano, rev.revisao_numero);
    showToast("Revisão removida.");
    if (selectedPlano) {
      await loadRevisoes(selectedPlano.id);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${
              toastMessage.type === "success" ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedPlano ? (
        // List plans view
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">
                Planos de Manutenção
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Planos preventivos severos ou moderados de revisões para tratores e colhedoras.
              </p>
            </div>

            {mainTab === "planos" && (
              <button
                onClick={() => openPlanForm(null)}
                className="btn bg-brand-red text-white hover:bg-brand-red-dark border-none shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Novo Plano
              </button>
            )}
          </div>

          {/* Top Subtabs Navigation Bar */}
          {(() => {
            const revisionAlerts = getRevisionAlerts(implementos, ordens, clientes);
            const overdueCount = revisionAlerts.filter(a => a.status === "ATRASADA").length;
            const upcomingCount = revisionAlerts.filter(a => a.status === "PROXIMA").length;

            return (
              <>
                <div className="flex border-b border-gray-200 gap-2">
                  <button
                    onClick={() => setMainTab("planos")}
                    className={`pb-3 px-4 text-xs font-extrabold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
                      mainTab === "planos"
                        ? "border-brand-red text-brand-red"
                        : "border-transparent text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Modelos e Planos Cadastrados ({planos.length})
                  </button>

                  <button
                    onClick={() => setMainTab("alertas")}
                    className={`pb-3 px-4 text-xs font-extrabold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 relative ${
                      mainTab === "alertas"
                        ? "border-brand-red text-brand-red"
                        : "border-transparent text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Alertas de Revisão Preventiva ({revisionAlerts.length})
                    {overdueCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-full">
                        {overdueCount}
                      </span>
                    )}
                  </button>
                </div>

                {mainTab === "alertas" && (
                  <div className="space-y-4">
                    {/* 5 KPI Metric Cards */}
                    {(() => {
                      const totalMonitorados = implementos.filter(i => i.plano_id).length || implementos.length;
                      const revisoesSemana = revisionAlerts.length;
                      const vencidasCount = overdueCount;
                      const proximas50hCount = upcomingCount;
                      const criticasCount = revisionAlerts.filter(a => a.status === "ATRASADA" && Math.abs(a.horasFaltantes) >= 50).length;

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                          {/* Card 1: Monitorados */}
                          <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-gray-400 block tracking-wider">Monitorados</span>
                              <span className="text-xl font-black font-mono text-slate-800">{totalMonitorados}</span>
                            </div>
                            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                              <Tractor className="w-5 h-5" />
                            </div>
                          </div>

                          {/* Card 2: Revisões esta semana */}
                          <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-gray-400 block tracking-wider">Revisões esta semana</span>
                              <span className="text-xl font-black font-mono text-blue-600">{revisoesSemana}</span>
                            </div>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <Calendar className="w-5 h-5" />
                            </div>
                          </div>

                          {/* Card 3: Vencidas */}
                          <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-rose-700 block tracking-wider">Vencidas</span>
                              <span className="text-xl font-black font-mono text-rose-600">{vencidasCount}</span>
                            </div>
                            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                              <AlertCircle className="w-5 h-5" />
                            </div>
                          </div>

                          {/* Card 4: Próximas (50h) */}
                          <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-amber-800 block tracking-wider">Próximas (50h)</span>
                              <span className="text-xl font-black font-mono text-amber-600">{proximas50hCount}</span>
                            </div>
                            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                              <Clock className="w-5 h-5" />
                            </div>
                          </div>

                          {/* Card 5: Crítica */}
                          <div className="p-3.5 bg-rose-100/80 border border-rose-300 rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-rose-900 block tracking-wider">Crítica</span>
                              <span className="text-xl font-black font-mono text-rose-700">{criticasCount}</span>
                            </div>
                            <div className="p-2 bg-rose-200/90 text-rose-800 rounded-lg">
                              <ShieldAlert className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Filters */}
                    <div className="p-4 bg-white border border-gray-200 rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="Buscar equipamento, série, cliente..." 
                          value={alertSearch}
                          onChange={(e) => setAlertSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setAlertFilter("TODAS")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                            alertFilter === "TODAS" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Todas ({revisionAlerts.length})
                        </button>
                        <button
                          onClick={() => setAlertFilter("ATRASADA")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 ${
                            alertFilter === "ATRASADA" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                          }`}
                        >
                          ⚠️ Pendentes / Vencidas ({overdueCount})
                        </button>
                        <button
                          onClick={() => setAlertFilter("PROXIMA")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 ${
                            alertFilter === "PROXIMA" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                          }`}
                        >
                          🔔 Próximas ({revisionAlerts.length - overdueCount})
                        </button>
                      </div>
                    </div>

                    {/* Revision Cards List */}
                    <div className="space-y-3">
                      {revisionAlerts
                        .filter(item => {
                          const matchesFilter = alertFilter === "TODAS" || item.status === alertFilter;
                          const term = alertSearch.toLowerCase();
                          const matchesSearch = 
                            item.implemento.modelo?.toLowerCase().includes(term) ||
                            item.implemento.fabricante?.toLowerCase().includes(term) ||
                            item.implemento.numero_serie?.toLowerCase().includes(term) ||
                            item.clienteName.toLowerCase().includes(term) ||
                            item.revisao.descricao?.toLowerCase().includes(term);

                          return matchesFilter && matchesSearch;
                        })
                        .map(item => {
                          const isOverdue = item.status === "ATRASADA";
                          return (
                            <div 
                              key={item.id}
                              className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                isOverdue 
                                  ? "border-rose-200 bg-rose-50/20" 
                                  : "border-amber-200 bg-amber-50/10"
                              }`}
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                                    isOverdue 
                                      ? "bg-rose-100 text-rose-800 border-rose-300" 
                                      : "bg-amber-100 text-amber-900 border-amber-300"
                                  }`}>
                                    {isOverdue ? "⚠️ PENDENTE / ATRASADA" : "🔔 PRÓXIMA DO LIMITE"}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase font-mono">
                                    Nº Série: {item.implemento.numero_serie || "S/N"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Tractor className="w-4 h-4 text-slate-700 shrink-0" />
                                  <h4 className="font-extrabold text-sm text-gray-900 font-display uppercase">
                                    {item.implemento.fabricante ? `${item.implemento.fabricante} ` : ""}{item.implemento.modelo || "Equipamento"}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-gray-500 font-medium flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                    <strong>Cliente:</strong> {item.clienteName}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Layers className="w-3.5 h-3.5 text-gray-400" />
                                    <strong>Etapa #{item.revisao.revisao_numero}:</strong> {item.revisao.horas_limite}h ({item.revisao.descricao || "Revisão Preventiva"})
                                  </span>
                                </div>
                              </div>

                              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center shrink-0 min-w-[160px]">
                                <span className="text-[10px] font-extrabold text-gray-400 uppercase block tracking-wider">Horímetro Atual</span>
                                <span className="font-mono font-black text-gray-800 text-base">{item.currentHorimetro} h</span>
                                <div className={`mt-1 text-[11px] font-extrabold font-mono px-2 py-0.5 rounded ${
                                  isOverdue ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"
                                }`}>
                                  {isOverdue ? `Excedido em ${Math.abs(item.horasFaltantes)}h` : `Faltam ${item.horasFaltantes}h`}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => onNavigate?.("os", 0)}
                                  className="px-3 py-2 bg-brand-red hover:bg-red-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" /> Abrir O.S.
                                </button>
                              </div>
                            </div>
                          );
                        })}

                      {revisionAlerts.length === 0 && (
                        <div className="p-8 text-center bg-white border border-gray-200 rounded-xl text-gray-500">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                          <p className="font-bold text-sm">Nenhuma revisão pendente ou próxima no momento.</p>
                          <p className="text-xs text-gray-400 mt-1">Todos os equipamentos vinculados aos planos de manutenção estão com as revisões em dia.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Grid Layout of active plans */}
          {mainTab === "planos" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planos.map(p => {
              const revsCount = API.planos.revisoes.listar(p.id).length;
              return (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -3 }}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-brand-red" />
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase tracking-wider">
                        {p.grupo || "GERAL"}
                      </span>
                      <strong className="text-gray-400 font-mono font-bold">#{p.id}</strong>
                    </div>

                    <h3 className="font-display font-extrabold text-lg text-brand-ink uppercase mt-2">
                      {p.fabricante} — {p.modelo}
                    </h3>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed line-clamp-2">
                      {p.observacao || "Plano padrão sem detalhes adicionais ou regras severas."}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
                      <div>
                        <strong>Revisões:</strong> {revsCount} níveis
                      </div>
                      <div>
                        <strong>Garantia:</strong> {p.garantia_meses} meses
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedPlano(p);
                        loadRevisoes(p.id);
                      }}
                      className="flex-1 py-1.5 px-3 bg-gray-900 text-white rounded text-center font-bold uppercase tracking-wide hover:bg-black transition-colors"
                    >
                      Configurar Revisões
                    </button>
                    <button
                      onClick={() => openCopyModal(p)}
                      title="Copiar / Duplicar este plano para outro modelo"
                      className="p-1.5 text-amber-600 border border-gray-200 rounded hover:bg-amber-50 flex items-center justify-center"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openPlanForm(p)}
                      title="Editar Plano"
                      className="p-1.5 text-sky-600 border border-gray-200 rounded hover:bg-sky-50 flex items-center justify-center"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => confirmDeletePlan(p)}
                      title="Excluir Plano"
                      className="p-1.5 text-rose-600 border border-gray-200 rounded hover:bg-rose-50 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          )}
        </div>
      ) : (
        // Detalhes do Plano + Cadastros de Revisões (50H, 250H, etc)
        <div className="space-y-6 animate-fade">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedPlano(null)}
              className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 shadow-sm flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar aos Planos
            </button>
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-gray-800">
              Grade de Revisões Preventivas
            </h2>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="font-display font-extrabold text-xl text-brand-ink uppercase">
                {selectedPlano.fabricante} — {selectedPlano.modelo}
              </h3>
              <p className="text-gray-500 text-xs mt-1">Configure todos os níveis de horímetro para disparos de preventiva.</p>
            </div>
            <button
              onClick={() => openCopyModal(selectedPlano)}
              className="px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto"
            >
              <Copy className="w-4 h-4" />
              Copiar para Outro Modelo
            </button>
          </div>

          {/* List of Revisions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <strong className="text-xs font-bold uppercase text-brand-red tracking-wider">Cronograma de Atendimento</strong>
              <button
                onClick={() => openRevForm(null)}
                className="btn bg-brand-red text-white hover:bg-brand-red-dark text-xs py-1.5 px-3 flex items-center gap-1 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" /> Adicionar Nível de Revisão
              </button>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-4 text-center w-24">Nível</th>
                  <th className="p-4">Limite de Horímetro</th>
                  <th className="p-4">Tempo Limite (Meses)</th>
                  <th className="p-4">Descrição das Operações Técnicas</th>
                  <th className="p-4 text-right w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {revisoes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">Nenhum patamar ou nível de revisão cadastrado para este plano.</td>
                  </tr>
                ) : (
                  revisoes.map(r => (
                    <tr key={r.id_revisao} className="hover:bg-gray-50/50">
                      <td className="p-4 text-center font-bold text-brand-ink font-display text-sm">{r.revisao_numero}ª Revisão</td>
                      <td className="p-4 font-mono font-bold text-emerald-700">{r.horas_limite} horas</td>
                      <td className="p-4 text-gray-500">{r.meses_limite} meses</td>
                      <td className="p-4 text-gray-600 max-w-sm font-semibold">{r.descricao}</td>
                      <td className="p-4 text-right space-x-1">
                        <button
                          onClick={() => openRevForm(r)}
                          className="p-1 text-sky-600 hover:bg-sky-50 rounded"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDeleteRevision(r)}
                          title="Excluir Revisão"
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan Form Modal */}
      <AnimatePresence>
        {isPlanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto text-brand-ink">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-brand-red" />
                  <h3 className="font-display font-extrabold uppercase text-base tracking-wider">
                    {editingPlano ? "Editar Plano" : "Novo Plano de Manutenção"}
                  </h3>
                </div>
                <button onClick={() => setIsPlanModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Fabricante *</label>
                    <input
                      type="text"
                      required
                      value={fabricante}
                      onChange={(e) => setFabricante(e.target.value)}
                      placeholder="JOHN DEERE"
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Modelo *</label>
                    <input
                      type="text"
                      required
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      placeholder="8370R"
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Meses de Garantia</label>
                    <input
                      type="number"
                      required
                      value={garantia}
                      onChange={(e) => setGarantia(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Horímetro Base (h)</label>
                    <input
                      type="number"
                      required
                      value={horimetroBase}
                      onChange={(e) => setHorimetroBase(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Grupo</label>
                    <select
                      value={grupo}
                      onChange={(e) => setGrupo(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                    >
                      <option>TRATORES</option>
                      <option>COLHEDORAS</option>
                      <option>PULVERIZADORES</option>
                      <option>PLANTADEIRAS</option>
                      <option>OUTROS</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Status</label>
                  <select
                    value={ativo ? "true" : "false"}
                    onChange={(e) => setAtivo(e.target.value === "true")}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Observações do Plano</label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={3}
                    placeholder="Regras severas de poeira ou uso contínuo..."
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red min-h-[60px]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsPlanModalOpen(false)}
                    className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn bg-brand-red text-white hover:bg-brand-red-dark text-xs py-1.5 shadow-sm"
                  >
                    Salvar Plano
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Revision Form Modal */}
      <AnimatePresence>
        {isRevModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto text-brand-ink">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-brand-red" />
                  <h3 className="font-display font-extrabold uppercase text-base tracking-wider">
                    {editingRevisao ? "Editar Nível" : "Novo Nível de Revisão"}
                  </h3>
                </div>
                <button onClick={() => setIsRevModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRevision} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nº Revisão *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={revisaoNum}
                      onChange={(e) => setRevisaoNum(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Horas Limite *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={horasLimite}
                      onChange={(e) => setHorasLimite(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Meses Limite *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={mesesLimite}
                      onChange={(e) => setMesesLimite(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Descrição das Operações / Checkmarks *</label>
                  <textarea
                    required
                    value={revDesc}
                    onChange={(e) => setRevDesc(e.target.value)}
                    rows={4}
                    placeholder="Regulagem de válvulas, troca de óleo lubrificante de cárter, substituição de filtros de combustível e óleo hidráulico..."
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red min-h-[90px]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsRevModalOpen(false)}
                    className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn bg-brand-red text-white hover:bg-brand-red-dark text-xs py-1.5 shadow-sm"
                  >
                    Salvar Revisão
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Copy Plan Modal */}
      <AnimatePresence>
        {isCopyModalOpen && planToCopy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto text-brand-ink">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Copy className="w-5 h-5 text-amber-400" />
                  <h3 className="font-display font-extrabold uppercase text-base tracking-wider">
                    Duplicar Plano de Manutenção
                  </h3>
                </div>
                <button
                  onClick={() => setIsCopyModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                  disabled={isCopying}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCopyPlan} className="p-5 space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                  <p className="font-bold">Plano Origem: {planToCopy.fabricante} — {planToCopy.modelo}</p>
                  <p className="text-[11px] text-amber-700">
                    Todas as revisões e regras cadastradas neste plano serão copiadas para o novo modelo criado.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Novo Fabricante *</label>
                    <input
                      type="text"
                      required
                      value={copyFabricante}
                      onChange={(e) => setCopyFabricante(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Novo Modelo *</label>
                    <input
                      type="text"
                      required
                      value={copyModelo}
                      onChange={(e) => setCopyModelo(e.target.value)}
                      placeholder="Ex: MAGNUM 380"
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Grupo / Categoria *</label>
                    <select
                      value={copyGrupo}
                      onChange={(e) => setCopyGrupo(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red uppercase"
                    >
                      <option value="TRATORES">TRATORES</option>
                      <option value="COLHEDORAS">COLHEDORAS</option>
                      <option value="PULVERIZADORES">PULVERIZADORES</option>
                      <option value="PLANTADEIRAS">PLANTADEIRAS</option>
                      <option value="IMPLEMENTOS">IMPLEMENTOS</option>
                      <option value="VEICULOS">VEÍCULOS</option>
                      <option value="GERAL">GERAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Garantia Replicada</label>
                    <input
                      type="text"
                      disabled
                      value={`${planToCopy.garantia_meses} meses`}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-100 text-gray-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Observação Adicional</label>
                  <textarea
                    value={copyObservacao}
                    onChange={(e) => setCopyObservacao(e.target.value)}
                    rows={2}
                    placeholder="Observações do novo plano..."
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCopyModalOpen(false)}
                    disabled={isCopying}
                    className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCopying}
                    className="btn bg-amber-600 text-white hover:bg-amber-700 text-xs py-1.5 shadow-sm flex items-center gap-1.5"
                  >
                    {isCopying ? (
                      <span>Copiando Plano e Revisões...</span>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Confirmar e Duplicar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto text-brand-ink">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-rose-600 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-white" />
                  <h3 className="font-display font-extrabold uppercase text-base tracking-wider">
                    Confirmar Exclusão
                  </h3>
                </div>
                <button
                  onClick={() => !isDeleting && setDeleteConfirmTarget(null)}
                  className="text-white/80 hover:text-white transition-colors"
                  disabled={isDeleting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-1">
                  <p className="font-bold text-sm">{deleteConfirmTarget.title}</p>
                  {deleteConfirmTarget.subtitle && (
                    <p className="text-xs text-rose-700">{deleteConfirmTarget.subtitle}</p>
                  )}
                </div>

                <p className="text-xs text-gray-600 font-medium">
                  Esta ação é irreversível e removerá os dados imediatamente. Deseja prosseguir?
                </p>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(null)}
                    disabled={isDeleting}
                    className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5 px-3 rounded font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    disabled={isDeleting}
                    className="btn bg-rose-600 text-white hover:bg-rose-700 text-xs py-1.5 px-4 rounded font-bold shadow-sm flex items-center gap-1.5"
                  >
                    {isDeleting ? (
                      <span>Excluindo...</span>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirmar Exclusão</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
