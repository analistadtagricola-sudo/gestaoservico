/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Search, 
  FileUp, 
  RefreshCw, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  ChevronLeft, 
  ChevronRight,
  User,
  MapPin,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  FileSpreadsheet,
  Eye,
  Tractor,
  ClipboardList,
  DollarSign,
  Activity,
  MoreHorizontal,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import * as XLSX from "xlsx";
import { Cliente, Implemento, OrdemServico } from "../types";
import { API } from "../lib/api";

interface ClientesViewProps {
  clientes: Cliente[];
  implementos?: Implemento[];
  ordens?: OrdemServico[];
  onRefresh: () => Promise<void>;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  clientes,
  implementos = [],
  ordens = [],
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  
  // Split Screen Detailed View State
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"geral" | "enderecos" | "contatos" | "equipamentos" | "historico" | "financeiro">("geral");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPage] = useState(20);

  // Sorting State
  const [sortField, setSortField] = useState<string>("razao_social");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Form State
  const [codigoSankhya, setCodigoSankhya] = useState("");
  const [tipoPessoa, setTipoPessoa] = useState<"J" | "F">("J");
  const [ativo, setAtivo] = useState(true);
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("RO");
  const [telefone, setTelefone] = useState("");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");
  const [observacao, setObservacao] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const openForm = (cliente: Cliente | null = null) => {
    if (cliente) {
      setEditingCliente(cliente);
      setCodigoSankhya(cliente.codigo_sankhya || "");
      setTipoPessoa(cliente.tipo_pessoa || "J");
      setAtivo(cliente.ativo !== false);
      setRazaoSocial(cliente.razao_social);
      setNomeFantasia(cliente.nome_fantasia || "");
      setCpfCnpj(cliente.cpf_cnpj || "");
      setInscricaoEstadual(cliente.inscricao_estadual || "");
      setCep(cliente.cep || "");
      setEndereco(cliente.endereco || "");
      setNumero(cliente.numero || "");
      setComplemento(cliente.complemento || "");
      setBairro(cliente.bairro || "");
      setCidade(cliente.cidade);
      setUf(cliente.uf);
      setTelefone(cliente.telefone || "");
      setCelular(cliente.celular || "");
      setEmail(cliente.email || "");
      setObservacao(cliente.observacao || "");
    } else {
      setEditingCliente(null);
      setCodigoSankhya("");
      setTipoPessoa("J");
      setAtivo(true);
      setRazaoSocial("");
      setNomeFantasia("");
      setCpfCnpj("");
      setInscricaoEstadual("");
      setCep("");
      setEndereco("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCidade("");
      setUf("RO");
      setTelefone("");
      setCelular("");
      setEmail("");
      setObservacao("");
    }
    setIsModalOpen(true);
  };

  const closeForm = () => {
    setIsModalOpen(false);
    setEditingCliente(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial.trim()) {
      showToast("Razão Social é obrigatória.", "error");
      return;
    }
    if (!cidade.trim()) {
      showToast("Cidade é obrigatória.", "error");
      return;
    }

    setIsLoading(true);
    const payload: Cliente = {
      codigo_sankhya: codigoSankhya,
      tipo_pessoa: tipoPessoa,
      ativo: ativo,
      razao_social: razaoSocial.toUpperCase(),
      nome_fantasia: nomeFantasia,
      cpf_cnpj: cpfCnpj,
      inscricao_estadual: inscricaoEstadual,
      cep: cep,
      endereco: endereco,
      numero: numero,
      complemento: complemento,
      bairro: bairro,
      cidade: cidade.toUpperCase(),
      uf: uf.toUpperCase(),
      telefone: telefone,
      celular: celular,
      email: email,
      observacao: observacao,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingCliente && editingCliente.id) {
        await API.clientes.atualizar(editingCliente.id, payload);
        showToast("Cliente alterado com sucesso!", "success");
      } else {
        await API.clientes.inserir(payload);
        showToast("Cliente cadastrado com sucesso!", "success");
      }
      closeForm();
      await onRefresh();
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar cliente.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja realmente excluir este cliente? Toda a frota vinculada será afetada.")) return;
    setIsLoading(true);
    try {
      await API.clientes.excluir(id);
      showToast("Cliente excluído.", "success");
      await onRefresh();
    } catch (err) {
      console.error(err);
      showToast("Erro ao excluir cliente.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter clients based on search query
  const filteredClientes = clientes.filter(c => {
    const q = searchTerm.toLowerCase();
    return (
      c.razao_social.toLowerCase().includes(q) ||
      (c.nome_fantasia || "").toLowerCase().includes(q) ||
      (c.cidade || "").toLowerCase().includes(q) ||
      (c.codigo_sankhya || "").includes(q) ||
      (c.cpf_cnpj || "").includes(q)
    );
  });

  // Sort clients based on sort state
  const sortedClientes = [...filteredClientes].sort((a, b) => {
    let valA: any = a[sortField as keyof Cliente];
    let valB: any = b[sortField as keyof Cliente];

    if (sortField === "codigo_sankhya") {
      valA = a.codigo_sankhya || "";
      valB = b.codigo_sankhya || "";
    } else if (sortField === "cidade") {
      valA = `${a.cidade || ""} - ${a.uf || ""}`;
      valB = `${b.cidade || ""} - ${b.uf || ""}`;
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

  // Pagination calculation
  const totalPages = Math.ceil(sortedClientes.length / itemsPerPage) || 1;
  const pageIndex = Math.min(currentPage, totalPages);
  const startIdx = (pageIndex - 1) * itemsPerPage;
  const paginatedClientes = sortedClientes.slice(startIdx, startIdx + itemsPerPage);

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
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">
            Clientes
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Cadastro, gestão e listagem unificada de clientes e parceiros de serviço.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openForm(null)}
            className="btn bg-brand-red text-white hover:bg-brand-red-dark border-none shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Grid Layout: Handles both normal view and split-pane detail view */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Side: Client Table List */}
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 ${
          selectedCliente ? "col-span-12 lg:col-span-5" : "col-span-12"
        }`}>
          {/* Table toolbar search */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Pesquisar por razão social, cidade, CNPJ ou código..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg w-full text-xs"
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={async () => {
                  setIsLoading(true);
                  await onRefresh();
                  setIsLoading(false);
                  showToast("Dados atualizados!", "info");
                }}
                disabled={isLoading}
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 flex items-center gap-1"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Table representation */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[10px] font-bold text-gray-400 uppercase tracking-wider select-none">
                  <th 
                    className="p-4 w-16 text-center cursor-pointer hover:bg-gray-100/80 transition-colors"
                    onClick={() => toggleSort("codigo_sankhya")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Código
                      {sortField === "codigo_sankhya" && (
                        sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors"
                    onClick={() => toggleSort("razao_social")}
                  >
                    <div className="flex items-center gap-1">
                      Razão Social
                      {sortField === "razao_social" && (
                        sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                      )}
                    </div>
                  </th>
                  {!selectedCliente && (
                    <>
                      <th 
                        className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors"
                        onClick={() => toggleSort("cidade")}
                      >
                        <div className="flex items-center gap-1">
                          Cidade / UF
                          {sortField === "cidade" && (
                            sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors"
                        onClick={() => toggleSort("cpf_cnpj")}
                      >
                        <div className="flex items-center gap-1">
                          CNPJ / CPF
                          {sortField === "cpf_cnpj" && (
                            sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors"
                        onClick={() => toggleSort("celular")}
                      >
                        <div className="flex items-center gap-1">
                          Contato
                          {sortField === "celular" && (
                            sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                          )}
                        </div>
                      </th>
                    </>
                  )}
                  <th 
                    className="p-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors"
                    onClick={() => toggleSort("ativo")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Status
                      {sortField === "ativo" && (
                        sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-right w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {paginatedClientes.length === 0 ? (
                  <tr>
                    <td colSpan={selectedCliente ? 4 : 7} className="p-8 text-center text-gray-400">
                      Nenhum cliente correspondente encontrado.
                    </td>
                  </tr>
                ) : (
                  paginatedClientes.map((cliente) => (
                    <tr 
                      key={cliente.id} 
                      onClick={() => setSelectedCliente(cliente)}
                      className={`hover:bg-rose-50/15 transition-colors cursor-pointer ${
                        selectedCliente?.id === cliente.id ? "bg-rose-50/10 border-l-2 border-brand-red" : ""
                      }`}
                    >
                      <td className="p-4 text-center font-semibold text-gray-700">
                        {cliente.codigo_sankhya || `#${cliente.id}`}
                      </td>
                      <td className="p-4 font-bold text-brand-ink">
                        <div>{cliente.razao_social}</div>
                        {cliente.nome_fantasia && (
                          <div className="text-[10px] text-gray-400 font-normal">{cliente.nome_fantasia}</div>
                        )}
                      </td>
                      {!selectedCliente && (
                        <>
                          <td className="p-4 text-gray-600">
                            {cliente.cidade} / {cliente.uf}
                          </td>
                          <td className="p-4 text-gray-500 font-mono">
                            {cliente.cpf_cnpj || "—"}
                          </td>
                          <td className="p-4 text-gray-500">
                            <div>{cliente.celular || cliente.telefone || "—"}</div>
                            {cliente.email && <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{cliente.email}</div>}
                          </td>
                        </>
                      )}
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                          cliente.ativo !== false 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                            : "bg-rose-50 text-rose-800 border-rose-100"
                        }`}>
                          {cliente.ativo !== false ? "ATIVO" : "INATIVO"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedCliente(cliente)}
                          className="p-1 text-sky-600 hover:bg-sky-50 rounded"
                          title="Visualizar"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openForm(cliente)}
                          className="p-1 text-sky-600 hover:bg-sky-50 rounded"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer Pagination */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4 text-xs text-gray-500 bg-gray-50/50">
            <div>
              Mostrando <span className="font-semibold">{paginatedClientes.length}</span> de{" "}
              <span className="font-semibold">{filteredClientes.length}</span> clientes encontrados.
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

        {/* Right Side: Client Detailed Card Panel */}
        <AnimatePresence>
          {selectedCliente && (
            <motion.div
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 25 }}
              className="col-span-12 lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
            >
              {/* Detail header */}
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide border ${
                      selectedCliente.ativo !== false 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                        : "bg-rose-50 text-rose-800 border-rose-100"
                    }`}>
                      {selectedCliente.ativo !== false ? "ATIVO" : "INATIVO"}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-gray-400">
                      {selectedCliente.codigo_sankhya || `#${selectedCliente.id}`}
                    </span>
                  </div>
                  <h3 className="font-display font-extrabold text-base text-gray-800 leading-tight">
                    {selectedCliente.razao_social}
                  </h3>
                  {selectedCliente.nome_fantasia && (
                    <p className="text-xs text-gray-500 font-semibold">{selectedCliente.nome_fantasia}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openForm(selectedCliente)}
                    className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 flex items-center gap-1 shadow-xs"
                  >
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => setSelectedCliente(null)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 transition-colors"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subtabs bar */}
              <div className="border-b border-gray-150 px-2.5 bg-gray-50/50 flex items-end overflow-x-auto scrollbar-none gap-0.5 select-none h-10 shrink-0">
                {(["geral", "enderecos", "contatos", "equipamentos", "historico", "financeiro"] as const).map((tab) => {
                  const labels: Record<string, string> = {
                    geral: "Dados Gerais",
                    enderecos: "Endereços",
                    contatos: "Contatos",
                    equipamentos: "Equipamentos",
                    historico: "Histórico",
                    financeiro: "Financeiro"
                  };
                  const isActive = activeDetailTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveDetailTab(tab)}
                      className={`h-8 px-3 rounded-t-md text-[10px] font-black uppercase tracking-wider transition-all border border-transparent shrink-0 ${
                        isActive 
                          ? "bg-white border-gray-200 border-b-white text-brand-red font-black" 
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>

              {/* Detail content scrollbox */}
              <div className="p-5 overflow-y-auto max-h-[550px] space-y-5 flex-1 min-h-[400px]">
                {activeDetailTab === "geral" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Empresa */}
                      <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-brand-red" /> Dados da Empresa
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Razão Social</span>
                            <p className="font-bold text-gray-700 break-words">{selectedCliente.razao_social}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Nome Fantasia</span>
                            <p className="font-semibold text-gray-600">{selectedCliente.nome_fantasia || "—"}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">CNPJ / CPF</span>
                            <p className="font-mono text-gray-600">{selectedCliente.cpf_cnpj || "—"}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Insc. Estadual</span>
                            <p className="font-mono text-gray-600">{selectedCliente.inscricao_estadual || "—"}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Tipo de Parceiro</span>
                            <div>
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-100 text-[9px] font-extrabold">
                                {selectedCliente.tipo_pessoa === "J" ? "RURAL / PJ" : "PRODUTOR FÍSICO"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contato Principal */}
                      <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-brand-red" /> Contato Principal
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Representante</span>
                            <p className="font-bold text-gray-700">{selectedCliente.razao_social.split(" ")[0]} (Geral)</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Cargo / Função</span>
                            <p className="font-semibold text-gray-600 font-sans">Proprietário Rural</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Telefone</span>
                            <p className="font-bold text-gray-700">{selectedCliente.telefone || "—"}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">E-mail</span>
                            <p className="text-gray-600 break-all">{selectedCliente.email || "—"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Endereço Principal */}
                      <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-brand-red" /> Endereço Principal
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Propriedade / Fazenda</span>
                            <p className="font-bold text-gray-700">{selectedCliente.nome_fantasia || "Fazenda Santa Maria"}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Cidade / UF</span>
                            <p className="font-semibold text-gray-600">{selectedCliente.cidade} / {selectedCliente.uf}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">CEP</span>
                            <p className="font-mono text-gray-600">{selectedCliente.cep || "—"}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Endereço de Acesso</span>
                            <p className="text-gray-600">{selectedCliente.endereco || "—"} {selectedCliente.numero || ""}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Observações */}
                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-display">Observações de Campo</h4>
                      <p className="text-xs text-gray-600 italic whitespace-pre-line leading-relaxed">
                        {selectedCliente.observacao || "Cliente sem observações registradas."}
                      </p>
                    </div>
                  </div>
                )}

                {activeDetailTab === "enderecos" && (
                  <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100 space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-brand-red shrink-0" />
                      <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Endereço de Cobrança e Entrega</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">CEP</span>
                        <span className="font-mono font-bold text-gray-700">{selectedCliente.cep || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Bairro</span>
                        <span className="font-bold text-gray-700">{selectedCliente.bairro || "—"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Logradouro / Rodovia / KM</span>
                        <span className="font-semibold text-gray-700">{selectedCliente.endereco || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Número</span>
                        <span className="font-bold text-gray-700">{selectedCliente.numero || "S/N"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Complemento</span>
                        <span className="text-gray-600">{selectedCliente.complemento || "—"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Município / Estado</span>
                        <span className="font-black text-gray-800">{selectedCliente.cidade} — {selectedCliente.uf}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === "contatos" && (
                  <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100 space-y-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-brand-red shrink-0" />
                      <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Informações de Contato</h4>
                    </div>
                    <div className="divide-y divide-gray-150/50 text-xs">
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-gray-400 uppercase text-[9px] font-bold">Telefone Fixo</span>
                        <span className="font-bold text-gray-700">{selectedCliente.telefone || "Não informado"}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-gray-400 uppercase text-[9px] font-bold">Celular / WhatsApp</span>
                        <span className="font-bold text-brand-red">{selectedCliente.celular || "Não informado"}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-gray-400 uppercase text-[9px] font-bold">E-mail Comercial</span>
                        <span className="font-semibold text-gray-700">{selectedCliente.email || "Não informado"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === "equipamentos" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Tractor className="w-4 h-4 text-brand-red" /> Máquinas Vinculadas
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded">
                        {implementos.filter(i => i.cliente_id === selectedCliente.id).length} Máquinas
                      </span>
                    </div>
                    {implementos.filter(i => i.cliente_id === selectedCliente.id).length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                        Nenhum implemento ou máquina cadastrada para este cliente.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {implementos.filter(i => i.cliente_id === selectedCliente.id).map((imp) => (
                          <div key={imp.id} className="p-3 border border-gray-150 bg-gray-50/40 rounded-xl flex items-center justify-between">
                            <div>
                              <h5 className="text-xs font-bold text-gray-800 uppercase">{imp.modelo}</h5>
                              <p className="text-[9px] text-gray-400 font-medium mt-0.5">Série: {imp.numero_serie || "—"} • Ano: {imp.ano || "—"}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-black text-gray-700 font-mono block">{imp.horimetro_atual || 0}h</span>
                              <span className="text-[9px] font-bold text-gray-400 block uppercase">Horímetro</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeDetailTab === "historico" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-brand-red" /> Ordens de Serviço (O.S.)
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded">
                        {ordens.filter(o => o.cliente_id === selectedCliente.id).length} Registros
                      </span>
                    </div>
                    {ordens.filter(o => o.cliente_id === selectedCliente.id).length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                        Nenhuma ordem de serviço vinculada a este cliente.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {ordens.filter(o => o.cliente_id === selectedCliente.id).map((os) => {
                          const statusColors: Record<string, string> = {
                            ABERTA: "bg-amber-50 text-amber-800 border-amber-200",
                            "EM ATENDIMENTO": "bg-blue-50 text-blue-800 border-blue-200",
                            AGENDADA: "bg-orange-50 text-orange-800 border-orange-200",
                            FINALIZADA: "bg-emerald-50 text-emerald-800 border-emerald-200",
                            CANCELADA: "bg-rose-50 text-rose-800 border-rose-200"
                          };
                          return (
                            <div key={os.id} className="p-3 border border-gray-100 bg-gray-50/50 rounded-xl flex justify-between items-center text-xs">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-800">{os.numero_os}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold border ${statusColors[os.status] || "bg-gray-100 border-gray-200"}`}>
                                    {os.status}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400">{os.tipo_atendimento || "Serviço Geral"}</p>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-gray-800 block font-mono">
                                  {(Number(os.valor_total) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </span>
                                <span className="text-[9px] text-gray-400 font-medium">
                                  {os.data_atendimento ? new Date(os.data_atendimento).toLocaleDateString("pt-BR") : "—"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeDetailTab === "financeiro" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-brand-red shrink-0" />
                      <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Histórico de Faturamento</h4>
                    </div>
                    
                    {/* Summary metrics card */}
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100/60">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Total Faturado</span>
                        <span className="text-sm font-black text-emerald-700 font-mono block mt-1">
                          {ordens
                            .filter(o => o.cliente_id === selectedCliente.id && o.status === "FINALIZADA")
                            .reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0)
                            .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      </div>
                      <div className="p-3 bg-rose-50/40 rounded-xl border border-rose-100/60">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Ordens em Aberto</span>
                        <span className="text-sm font-black text-brand-red font-mono block mt-1">
                          {ordens.filter(o => o.cliente_id === selectedCliente.id && o.status !== "FINALIZADA" && o.status !== "CANCELADA").length} O.S.
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-150 text-[11px] text-gray-500 leading-relaxed font-medium">
                      O faturamento geral reflete todas as Ordens de Serviço finalizadas no sistema. Faturas emitidas via Integração Sankhya ou faturas manuais de peças adicionais.
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    {/* Form Modal (Add / Edit Client) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-2xl overflow-hidden my-8"
            >
              <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-brand-red" />
                  <h3 className="font-display font-extrabold uppercase text-lg tracking-wider">
                    {editingCliente ? "Editar Cliente" : "Cadastrar Novo Cliente"}
                  </h3>
                </div>
                <button onClick={closeForm} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                {/* Form fields in grid */}
                <div className="space-y-4">
                  {/* General Block */}
                  <div>
                    <h4 className="text-[11px] font-bold text-brand-red uppercase tracking-wider border-b border-gray-150 pb-1 mb-3 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Dados Gerais
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Código Sankhya</label>
                        <input
                          type="text"
                          value={codigoSankhya}
                          onChange={(e) => setCodigoSankhya(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Tipo de Pessoa</label>
                        <select
                          value={tipoPessoa}
                          onChange={(e) => setTipoPessoa(e.target.value as "J" | "F")}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        >
                          <option value="J">Jurídica (CNPJ)</option>
                          <option value="F">Física (CPF)</option>
                        </select>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Razão Social *</label>
                        <input
                          type="text"
                          required
                          value={razaoSocial}
                          onChange={(e) => setRazaoSocial(e.target.value)}
                          placeholder="Ex: FAZENDA BOA VISTA LTDA"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nome Fantasia / Fazenda</label>
                        <input
                          type="text"
                          value={nomeFantasia}
                          onChange={(e) => setNomeFantasia(e.target.value)}
                          placeholder="Ex: FAZENDA SANTA ALICE"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">CPF / CNPJ</label>
                        <input
                          type="text"
                          value={cpfCnpj}
                          onChange={(e) => setCpfCnpj(e.target.value)}
                          placeholder="Ex: 00.000.000/0001-00"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Block */}
                  <div>
                    <h4 className="text-[11px] font-bold text-brand-red uppercase tracking-wider border-b border-gray-150 pb-1 mb-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Localização / Endereço
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Cidade *</label>
                        <input
                          type="text"
                          required
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">UF *</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={uf}
                          onChange={(e) => setUf(e.target.value.toUpperCase())}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Bairro</label>
                        <input
                          type="text"
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Rua / Rodovia</label>
                        <input
                          type="text"
                          value={endereco}
                          onChange={(e) => setEndereco(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Número</label>
                        <input
                          type="text"
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contacts Block */}
                  <div>
                    <h4 className="text-[11px] font-bold text-brand-red uppercase tracking-wider border-b border-gray-150 pb-1 mb-3 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Contatos
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Celular</label>
                        <input
                          type="text"
                          value={celular}
                          onChange={(e) => setCelular(e.target.value)}
                          placeholder="(69) 99999-9999"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Telefone Fixo</label>
                        <input
                          type="text"
                          value={telefone}
                          onChange={(e) => setTelefone(e.target.value)}
                          placeholder="(69) 3535-0000"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">E-mail</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="parceiro@exemplo.com"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Observations */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Observações do Cliente</label>
                    <textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red min-h-[60px]"
                      placeholder="Histórico de pagamentos, pontos de referência de acesso à propriedade, etc."
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
                    {isLoading ? "Salvando..." : "Salvar Cliente"}
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
