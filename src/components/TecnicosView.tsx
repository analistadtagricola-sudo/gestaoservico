/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
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
  User,
  Phone,
  Mail,
  Palette,
  Calendar,
  DollarSign,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Tecnico } from "../types";
import { API } from "../lib/api";

interface TecnicosViewProps {
  tecnicos: Tecnico[];
  onRefresh: () => Promise<void>;
}

export const TecnicosView: React.FC<TecnicosViewProps> = ({
  tecnicos,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTecnico, setEditingTecnico] = useState<Tecnico | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<string>("nome");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Form states
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [cargo, setCargo] = useState("TÉCNICO");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [corAgenda, setCorAgenda] = useState("#2563eb");
  const [googleCalendarId, setGoogleCalendarId] = useState("");
  const [valorHora, setValorHora] = useState<number>(0);
  const [valorKm, setValorKm] = useState<number>(0);
  const [comissaoTecnico, setComissaoTecnico] = useState<number>(0);
  const [comissaoAuxiliar, setComissaoAuxiliar] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const openForm = (tecnico: Tecnico | null = null) => {
    if (tecnico) {
      setEditingTecnico(tecnico);
      setNome(tecnico.nome);
      setApelido(tecnico.apelido);
      setCargo(tecnico.cargo || "TÉCNICO");
      setTelefone(tecnico.telefone || "");
      setEmail(tecnico.email || "");
      setAtivo(tecnico.ativo !== false);
      setCorAgenda(tecnico.cor_agenda || "#2563eb");
      setGoogleCalendarId(tecnico.google_calendar_id || "");
      setValorHora(tecnico.valor_hora || 0);
      setValorKm(tecnico.valor_km || 0);
      setComissaoTecnico(tecnico.comissao_tecnico || 0);
      setComissaoAuxiliar(tecnico.comissao_auxiliar || 0);
    } else {
      setEditingTecnico(null);
      setNome("");
      setApelido("");
      setCargo("TÉCNICO");
      setTelefone("");
      setEmail("");
      setAtivo(true);
      setCorAgenda("#2563eb");
      setGoogleCalendarId("");
      setValorHora(0);
      setValorKm(0);
      setComissaoTecnico(0);
      setComissaoAuxiliar(0);
    }
    setIsModalOpen(true);
  };

  const closeForm = () => {
    setIsModalOpen(false);
    setEditingTecnico(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !apelido.trim()) {
      showToast("Nome Completo e Apelido são obrigatórios.", "error");
      return;
    }

    setIsLoading(true);
    const payload: Tecnico = {
      nome: nome.toUpperCase(),
      apelido: apelido.toUpperCase(),
      cargo,
      telefone,
      email,
      ativo,
      cor_agenda: corAgenda,
      google_calendar_id: googleCalendarId,
      valor_hora: Number(valorHora),
      valor_km: Number(valorKm),
      comissao_tecnico: Number(comissaoTecnico),
      comissao_auxiliar: Number(comissaoAuxiliar)
    };

    try {
      if (editingTecnico && editingTecnico.id) {
        await API.tecnicos.atualizar(editingTecnico.id, payload);
        showToast("Técnico atualizado com sucesso!", "success");
      } else {
        await API.tecnicos.inserir(payload);
        showToast("Técnico cadastrado com sucesso!", "success");
      }
      closeForm();
      await onRefresh();
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar técnico.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja realmente remover este técnico do cadastro geral?")) return;
    setIsLoading(true);
    try {
      await API.tecnicos.excluir(id);
      showToast("Técnico excluído.", "success");
      await onRefresh();
    } catch (err) {
      console.error(err);
      showToast("Erro ao excluir técnico.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tech team list
  const filteredTecnicos = tecnicos.filter(t => {
    const q = searchTerm.toLowerCase();
    return (
      t.nome.toLowerCase().includes(q) ||
      t.apelido.toLowerCase().includes(q) ||
      (t.cargo || "").toLowerCase().includes(q) ||
      (t.email || "").toLowerCase().includes(q)
    );
  });

  const sortedTecnicos = [...filteredTecnicos].sort((a, b) => {
    let valA: any = a[sortField as keyof Tecnico];
    let valB: any = b[sortField as keyof Tecnico];

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">
            Equipe Técnica
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Cadastro de técnicos, tarifas de horas de serviço e KM rodado para faturamento.
          </p>
        </div>

        <button
          onClick={() => openForm(null)}
          className="btn bg-brand-red text-white hover:bg-brand-red-dark border-none shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Novo Técnico
        </button>
      </div>

      {/* List Search & Table representation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Pesquisar por nome, apelido, cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg w-full text-xs"
            />
          </div>

          <button
            onClick={async () => {
              setIsLoading(true);
              await onRefresh();
              setIsLoading(false);
              showToast("Técnicos atualizados!", "info");
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
                <th className="p-4 w-12 text-center cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("id")}>
                  <div className="flex items-center justify-center gap-1">
                    ID
                    {sortField === "id" && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                    )}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("nome")}>
                  <div className="flex items-center gap-1">
                    Técnico (Nome Completo)
                    {sortField === "nome" && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                    )}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("apelido")}>
                  <div className="flex items-center gap-1">
                    Apelido
                    {sortField === "apelido" && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                    )}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("cargo")}>
                  <div className="flex items-center gap-1">
                    Cargo / Função
                    {sortField === "cargo" && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                    )}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("email")}>
                  <div className="flex items-center gap-1">
                    Contato
                    {sortField === "email" && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("comissao_tecnico")}>
                  <div className="flex items-center justify-center gap-1">
                    Comissão
                    {sortField === "comissao_tecnico" && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("valor_hora")}>
                  <div className="flex items-center justify-center gap-1">
                    Tarifas (Hora/KM)
                    {sortField === "valor_hora" && (
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
                <th className="p-4 text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {sortedTecnicos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    Nenhum técnico cadastrado ou localizado.
                  </td>
                </tr>
              ) : (
                sortedTecnicos.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-center font-semibold text-gray-400">#{t.id}</td>
                    <td className="p-4 font-bold text-brand-ink">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: t.cor_agenda || "#2563eb" }} />
                        {t.nome}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-gray-700">{t.apelido}</td>
                    <td className="p-4 text-gray-500 font-semibold">{t.cargo || "TÉCNICO"}</td>
                    <td className="p-4 text-gray-500">
                      <div>{t.telefone || "—"}</div>
                      {t.email && <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{t.email}</div>}
                    </td>
                    <td className="p-4 text-center">
                      <div className="text-[10px] font-bold text-gray-700">Téc: {t.comissao_tecnico ? `${t.comissao_tecnico}%` : "—"}</div>
                      <div className="text-[10px] font-bold text-gray-500">Aux: {t.comissao_auxiliar ? `${t.comissao_auxiliar}%` : "—"}</div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="font-semibold text-brand-ink">Hora: {t.valor_hora ? t.valor_hora.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</div>
                      <div className="text-[10px] text-gray-400">KM: {t.valor_km ? t.valor_km.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                        t.ativo !== false 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                          : "bg-rose-50 text-rose-800 border-rose-100"
                      }`}>
                        {t.ativo !== false ? "ATIVO" : "INATIVO"}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <button
                        onClick={() => openForm(t)}
                        className="p-1 text-sky-600 hover:bg-sky-50 rounded"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => t.id && handleDelete(t.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
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
      </div>

      {/* Form Modal (Add / Edit Technician) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-xl overflow-hidden my-8"
            >
              <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-brand-red" />
                  <h3 className="font-display font-extrabold uppercase text-lg tracking-wider">
                    {editingTecnico ? "Editar Técnico" : "Cadastrar Novo Técnico"}
                  </h3>
                </div>
                <button onClick={closeForm} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="space-y-4">
                  {/* General */}
                  <div>
                    <h4 className="text-[11px] font-bold text-brand-red uppercase tracking-wider border-b border-gray-150 pb-1 mb-3 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Dados Pessoais
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          placeholder="Ex: JEFFERSON SILVA"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Apelido *</label>
                        <input
                          type="text"
                          required
                          value={apelido}
                          onChange={(e) => setApelido(e.target.value)}
                          placeholder="Ex: JEFFERSON"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Cargo / Função</label>
                        <select
                          value={cargo}
                          onChange={(e) => setCargo(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        >
                          <option>TÉCNICO</option>
                          <option>TÉCNICO SÊNIOR</option>
                          <option>SUPERVISOR TÉCNICO</option>
                          <option>GERENTE DE SERVIÇOS</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Telefone</label>
                        <input
                          type="text"
                          value={telefone}
                          onChange={(e) => setTelefone(e.target.value)}
                          placeholder="(69) 99200-0000"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">E-mail</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tecnico@exemplo.com"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
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
                  </div>

                  {/* Calendar Sync Setup */}
                  <div>
                    <h4 className="text-[11px] font-bold text-brand-red uppercase tracking-wider border-b border-gray-150 pb-1 mb-3 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" /> Agenda & Integração
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Cor da Agenda</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={corAgenda}
                            onChange={(e) => setCorAgenda(e.target.value)}
                            className="w-10 h-8 border border-gray-200 rounded p-0 cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-gray-400">{corAgenda.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" /> ID Google Calendar
                        </label>
                        <input
                          type="text"
                          value={googleCalendarId}
                          onChange={(e) => setGoogleCalendarId(e.target.value)}
                          placeholder="exemplo@group.calendar.google.com"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Finance / Rates setup */}
                  <div>
                    <h4 className="text-[11px] font-bold text-brand-red uppercase tracking-wider border-b border-gray-150 pb-1 mb-3 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> Tarifação Financeira
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Valor da Hora Técnica (R$)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={valorHora}
                          onChange={(e) => setValorHora(Number(e.target.value))}
                          placeholder="Ex: 120.00"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Valor de Deslocamento p/ KM (R$)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={valorKm}
                          onChange={(e) => setValorKm(Number(e.target.value))}
                          placeholder="Ex: 2.50"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Comissão como Técnico (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={comissaoTecnico}
                          onChange={(e) => setComissaoTecnico(Number(e.target.value))}
                          placeholder="Ex: 10.00"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Comissão como Auxiliar (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={comissaoAuxiliar}
                          onChange={(e) => setComissaoAuxiliar(Number(e.target.value))}
                          placeholder="Ex: 5.00"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                        />
                      </div>
                    </div>
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
                    {isLoading ? "Salvando..." : "Salvar Técnico"}
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
