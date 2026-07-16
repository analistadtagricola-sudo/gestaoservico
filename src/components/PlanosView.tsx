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
  AlertCircle
} from "lucide-react";
import { PlanoManutencao, PlanoRevisao } from "../types";
import { API } from "../lib/api";

export const PlanosView: React.FC = () => {
  const [planos, setPlanos] = useState<PlanoManutencao[]>([]);
  const [selectedPlano, setSelectedPlano] = useState<PlanoManutencao | null>(null);
  const [revisoes, setRevisoes] = useState<PlanoRevisao[]>([]);

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
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadPlanos = () => {
    const list = API.planos.listar();
    setPlanos(list);
  };

  const loadRevisoes = (planoId: string) => {
    const list = API.planos.revisoes.listar(planoId);
    setRevisoes(list);
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

  const handleSavePlan = (e: React.FormEvent) => {
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

    API.planos.salvar(payload);
    showToast("Plano de manutenção salvo com sucesso!");
    setIsPlanModalOpen(false);
    loadPlanos();
    if (selectedPlano && selectedPlano.id === payload.id) {
      setSelectedPlano(payload);
    }
  };

  const handleDeletePlan = (id: string) => {
    if (!confirm("Deseja realmente excluir este plano de manutenção e todas as revisões cadastradas nele?")) return;
    API.planos.excluir(id);
    showToast("Plano de manutenção excluído.");
    loadPlanos();
    if (selectedPlano?.id === id) {
      setSelectedPlano(null);
      setRevisoes([]);
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

  const handleSaveRevision = (e: React.FormEvent) => {
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
      API.planos.revisoes.salvar(payload);
      showToast("Revisão salva com sucesso!");
      setIsRevModalOpen(false);
      loadRevisoes(selectedPlano.id);
    } catch (err: any) {
      showToast(err.message || "Erro ao salvar revisão.", "error");
    }
  };

  const handleDeleteRevision = (id: string) => {
    if (!confirm("Deseja realmente excluir esta revisão?")) return;
    API.planos.revisoes.excluir(id);
    showToast("Revisão removida.");
    if (selectedPlano) {
      loadRevisoes(selectedPlano.id);
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

            <button
              onClick={() => openPlanForm(null)}
              className="btn bg-brand-red text-white hover:bg-brand-red-dark border-none shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Novo Plano
            </button>
          </div>

          {/* Grid Layout of active plans */}
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

                  <div className="mt-5 pt-3 border-t border-gray-100 flex gap-2">
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
                      onClick={() => openPlanForm(p)}
                      className="p-1.5 text-sky-600 border border-gray-200 rounded hover:bg-sky-50"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(p.id)}
                      className="p-1.5 text-rose-600 border border-gray-200 rounded hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
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

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-display font-extrabold text-xl text-brand-ink uppercase">
              {selectedPlano.fabricante} — {selectedPlano.modelo}
            </h3>
            <p className="text-gray-500 text-xs mt-1">Configure todos os níveis de horímetro para disparos de preventiva.</p>
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
                          onClick={() => r.id_revisao && handleDeleteRevision(r.id_revisao)}
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
    </div>
  );
};
