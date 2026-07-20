import React, { useState, useEffect } from "react";
import { 
  ClipboardList, Plus, Search, Edit2, Trash2, X, Check, CheckCircle2, AlertCircle, RefreshCw, ArrowUp, ArrowDown 
} from "lucide-react";
import { API } from "../lib/api";
import { TipoAtendimento } from "../types";

export const TiposAtendimentoView: React.FC = () => {
  const [tipos, setTipos] = useState<TipoAtendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoAtendimento | null>(null);
  
  // Form states
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);

  // Toast notification
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchTipos();
  }, []);

  const fetchTipos = async () => {
    setLoading(true);
    try {
      const data = await API.tiposAtendimento.listar();
      setTipos(data);
    } catch (err) {
      showToast("Erro ao carregar tipos de atendimento.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAddModal = () => {
    setEditingTipo(null);
    setNome("");
    setDescricao("");
    setAtivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (tipo: TipoAtendimento) => {
    setEditingTipo(tipo);
    setNome(tipo.nome || "");
    setDescricao(tipo.descricao || "");
    setAtivo(tipo.ativo !== false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      showToast("O Nome é obrigatório.", "error");
      return;
    }

    const payload: TipoAtendimento = {
      nome: nome.trim().toUpperCase(),
      descricao: descricao.trim() || undefined,
      ativo
    };

    try {
      if (editingTipo && editingTipo.id) {
        await API.tiposAtendimento.atualizar(editingTipo.id, payload);
        showToast("Tipo de atendimento atualizado!");
      } else {
        // Prevent duplicate name
        const isDuplicate = tipos.some(t => t.nome.toUpperCase() === nome.trim().toUpperCase());
        if (isDuplicate) {
          showToast("Já existe um tipo de atendimento com este nome.", "error");
          return;
        }
        await API.tiposAtendimento.inserir(payload);
        showToast("Tipo de atendimento criado!");
      }
      setIsModalOpen(false);
      fetchTipos();
    } catch (err: any) {
      showToast(err.message || "Erro ao salvar tipo de atendimento.", "error");
    }
  };

  // Custom delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; nome: string } | null>(null);

  const handleDelete = async (id: number, name: string) => {
    setDeleteConfirm({ id, nome: name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await API.tiposAtendimento.excluir(deleteConfirm.id);
      showToast("Tipo de atendimento excluído com sucesso!");
      setDeleteConfirm(null);
      fetchTipos();
    } catch (err) {
      showToast("Erro ao excluir tipo de atendimento.", "error");
    }
  };

  const toggleStatus = async (tipo: TipoAtendimento) => {
    if (!tipo.id) return;
    try {
      const updated = { ...tipo, ativo: !tipo.ativo };
      await API.tiposAtendimento.atualizar(tipo.id, updated);
      showToast(`Tipo "${updated.nome}" ${updated.ativo ? "ativado" : "desativado"}!`);
      fetchTipos();
    } catch (err) {
      showToast("Erro ao alterar status.", "error");
    }
  };

  // Sorting State
  const [sortField, setSortField] = useState<string>("nome");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredTipos = tipos.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      (t.nome || "").toLowerCase().includes(q) ||
      (t.descricao || "").toLowerCase().includes(q)
    );
  });

  const sortedTipos = [...filteredTipos].sort((a, b) => {
    let valA: any = a[sortField as keyof TipoAtendimento];
    let valB: any = b[sortField as keyof TipoAtendimento];

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

      {/* Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase animate-fade flex items-center gap-2">
            <ClipboardList className="text-brand-red w-9 h-9" />
            Tipos de Atendimento
          </h1>
          <p className="text-gray-500 text-sm">
            Configure as categorias de ordens de serviço (Ex: Garantia, Assistência Técnica, Revisão Preventiva).
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="btn bg-brand-red hover:bg-brand-red-dark text-white text-xs font-black uppercase tracking-wider h-11 px-5 rounded-lg shadow-md flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Tipo de Atendimento
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar por tipo de atendimento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-red font-semibold text-gray-700 bg-gray-50/50 focus:bg-white"
          />
        </div>
        <button
          onClick={fetchTipos}
          title="Recarregar"
          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid/Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-8 h-8 text-brand-red animate-spin" />
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Carregando tipos...</span>
          </div>
        ) : filteredTipos.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-700 uppercase">Nenhum tipo de atendimento encontrado</h3>
            <p className="text-xs text-gray-400 mt-1">Experimente mudar o termo de busca ou adicione um novo cadastro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-[10px] font-black uppercase text-gray-400 tracking-wider select-none">
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("nome")}>
                    <div className="flex items-center gap-1">
                      Nome do Tipo
                      {sortField === "nome" && (
                        sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("descricao")}>
                    <div className="flex items-center gap-1">
                      Descrição
                      {sortField === "descricao" && (
                        sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("ativo")}>
                    <div className="flex items-center gap-1">
                      Status
                      {sortField === "ativo" && (
                        sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {sortedTipos.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/30 transition-colors text-xs font-bold text-gray-700">
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-800 font-bold text-[11px] px-3 py-1.5 rounded border border-gray-200 shadow-sm block w-fit uppercase">
                        {t.nome}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-normal max-w-sm truncate" title={t.descricao}>
                      {t.descricao || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(t)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase transition-colors ${
                          t.ativo !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.ativo !== false ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                        {t.ativo !== false ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 hover:bg-gray-100 rounded text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => t.id !== undefined && handleDelete(t.id, t.nome)}
                          className="p-1.5 hover:bg-gray-100 rounded text-rose-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md overflow-hidden shadow-2xl animate-fade">
            <div className="p-5 border-b border-gray-150 bg-gray-50/50 flex items-center justify-between">
              <h2 className="font-display text-base font-extrabold text-gray-800 uppercase flex items-center gap-2">
                <ClipboardList className="text-brand-red w-5 h-5" />
                {editingTipo ? "Editar Tipo de Atendimento" : "Novo Tipo de Atendimento"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: REVISÃO DE 50 HORAS"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-brand-red uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Descrição</label>
                <textarea
                  placeholder="Explicação do escopo do atendimento..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:border-brand-red h-24"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="rounded border-gray-300 text-brand-red focus:ring-brand-red"
                />
                <label htmlFor="ativo" className="text-xs font-bold text-gray-600 uppercase">
                  Tipo Ativo para Seleção
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs font-black uppercase tracking-wider h-10 px-4 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn bg-brand-red hover:bg-brand-red-dark text-white text-xs font-black uppercase tracking-wider h-10 px-5 rounded-lg shadow-sm"
                >
                  Salvar Tipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-sm overflow-hidden shadow-2xl animate-fade">
            <div className="p-5 text-center space-y-4">
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800 uppercase">Excluir Tipo de Atendimento</h3>
                <p className="text-xs text-gray-500 mt-2">
                  Tem certeza de que deseja excluir o tipo de atendimento <span className="font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">"{deleteConfirm.nome}"</span>? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase rounded-lg shadow-md transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
