/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  ChevronLeft, 
  ChevronRight,
  Tractor,
  User,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  FileCheck,
  Eye,
  ArrowLeft,
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  MapPin
} from "lucide-react";
import { Implemento, Cliente, OrdemServico, PlanoManutencao } from "../types";
import { API } from "../lib/api";

interface ImplementosViewProps {
  implementos: Implemento[];
  clientes: Cliente[];
  ordens: OrdemServico[];
  onRefresh: () => Promise<void>;
}

type TabType = "dados" | "historico" | "os" | "garantias" | "custos";

export const ImplementosView: React.FC<ImplementosViewProps> = ({
  implementos,
  clientes,
  ordens,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingImplemento, setEditingImplemento] = useState<Implemento | null>(null);
  const [selectedImplemento, setSelectedImplemento] = useState<Implemento | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<TabType>("dados");

  // Form states
  const [clienteId, setClienteId] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [categoria, setCategoria] = useState("Pulverizador");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [ano, setAno] = useState<number | "">("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [observacao, setObservacao] = useState("");
  const [planoId, setPlanoId] = useState("");
  const [planos, setPlanos] = useState<PlanoManutencao[]>([]);

  useEffect(() => {
    const fetchPlanos = async () => {
      try {
        const list = await API.planos.listar();
        setPlanos(list || []);
      } catch (err) {
        console.error("Erro ao carregar planos de manutenção:", err);
      }
    };
    fetchPlanos();
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Sorting State
  const [sortField, setSortField] = useState<string>("modelo");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const getSelectedClientInfo = () => {
    if (!clienteId) return { cidade: "", uf: "" };
    const found = clientes.find(c => c.id === Number(clienteId));
    return found ? { cidade: found.cidade, uf: found.uf } : { cidade: "", uf: "" };
  };

  const openForm = (impl: Implemento | null = null) => {
    if (impl) {
      setEditingImplemento(impl);
      setClienteId(String(impl.cliente_id || ""));
      setFabricante(impl.fabricante);
      setCategoria(impl.categoria || "Pulverizador");
      setModelo(impl.modelo);
      setNumeroSerie(impl.numero_serie);
      setAno(impl.ano || "");
      setDataEntrega(impl.data_entrega ? impl.data_entrega.substring(0, 10) : "");
      setLocalizacao(impl.localizacao || "");
      setAtivo(impl.ativo !== false);
      setObservacao(impl.observacao || "");
      setPlanoId(impl.plano_id || "");
    } else {
      setEditingImplemento(null);
      setClienteId("");
      setFabricante("");
      setCategoria("Pulverizador");
      setModelo("");
      setNumeroSerie("");
      setAno("");
      setDataEntrega("");
      setLocalizacao("");
      setAtivo(true);
      setObservacao("");
      setPlanoId("");
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingImplemento(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      showToast("Selecione um cliente.", "error");
      return;
    }
    if (!fabricante.trim() || !modelo.trim() || !numeroSerie.trim()) {
      showToast("Fabricante, Modelo e Número de Série são obrigatórios.", "error");
      return;
    }

    setIsLoading(true);
    const payload: Implemento = {
      cliente_id: Number(clienteId),
      fabricante: fabricante.toUpperCase(),
      categoria,
      modelo: modelo.toUpperCase(),
      numero_serie: numeroSerie.toUpperCase(),
      ano: ano ? Number(ano) : undefined,
      data_entrega: dataEntrega || undefined,
      localizacao: localizacao.trim() || undefined,
      ativo,
      observacao,
      plano_id: planoId || undefined
    };

    try {
      if (editingImplemento && editingImplemento.id) {
        await API.implementos.atualizar(editingImplemento.id, payload);
        showToast("Implemento atualizado com sucesso!", "success");
      } else {
        await API.implementos.inserir(payload);
        showToast("Implemento registrado com sucesso!", "success");
      }
      closeForm();
      await onRefresh();
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar implemento.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja realmente excluir este implemento? Todas as O.S. associadas perderão a referência de série.")) return;
    setIsLoading(true);
    try {
      await API.implementos.excluir(id);
      showToast("Implemento excluído com sucesso.", "success");
      await onRefresh();
    } catch (err) {
      console.error(err);
      showToast("Erro ao excluir implemento.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const openDetails = (impl: Implemento) => {
    setSelectedImplemento(impl);
    setActiveDetailTab("dados");
    setIsDetailOpen(true);
  };

  const closeDetails = () => {
    setIsDetailOpen(false);
    setSelectedImplemento(null);
  };

  // Get dynamic costs & histories from orders for current implement
  const getDynamicDetails = (implId: number) => {
    const relatedOS = ordens.filter(o => o.implemento_id === implId);
    
    // Sum costs from finalized related O.S.
    const finalized = relatedOS.filter(o => o.status === "FINALIZADA");
    
    // Last horimetro: maximum of equipment.horimetro_atual, or any related OS horimetro_final
    const targetImpl = implementos.find(i => i.id === implId);
    const osMaxHorimetro = relatedOS.reduce((max, o) => Math.max(max, Number(o.horimetro_final) || Number(o.horimetro) || 0), 0);
    const lastHorimetro = Math.max(Number(targetImpl?.horimetro_atual) || 0, osMaxHorimetro);

    const labor = finalized.reduce((sum, o) => sum + (Number(o.valor_mao_obra) || 0), 0);
    const travel = finalized.reduce((sum, o) => sum + (Number(o.valor_deslocamento) || 0), 0);
    const thirdParty = finalized.reduce((sum, o) => sum + (Number(o.valor_terceiros) || 0), 0);
    const total = finalized.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0);
    const parts = Math.max(0, total - (labor + travel + thirdParty));

    return {
      relatedOS,
      finalized,
      lastHorimetro,
      parts,
      labor,
      travel,
      total
    };
  };

  // Filter implementos based on search query
  const filteredImplementos = implementos.filter(i => {
    const q = searchTerm.toLowerCase();
    const clienteName = i.clientes?.razao_social || "";
    return (
      i.modelo.toLowerCase().includes(q) ||
      i.numero_serie.toLowerCase().includes(q) ||
      i.fabricante.toLowerCase().includes(q) ||
      i.categoria.toLowerCase().includes(q) ||
      clienteName.toLowerCase().includes(q)
    );
  });

  const sortedImplementos = [...filteredImplementos].sort((a, b) => {
    let valA: any = a[sortField as keyof Implemento];
    let valB: any = b[sortField as keyof Implemento];

    if (sortField === "cliente") {
      valA = a.clientes?.razao_social || "";
      valB = b.clientes?.razao_social || "";
    } else if (sortField === "modelo") {
      valA = `${a.fabricante || ""} ${a.modelo || ""}`;
      valB = `${b.fabricante || ""} ${b.modelo || ""}`;
    }

    if (valA === undefined || valA === null) valA = "";
    if (valB === undefined || valB === null) valB = "";

    if (typeof valA === "string" && typeof valB === "string") {
      return sortDirection === "asc"
        ? valA.localeCompare(valB, "pt-BR", { numeric: true })
        : valB.localeCompare(valA, "pt-BR", { numeric: true });
    }

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const totalPages = Math.ceil(sortedImplementos.length / itemsPerPage) || 1;
  const pageIndex = Math.min(currentPage, totalPages);
  const startIdx = (pageIndex - 1) * itemsPerPage;
  const paginatedImplementos = sortedImplementos.slice(startIdx, startIdx + itemsPerPage);

  const selectedClientInfo = getSelectedClientInfo();

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${
              toastMessage.type === "success" ? "bg-emerald-600" : toastMessage.type === "error" ? "bg-rose-600" : "bg-blue-600"
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main List & Details Layout */}
      {!isDetailOpen ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">
                Implementos
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Frotas, equipamentos agrícolas, garantia e plano de manutenção preventiva.
              </p>
            </div>

            <button
              onClick={() => openForm(null)}
              className="btn bg-brand-red text-white hover:bg-brand-red-dark border-none shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Novo Implemento
            </button>
          </div>

          {/* List Search & Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Pesquisar por modelo, fabricante, série, cliente..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg w-full text-xs"
                />
              </div>

              <button
                onClick={async () => {
                  setIsLoading(true);
                  await onRefresh();
                  setIsLoading(false);
                  showToast("Frota atualizada!", "info");
                }}
                disabled={isLoading}
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 flex items-center gap-1"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-[10px] font-bold text-gray-400 uppercase tracking-wider select-none">
                    <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("id")}>
                      <div className="flex items-center gap-1">
                        ID
                        {sortField === "id" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("cliente")}>
                      <div className="flex items-center gap-1">
                        Cliente Proprietário
                        {sortField === "cliente" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("modelo")}>
                      <div className="flex items-center gap-1">
                        Fabricante / Modelo
                        {sortField === "modelo" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("numero_serie")}>
                      <div className="flex items-center gap-1">
                        Nº de Série
                        {sortField === "numero_serie" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("categoria")}>
                      <div className="flex items-center gap-1">
                        Categoria
                        {sortField === "categoria" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("ativo")}>
                      <div className="flex items-center justify-center gap-1">
                        Status
                        {sortField === "ativo" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 text-right w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {paginatedImplementos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        Nenhum implemento registrado.
                      </td>
                    </tr>
                  ) : (
                    paginatedImplementos.map((impl) => (
                      <tr key={impl.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 font-semibold text-gray-500">#{impl.id}</td>
                        <td className="p-4 font-bold text-brand-ink">
                          {impl.clientes?.razao_social || "Cliente Indefinido"}
                          {impl.clientes && (
                            <div className="text-[10px] text-gray-400 font-normal">
                              {impl.clientes.cidade} / {impl.clientes.uf}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-brand-ink">{impl.fabricante} — {impl.modelo}</div>
                          {impl.localizacao && (
                            <div className="text-[10px] text-gray-500 font-normal flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-brand-red shrink-0" />
                              <span className="truncate max-w-[200px]" title={impl.localizacao}>{impl.localizacao}</span>
                            </div>
                          )}
                          {impl.plano_id && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                <FileCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                                {planos.find(p => p.id === impl.plano_id)?.modelo || "Plano Ativo"}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-mono font-bold text-gray-700">{impl.numero_serie}</td>
                        <td className="p-4 text-gray-500">{impl.categoria}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                            impl.ativo !== false 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                              : "bg-rose-50 text-rose-800 border-rose-100"
                          }`}>
                            {impl.ativo !== false ? "ATIVO" : "INATIVO"}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1">
                          <button
                            onClick={() => openDetails(impl)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Ficha Técnica"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openForm(impl)}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => impl.id && handleDelete(impl.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                            title="Excluir"
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

            {/* Pagination footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4 text-xs text-gray-500 bg-gray-50/50">
              <div>
                Mostrando <span className="font-semibold">{paginatedImplementos.length}</span> de{" "}
                <span className="font-semibold">{filteredImplementos.length}</span> implementos na frota.
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1}
                  className="p-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  Página <span className="font-semibold text-gray-800">{pageIndex}</span> de{" "}
                  <span className="font-semibold text-gray-800">{totalPages}</span>
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="p-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Detalhes Completos do Implemento (Ficha Técnica)
        selectedImplemento && (
          <div className="space-y-6 animate-fade">
            <div className="flex items-center gap-3">
              <button
                onClick={closeDetails}
                className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 shadow-sm flex items-center gap-1.5 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-gray-800">
                Ficha Técnica do Equipamento
              </h2>
            </div>

            {/* Resume Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
                <div>
                  <h3 className="font-display font-extrabold text-2xl text-brand-ink uppercase">
                    {selectedImplemento.fabricante} — {selectedImplemento.modelo}
                  </h3>
                  <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                    <User className="w-3.5 h-3.5" />
                    Proprietário: <span className="font-bold text-gray-700">{selectedImplemento.clientes?.razao_social}</span>
                  </p>
                </div>
                <span className={`px-4 py-1.5 rounded-lg text-xs font-extrabold ${
                  selectedImplemento.ativo !== false ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}>
                  {selectedImplemento.ativo !== false ? "ATIVO" : "INATIVO"}
                </span>
              </div>

              {/* Dynamic Metrics */}
              {(() => {
                const metrics = getDynamicDetails(selectedImplemento.id!);
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
                      <FileText className="w-5 h-5 mx-auto text-sky-600 mb-1" />
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">O.S. Registradas</span>
                      <span className="font-display text-2xl font-extrabold text-gray-800 mt-1 block">
                        {metrics.relatedOS.length}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
                      <FileCheck className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">O.S. Concluídas</span>
                      <span className="font-display text-2xl font-extrabold text-gray-800 mt-1 block">
                        {metrics.finalized.length}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100 col-span-2 sm:col-span-1">
                      <DollarSign className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Custos Acumulados</span>
                      <span className="font-display text-lg font-extrabold text-gray-800 mt-2 block">
                        {metrics.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100 col-span-2 sm:col-span-1">
                      <Calendar className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Entrega Técnica</span>
                      <span className="font-display text-xs font-bold text-gray-700 mt-2 block truncate">
                        {selectedImplemento.data_entrega ? new Date(selectedImplemento.data_entrega).toLocaleDateString("pt-BR") : "Não Definida"}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Custom Sub tabs */}
            <div className="flex border-b border-gray-200 bg-white rounded-t-lg overflow-hidden border-t border-x">
              {[
                { id: "dados", label: "Dados Gerais" },
                { id: "historico", label: "Histórico de Atendimento" },
                { id: "os", label: "Ordens de Serviço" },
                { id: "garantias", label: "Garantias & Manutenções" },
                { id: "custos", label: "Custos Detalhados" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as TabType)}
                  className={`flex-1 text-center py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-all ${
                    activeDetailTab === tab.id 
                      ? "border-brand-red text-brand-ink bg-gray-50" 
                      : "border-transparent text-gray-400 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content area */}
            <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-6 shadow-sm min-h-[300px]">
              {activeDetailTab === "dados" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1">Características do Equipamento</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-400 font-bold block">Fabricante:</span>
                        <span className="font-semibold text-gray-800 text-sm mt-0.5 block">{selectedImplemento.fabricante}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block">Modelo:</span>
                        <span className="font-semibold text-gray-800 text-sm mt-0.5 block">{selectedImplemento.modelo}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block">Nº de Série / Chassi:</span>
                        <span className="font-mono font-bold text-gray-800 text-sm mt-0.5 block">{selectedImplemento.numero_serie}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block">Categoria:</span>
                        <span className="font-semibold text-gray-800 text-sm mt-0.5 block">{selectedImplemento.categoria}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block">Ano de Fabricação:</span>
                        <span className="font-semibold text-gray-800 text-sm mt-0.5 block">{selectedImplemento.ano || "Não Informado"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block">Data da Entrega:</span>
                        <span className="font-semibold text-gray-800 text-sm mt-0.5 block">
                          {selectedImplemento.data_entrega ? new Date(selectedImplemento.data_entrega).toLocaleDateString("pt-BR") : "Não Registrada"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block">Último Horímetro Registrado:</span>
                        <span className="font-mono font-bold text-brand-red text-sm mt-0.5 block">
                          {(() => {
                            const metrics = getDynamicDetails(selectedImplemento.id!);
                            return metrics.lastHorimetro > 0 ? `${metrics.lastHorimetro} h` : "—";
                          })()}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400 font-bold block flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-brand-red" /> Localização Atual / Fazenda:
                        </span>
                        <span className="font-semibold text-gray-800 text-sm mt-0.5 block">
                          {selectedImplemento.localizacao || "Não informada"}
                        </span>
                      </div>
                      <div className="col-span-2 mt-2 pt-2 border-t border-gray-100">
                        <span className="text-gray-400 font-bold block">Plano de Revisão / Manutenção:</span>
                        {selectedImplemento.plano_id ? (
                          (() => {
                            const p = planos.find(pl => pl.id === selectedImplemento.plano_id);
                            return p ? (
                              <div className="mt-1 bg-emerald-50/50 rounded-lg border border-emerald-100 p-2.5 flex items-center justify-between">
                                <div>
                                  <span className="font-extrabold text-emerald-800 text-xs block">{p.fabricante} — {p.modelo}</span>
                                  <span className="text-gray-500 text-[10px] block mt-0.5">Garantia: {p.garantia_meses} meses | Horímetro base: {p.horimetro_base} h</span>
                                </div>
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-wider">Ativo</span>
                              </div>
                            ) : (
                              <span className="font-semibold text-gray-800 text-sm mt-0.5 block">ID: {selectedImplemento.plano_id}</span>
                            );
                          })()
                        ) : (
                          <span className="text-gray-400 font-medium italic text-xs mt-1 block">Nenhum plano de revisão vinculado a este implemento.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1">Observações Técnicas</h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-gray-600 leading-relaxed italic border border-gray-100 min-h-[120px]">
                      {selectedImplemento.observacao || "Nenhuma observação técnica ou anotação especial de campo registrada para este chassi."}
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === "historico" && (
                <div className="space-y-4 text-xs">
                  <h4 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1">Diário de Serviços em Campo</h4>
                  
                  {(() => {
                    const finishedOS = ordens.filter(o => o.implemento_id === selectedImplemento.id && o.status === "FINALIZADA");
                    if (finishedOS.length === 0) {
                      return <div className="text-center py-12 text-gray-400">Nenhum diário ou serviço executado registrado para esta máquina.</div>;
                    }

                    return (
                      <div className="relative border-l border-gray-200 pl-4 ml-2 space-y-6">
                        {finishedOS.map(os => (
                          <div key={os.id} className="relative">
                            {/* Bullet */}
                            <span className="absolute -left-[21px] top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white ring-4 ring-emerald-50" />
                            
                            <div className="bg-gray-50 border border-gray-150 rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-gray-800 text-sm uppercase">{os.numero_os} — {os.tipo_atendimento}</span>
                                <span className="text-[10px] text-gray-400 font-bold">{os.data_atendimento ? new Date(os.data_atendimento).toLocaleDateString("pt-BR") : "—"}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-gray-500 mb-2">
                                <div><strong>Horímetro do Atendimento:</strong> {os.horimetro_final || "—"} h</div>
                                <div><strong>Serviço Executado:</strong> {os.revisao_executada || "—"}</div>
                              </div>
                              <p className="text-gray-700 whitespace-pre-wrap"><strong className="text-xs text-gray-500">Detalhe do Relatório:</strong> {os.servico_executado || "Sem relatório de serviço inserido."}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeDetailTab === "os" && (
                <div className="space-y-4 text-xs">
                  <h4 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1">Histórico Completo de O.S.</h4>
                  {(() => {
                    const related = ordens.filter(o => o.implemento_id === selectedImplemento.id);
                    if (related.length === 0) {
                      return <div className="text-center py-12 text-gray-400">Nenhuma Ordem de Serviço vinculada a esta máquina.</div>;
                    }

                    return (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <th className="pb-3">Código</th>
                            <th className="pb-3">Data</th>
                            <th className="pb-3">Tipo Atendimento</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right">Valor Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {related.map(os => (
                            <tr key={os.id} className="hover:bg-gray-50/50">
                              <td className="py-2.5 font-bold text-gray-700">{os.numero_os}</td>
                              <td className="py-2.5 text-gray-500">{os.data_abertura ? new Date(os.data_abertura).toLocaleDateString("pt-BR") : "—"}</td>
                              <td className="py-2.5 text-gray-600">{os.tipo_atendimento}</td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                                  os.status === "FINALIZADA" ? "bg-emerald-50 text-emerald-800 border-emerald-100" : "bg-gray-100 text-gray-700"
                                }`}>
                                  {os.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-semibold text-gray-800">
                                {os.status === "FINALIZADA" && os.valor_total 
                                  ? os.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) 
                                  : "—"
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

              {activeDetailTab === "garantias" && (
                <div className="space-y-6 text-xs">
                  {/* Part 1: Warranty (requires delivery date) */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1">Status da Garantia de Fábrica</h4>
                    {(() => {
                      const start = selectedImplemento.data_entrega ? new Date(selectedImplemento.data_entrega) : null;
                      if (!start) {
                        return (
                          <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-4 text-amber-800 text-xs flex gap-2.5 items-start">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold">Data de Entrega Técnica Não Registrada</strong>
                              Não é possível calcular ou projetar o prazo da garantia de fábrica. Para cadastrar, edite o equipamento.
                            </div>
                          </div>
                        );
                      }

                      // Check if there is an associated plan to read warranty duration
                      const linkedPlan = selectedImplemento.plano_id ? planos.find(p => p.id === selectedImplemento.plano_id) : null;
                      const mesesGarantia = linkedPlan ? linkedPlan.garantia_meses : 12;
                      const end = new Date(start);
                      end.setMonth(end.getMonth() + mesesGarantia);

                      const now = new Date();
                      const diffTime = end.getTime() - now.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const isWarranty = diffDays > 0;

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Cobertura Contratual</span>
                              <h5 className="font-display font-bold text-sm text-brand-ink mt-1">Garantia padrão de fábrica</h5>
                              <p className="text-gray-500 mt-1">Duração de {mesesGarantia} meses vinculada a este equipamento, calculada a partir do recebimento técnico.</p>
                            </div>
                            
                            <div className="mt-3 pt-2.5 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <strong className="text-gray-400 block font-bold text-[10px]">Início:</strong>
                                <span>{start.toLocaleDateString("pt-BR")}</span>
                              </div>
                              <div>
                                <strong className="text-gray-400 block font-bold text-[10px]">Fim:</strong>
                                <span>{end.toLocaleDateString("pt-BR")}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                            {isWarranty ? (
                              <div className="space-y-1.5">
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full font-bold uppercase tracking-wider text-[9px]">
                                  EM GARANTIA
                                </span>
                                <h4 className="font-display font-extrabold text-3xl text-gray-800 mt-1">{diffDays}</h4>
                                <p className="text-xs text-gray-400">Dias restantes de cobertura.</p>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-full font-bold uppercase tracking-wider text-[9px]">
                                  EXPIRADA
                                </span>
                                <h4 className="font-display font-extrabold text-lg text-gray-400 mt-1">Garantia Expirada</h4>
                                <p className="text-xs text-gray-400">Equipamento sem cobertura de fábrica ativa.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Part 2: Preventative Revision Plan (checklists and executions) */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1">Cronograma de Revisões Preventivas</h4>
                    {(() => {
                      if (!selectedImplemento.plano_id) {
                        return (
                          <div className="bg-gray-50 border border-gray-150 rounded-lg p-5 text-center text-gray-500">
                            <Wrench className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                            <p className="font-semibold text-xs text-gray-700">Nenhum plano de manutenção vinculado a este equipamento.</p>
                            <p className="text-[10px] text-gray-400 mt-1 max-w-sm mx-auto">Para definir o cronograma de revisões de 50h, 250h, 500h, etc., clique em editar o implemento e selecione o respectivo plano preventiva cadastrado no sistema.</p>
                          </div>
                        );
                      }

                      const plano = planos.find(p => p.id === selectedImplemento.plano_id);
                      if (!plano) {
                        return <div className="text-gray-400 italic">ID do plano de revisão não localizado no sistema ({selectedImplemento.plano_id}).</div>;
                      }

                      const planRevs = API.planos.revisoes.listar(selectedImplemento.plano_id);
                      const relatedOS = ordens.filter(o => o.implemento_id === selectedImplemento.id);
                      const finishedOS = relatedOS.filter(o => o.status === "FINALIZADA");
                      const osMaxHorimetro = relatedOS.reduce((max, o) => Math.max(max, Number(o.horimetro_final) || Number(o.horimetro) || 0), 0);
                      const currentHorimetro = Math.max(Number(selectedImplemento.horimetro_atual) || 0, osMaxHorimetro);

                      const overdueRevs = planRevs.filter(rev => {
                        const matchingOS = finishedOS.find(o => {
                          const revExec = (o.revisao_executada || "").toLowerCase().replace(/\s+/g, "");
                          const descMatch = (o.revisao_executada || "").toLowerCase().includes(rev.descricao.toLowerCase());
                          const matchH = revExec.includes(`${rev.horas_limite}h`) || revExec === `${rev.horas_limite}` || revExec.includes(`revisãode${rev.horas_limite}`);
                          return matchH || descMatch;
                        });
                        return !matchingOS && currentHorimetro >= rev.horas_limite;
                      });

                      const nearRevs = planRevs.filter(rev => {
                        const matchingOS = finishedOS.find(o => {
                          const revExec = (o.revisao_executada || "").toLowerCase().replace(/\s+/g, "");
                          const descMatch = (o.revisao_executada || "").toLowerCase().includes(rev.descricao.toLowerCase());
                          const matchH = revExec.includes(`${rev.horas_limite}h`) || revExec === `${rev.horas_limite}` || revExec.includes(`revisãode${rev.horas_limite}`);
                          return matchH || descMatch;
                        });
                        return !matchingOS && currentHorimetro < rev.horas_limite && (rev.horas_limite - currentHorimetro <= 50);
                      });

                      if (planRevs.length === 0) {
                        return (
                          <div className="bg-gray-50 border border-gray-150 rounded-lg p-5 text-center text-gray-500">
                            <Wrench className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                            <p className="font-semibold text-xs text-gray-700">{plano.fabricante} — {plano.modelo}</p>
                            <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">Este plano está vinculado, mas não possui etapas de revisão cadastradas no menu "Planos Preventivos".</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {/* Alert Banners */}
                          {overdueRevs.length > 0 && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2 shadow-sm">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <strong className="font-extrabold block text-rose-950">⚠️ ALERTA: REVISÃO PREVENTIVA PENDENTE / ATRASADA</strong>
                                <span>O horímetro atual do equipamento ({currentHorimetro}h) atingiu ou ultrapassou <strong>{overdueRevs.length} etapa(s)</strong> do plano sem comprovação de O.S. concluída ({overdueRevs.map(r => `${r.horas_limite}h`).join(", ")}). Abra uma Ordem de Serviço de revisão para registrar o atendimento e manter a garantia.</span>
                              </div>
                            </div>
                          )}

                          {overdueRevs.length === 0 && nearRevs.length > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2 shadow-sm">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <strong className="font-extrabold block text-amber-950">🔔 AVISO PREVENTIVO: REVISÃO PRÓXIMA DO LIMITE</strong>
                                <span>Equipamento está a apenas <strong>{nearRevs[0].horas_limite - currentHorimetro}h</strong> de atingir a próxima revisão agendada (Etapa #{nearRevs[0].revisao_numero} — {nearRevs[0].horas_limite}h).</span>
                              </div>
                            </div>
                          )}

                          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                            <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                              <strong className="font-bold text-blue-950 block">ℹ️ O que é o Status "AGENDADA"?</strong>
                              <span>Indica etapas de manutenção preventiva do fabricante previstas para o futuro. O sistema monitora o horímetro acumulado nas Ordens de Serviço e emite alertas amarelos/vermelhos conforme a máquina se aproxima do limite. Quando a O.S. correspondente for finalizada, o status mudará automaticamente para <strong>CONCLUÍDA</strong>.</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center bg-gray-50 border border-gray-150 p-3 rounded-lg">
                            <div>
                              <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">Plano Associado</span>
                              <h5 className="font-extrabold text-gray-800 text-sm mt-1">{plano.fabricante} — {plano.modelo}</h5>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-400 font-bold block text-[10px]">Horímetro Atual Registrado</span>
                              <span className="font-mono font-black text-gray-800 text-sm">{currentHorimetro} h</span>
                            </div>
                          </div>

                          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  <th className="p-3">Frequência / Alvo</th>
                                  <th className="p-3">Prazo Recomendado</th>
                                  <th className="p-3">Serviço Planejado</th>
                                  <th className="p-3">Status</th>
                                  <th className="p-3 text-right">Comprovação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {planRevs.map(rev => {
                                  // Try to find a finalized O.S. with this revision
                                  const matchingOS = finishedOS.find(o => {
                                    const revExec = (o.revisao_executada || "").toLowerCase().replace(/\s+/g, "");
                                    const descMatch = (o.revisao_executada || "").toLowerCase().includes(rev.descricao.toLowerCase());
                                    const matchH = revExec.includes(`${rev.horas_limite}h`) || revExec === `${rev.horas_limite}` || revExec.includes(`revisãode${rev.horas_limite}`);
                                    return matchH || descMatch;
                                  });

                                  const isCompleted = !!matchingOS;
                                  const isOverdue = !isCompleted && currentHorimetro >= rev.horas_limite;

                                  let statusBadge = (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                                      <Clock className="w-2.5 h-2.5" />
                                      AGENDADA
                                    </span>
                                  );

                                  if (isCompleted) {
                                    statusBadge = (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        <CheckCircle className="w-2.5 h-2.5" />
                                        CONCLUÍDA
                                      </span>
                                    );
                                  } else if (isOverdue) {
                                    statusBadge = (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-100">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        ATRASADA
                                      </span>
                                    );
                                  }

                                  return (
                                    <tr key={rev.id_revisao} className={`hover:bg-gray-50/50 transition-colors ${isCompleted ? "opacity-75" : ""}`}>
                                      <td className="p-3 font-mono font-extrabold text-gray-700">{rev.horas_limite} h</td>
                                      <td className="p-3 text-gray-500 font-semibold">{rev.meses_limite} meses</td>
                                      <td className="p-3 text-gray-600 max-w-xs font-medium">
                                        <div className="font-extrabold text-gray-800 text-[11px]">Etapa #{rev.revisao_numero}</div>
                                        <div className="text-gray-500 text-[10px] mt-0.5 leading-relaxed">{rev.descricao}</div>
                                      </td>
                                      <td className="p-3">{statusBadge}</td>
                                      <td className="p-3 text-right">
                                        {matchingOS ? (
                                          <div>
                                            <span className="font-bold text-gray-800 block text-[10px]">{matchingOS.numero_os}</span>
                                            <span className="text-[9px] text-gray-400 block mt-0.5">{matchingOS.data_atendimento ? new Date(matchingOS.data_atendimento).toLocaleDateString("pt-BR") : "—"}</span>
                                          </div>
                                        ) : (
                                          <span className="text-gray-300 italic">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeDetailTab === "custos" && (
                <div className="space-y-4 text-xs">
                  <h4 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1">Custos e Alocações Financeiras</h4>
                  
                  {(() => {
                    const metrics = getDynamicDetails(selectedImplemento.id!);
                    if (metrics.relatedOS.length === 0) {
                      return <div className="text-center py-12 text-gray-400">Nenhum custo gerado para esta máquina.</div>;
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border border-gray-200 p-4 rounded-lg bg-gray-50 text-center">
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Peças / Insumos</span>
                          <h5 className="font-display text-2xl font-extrabold text-gray-800 mt-2">
                            {metrics.parts.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </h5>
                        </div>
                        <div className="border border-gray-200 p-4 rounded-lg bg-gray-50 text-center">
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Mão de Obra</span>
                          <h5 className="font-display text-2xl font-extrabold text-gray-800 mt-2">
                            {metrics.labor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </h5>
                        </div>
                        <div className="border border-gray-200 p-4 rounded-lg bg-gray-50 text-center">
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Deslocamento / KM</span>
                          <h5 className="font-display text-2xl font-extrabold text-gray-800 mt-2">
                            {metrics.travel.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </h5>
                        </div>

                        <div className="md:col-span-3 border-2 border-dashed border-emerald-500 bg-emerald-50/10 p-5 rounded-xl text-center mt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="text-left">
                            <h4 className="font-display font-extrabold uppercase text-lg text-emerald-800">Custo Total de Manutenção</h4>
                            <p className="text-xs text-gray-500">Soma acumulada de todos os serviços técnicos concluídos de chassi.</p>
                          </div>
                          <h3 className="font-display font-extrabold text-3xl text-emerald-700">
                            {metrics.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </h3>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Form Modal (Add / Edit Implemento) */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-xl overflow-hidden my-8"
            >
              <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Tractor className="w-5 h-5 text-brand-red" />
                  <h3 className="font-display font-extrabold uppercase text-lg tracking-wider">
                    {editingImplemento ? "Editar Implemento" : "Cadastrar Novo Implemento"}
                  </h3>
                </div>
                <button onClick={closeForm} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="space-y-4">
                  {/* Client association section */}
                  <div>
                    <h4 className="text-[11px] font-bold text-brand-red uppercase tracking-wider border-b border-gray-150 pb-1 mb-3 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Vinculação de Cliente Proprietário
                    </h4>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Cliente Proprietário *</label>
                      <select
                        required
                        value={clienteId}
                        onChange={(e) => setClienteId(e.target.value)}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                      >
                        <option value="">Selecione o proprietário...</option>
                        {clientes.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.codigo_sankhya ? `[${c.codigo_sankhya}] ` : ""}{c.razao_social}
                          </option>
                        ))}
                      </select>
                    </div>

                    {clienteId && (
                      <div className="grid grid-cols-2 gap-3 mt-3 bg-gray-50 p-2.5 rounded border border-gray-150 text-[11px]">
                        <div>
                          <strong className="text-gray-400 font-bold">Cidade:</strong>{" "}
                          <span className="text-gray-700 font-semibold">{selectedClientInfo.cidade}</span>
                        </div>
                        <div>
                          <strong className="text-gray-400 font-bold">UF:</strong>{" "}
                          <span className="text-gray-700 font-semibold">{selectedClientInfo.uf}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Implement specifications */}
                  <div>
                    <h4 className="text-[11px] font-bold text-brand-red uppercase tracking-wider border-b border-gray-150 pb-1 mb-3 flex items-center gap-1.5">
                      <Tractor className="w-3.5 h-3.5" /> Especificações do Equipamento
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Fabricante / Marca *</label>
                        <input
                          type="text"
                          required
                          value={fabricante}
                          onChange={(e) => setFabricante(e.target.value)}
                          placeholder="Ex: JOHN DEERE, CASE IH"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Categoria *</label>
                        <select
                          value={categoria}
                          onChange={(e) => setCategoria(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        >
                          <option>Pulverizador</option>
                          <option>Plantadeira</option>
                          <option>Grade</option>
                          <option>Distribuidor</option>
                          <option>Fenação</option>
                          <option>Enleirador</option>
                          <option>Segadeira</option>
                          <option>Colhedora</option>
                          <option>Subsolador</option>
                          <option>Escarificador</option>
                          <option>Trator</option>
                          <option>Outro</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Modelo *</label>
                        <input
                          type="text"
                          required
                          value={modelo}
                          onChange={(e) => setModelo(e.target.value)}
                          placeholder="Ex: 8370R, MAGNUM 340"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Número de Série *</label>
                        <input
                          type="text"
                          required
                          value={numeroSerie}
                          onChange={(e) => setNumeroSerie(e.target.value)}
                          placeholder="Ex: 1YDJD0000000X12"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Ano de Fabricação</label>
                        <input
                          type="number"
                          value={ano}
                          onChange={(e) => setAno(e.target.value ? Number(e.target.value) : "")}
                          placeholder="Ex: 2024"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Entrega Técnica</label>
                        <input
                          type="date"
                          value={dataEntrega}
                          onChange={(e) => setDataEntrega(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
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
                    </div>

                    <div className="grid grid-cols-1 gap-3 mt-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-brand-red" /> Localização Atual da Máquina / Fazenda
                        </label>
                        <input
                          type="text"
                          value={localizacao}
                          onChange={(e) => setLocalizacao(e.target.value)}
                          placeholder="Ex: Fazenda Santa Maria - Gleba 2, Ariquemes - RO"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 mt-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Plano de Manutenção / Revisão Preventiva</label>
                        <select
                          value={planoId}
                          onChange={(e) => setPlanoId(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        >
                          <option value="">Nenhum plano associado</option>
                          {planos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.fabricante} — {p.modelo} {p.grupo ? `(${p.grupo})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Observations block */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Observações Técnicas</label>
                    <textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      rows={3}
                      placeholder="Observações ou complementos de chassi..."
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red min-h-[60px]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn bg-brand-red text-white hover:bg-brand-red-dark text-xs py-2 flex items-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    {isLoading ? "Salvando..." : "Salvar Implemento"}
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
