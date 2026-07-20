import React, { useState, useEffect } from "react";
import { 
  Car, Plus, Search, Edit2, Trash2, X, Check, CheckCircle2, AlertCircle, RefreshCw, ArrowUp, ArrowDown 
} from "lucide-react";
import { API } from "../lib/api";
import { Veiculo } from "../types";

export const VeiculosView: React.FC = () => {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null);
  
  // Form states
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [ano, setAno] = useState<string>("");
  const [ativo, setAtivo] = useState(true);
  const [observacao, setObservacao] = useState("");

  // Toast notification
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchVeiculos();
  }, []);

  const fetchVeiculos = async () => {
    setLoading(true);
    try {
      const data = await API.veiculos.listar();
      setVeiculos(data);
    } catch (err) {
      showToast("Erro ao carregar veículos.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAddModal = () => {
    setEditingVeiculo(null);
    setPlaca("");
    setModelo("");
    setMarca("");
    setAno("");
    setAtivo(true);
    setObservacao("");
    setIsModalOpen(true);
  };

  const openEditModal = (veiculo: Veiculo) => {
    setEditingVeiculo(veiculo);
    setPlaca(veiculo.placa || "");
    setModelo(veiculo.modelo || "");
    setMarca(veiculo.marca || "");
    setAno(veiculo.ano ? String(veiculo.ano) : "");
    setAtivo(veiculo.ativo !== false);
    setObservacao(veiculo.observacao || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placa.trim() || !modelo.trim()) {
      showToast("Placa e Modelo são obrigatórios.", "error");
      return;
    }

    const payload: Veiculo = {
      placa: placa.trim().toUpperCase(),
      modelo: modelo.trim().toUpperCase(),
      marca: marca.trim().toUpperCase() || undefined,
      ano: ano ? Number(ano) : undefined,
      ativo,
      observacao: observacao.trim() || undefined
    };

    try {
      if (editingVeiculo && editingVeiculo.id) {
        await API.veiculos.atualizar(editingVeiculo.id, payload);
        showToast("Veículo atualizado com sucesso!");
      } else {
        // Prevent duplicate plate
        const isDuplicate = veiculos.some(v => v.placa.toUpperCase() === placa.trim().toUpperCase());
        if (isDuplicate) {
          showToast("Já existe um veículo com esta placa.", "error");
          return;
        }
        await API.veiculos.inserir(payload);
        showToast("Veículo cadastrado com sucesso!");
      }
      setIsModalOpen(false);
      fetchVeiculos();
    } catch (err: any) {
      showToast(err.message || "Erro ao salvar veículo.", "error");
    }
  };

  // Custom delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; placa: string } | null>(null);

  const handleDelete = async (id: number, plate: string) => {
    setDeleteConfirm({ id, placa: plate });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await API.veiculos.excluir(deleteConfirm.id);
      showToast("Veículo excluído com sucesso!");
      setDeleteConfirm(null);
      fetchVeiculos();
    } catch (err) {
      showToast("Erro ao excluir veículo.", "error");
    }
  };

  const toggleStatus = async (veiculo: Veiculo) => {
    if (!veiculo.id) return;
    try {
      const updated = { ...veiculo, ativo: !veiculo.ativo };
      await API.veiculos.atualizar(veiculo.id, updated);
      showToast(`Veículo ${updated.ativo ? "ativado" : "desativado"} com sucesso!`);
      fetchVeiculos();
    } catch (err) {
      showToast("Erro ao alterar status do veículo.", "error");
    }
  };

  // Sorting State
  const [sortField, setSortField] = useState<string>("placa");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredVeiculos = veiculos.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      (v.placa || "").toLowerCase().includes(q) ||
      (v.modelo || "").toLowerCase().includes(q) ||
      (v.marca || "").toLowerCase().includes(q) ||
      (v.observacao || "").toLowerCase().includes(q)
    );
  });

  const sortedVeiculos = [...filteredVeiculos].sort((a, b) => {
    let valA: any = a[sortField as keyof Veiculo];
    let valB: any = b[sortField as keyof Veiculo];

    if (sortField === "modelo") {
      valA = `${a.marca || ""} ${a.modelo || ""}`;
      valB = `${b.marca || ""} ${b.modelo || ""}`;
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
            <Car className="text-brand-red w-9 h-9" />
            Frota de Veículos
          </h1>
          <p className="text-gray-500 text-sm">
            Gerenciamento de carros e utilitários utilizados nas assistências técnicas e atendimentos externos.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="btn bg-brand-red hover:bg-brand-red-dark text-white text-xs font-black uppercase tracking-wider h-11 px-5 rounded-lg shadow-md flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Veículo
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar placa, modelo, marca ou observação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-red font-semibold text-gray-700 bg-gray-50/50 focus:bg-white"
          />
        </div>
        <button
          onClick={fetchVeiculos}
          title="Recarregar"
          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Vehicle Grid/Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-8 h-8 text-brand-red animate-spin" />
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Carregando veículos...</span>
          </div>
        ) : filteredVeiculos.length === 0 ? (
          <div className="p-12 text-center">
            <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-700 uppercase">Nenhum veículo encontrado</h3>
            <p className="text-xs text-gray-400 mt-1">Experimente mudar o termo de busca ou adicione um novo cadastro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-[10px] font-black uppercase text-gray-400 tracking-wider select-none">
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("placa")}>
                    <div className="flex items-center gap-1">
                      Placa
                      {sortField === "placa" && (
                        sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("modelo")}>
                    <div className="flex items-center gap-1">
                      Marca & Modelo
                      {sortField === "modelo" && (
                        sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("ano")}>
                    <div className="flex items-center gap-1">
                      Ano
                      {sortField === "ano" && (
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
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("observacao")}>
                    <div className="flex items-center gap-1">
                      Observações
                      {sortField === "observacao" && (
                        sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {sortedVeiculos.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/30 transition-colors text-xs font-bold text-gray-700">
                    <td className="px-6 py-4">
                      <span className="bg-gray-900 text-white font-mono text-[11px] font-black px-2.5 py-1 rounded border border-gray-700 shadow-sm block w-fit">
                        {v.placa}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-gray-800 uppercase font-extrabold">{v.modelo}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{v.marca || "Marca não informada"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono">
                      {v.ano || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(v)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase transition-colors ${
                          v.ativo !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${v.ativo !== false ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                        {v.ativo !== false ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-normal max-w-xs truncate" title={v.observacao}>
                      {v.observacao || "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(v)}
                          className="p-1.5 hover:bg-gray-100 rounded text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => v.id !== undefined && handleDelete(v.id, v.placa)}
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
                <Car className="text-brand-red w-5 h-5" />
                {editingVeiculo ? "Editar Veículo" : "Novo Veículo"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Placa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ABC-1234"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:border-brand-red"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Ano</label>
                  <input
                    type="number"
                    placeholder="Ex: 2022"
                    value={ano}
                    onChange={(e) => setAno(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Modelo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: HILUX CD 4X4 SRV"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-brand-red uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Marca / Fabricante</label>
                <input
                  type="text"
                  placeholder="Ex: TOYOTA"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-brand-red uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Observações</label>
                <textarea
                  placeholder="Detalhes adicionais, identificação da frota, etc..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:border-brand-red h-20"
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
                  Veículo Ativo na Frota
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
                  Salvar Veículo
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
                <h3 className="text-sm font-bold text-gray-800 uppercase">Excluir Veículo</h3>
                <p className="text-xs text-gray-500 mt-2">
                  Tem certeza de que deseja excluir o veículo de placa <span className="font-mono font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">{deleteConfirm.placa}</span>? Esta ação não pode ser desfeita.
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
