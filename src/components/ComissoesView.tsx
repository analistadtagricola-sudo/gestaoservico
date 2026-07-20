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
  CheckCircle2, 
  TrendingUp, 
  DollarSign,
  Wallet,
  Percent,
  Briefcase,
  Filter,
  User,
  Calendar,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { OrdemServico, Tecnico } from "../types";

interface ComissaoManual {
  id: string;
  tecnico_id: number;
  data: string;
  valor: number;
  descricao: string;
  status: "PENDENTE" | "PAGO";
}

interface ComissoesViewProps {
  ordens: OrdemServico[];
  tecnicos: Tecnico[];
  onRefresh: () => Promise<void>;
}

export const ComissoesView: React.FC<ComissoesViewProps> = ({
  ordens,
  tecnicos,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTechFilter, setSelectedTechFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("TODAS");

  // State for manual adjustments / bonus CRUD
  const [comissoesManuais, setComissoesManuais] = useState<ComissaoManual[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComissao, setEditingComissao] = useState<ComissaoManual | null>(null);

  // Form Fields
  const [formTecnicoId, setFormTecnicoId] = useState("");
  const [formData, setFormData] = useState("");
  const [formValor, setFormValor] = useState<number>(0);
  const [formDescricao, setFormDescricao] = useState("");
  const [formStatus, setFormStatus] = useState<"PENDENTE" | "PAGO">("PENDENTE");


  // Local state for payment statuses of auto-generated commissions from O.S.
  // stored by OS ID in localStorage
  const [paidOSIds, setPaidOSIds] = useState<Record<number, boolean>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<string>("data");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    // Load manual commission records from localStorage
    const savedManuais = localStorage.getItem("gst_comissoes_manuais");
    if (savedManuais) {
      setComissoesManuais(JSON.parse(savedManuais));
    }

    // Load paid statuses for O.S. commissions
    const savedPaidStatuses = localStorage.getItem("gst_comissoes_os_pagas");
    if (savedPaidStatuses) {
      setPaidOSIds(JSON.parse(savedPaidStatuses));
    }
  }, []);

  const saveManualCommissions = (updatedList: ComissaoManual[]) => {
    setComissoesManuais(updatedList);
    localStorage.setItem("gst_comissoes_manuais", JSON.stringify(updatedList));
  };

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Generate commissions based on finalized O.S.
  const getAutoCommissions = () => {
    const finalized = ordens.filter(o => o.status === "FINALIZADA");
    
    const commissions: any[] = [];
    
    finalized.forEach(o => {
      const laborValue = Number(o.valor_mao_obra) || 0;
      const displacementValue = Number(o.valor_deslocamento) || 0;
      const totalBaseValue = laborValue + displacementValue;
      const tech = tecnicos.find(t => t.id === o.tecnico_id);
      const techRate = tech?.comissao_tecnico || 0;
      
      // Client/Implement details
      const clienteNome = o.clientes?.razao_social || "N/A";
      const equipModelo = o.implementos?.modelo || "N/A";
      const equipSerie = o.implementos?.numero_serie || "N/A";
      const tipoOS = o.tipo_atendimento || "N/A";
      const totalOS = o.valor_total || 0;
      
      const isEntregaTecnica = o.tipo_atendimento?.toLowerCase().includes("entrega técnica");
      
      let valorFixoEntregaTecnica = 0;
      const savedConfig = localStorage.getItem("gst_comissoes_config");
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          const regras = parsed.regrasEntrega || [];
          const regra = regras.find((r: any) => o.tipo_atendimento?.toLowerCase() === r.tipo.toLowerCase());
          if (regra) {
            valorFixoEntregaTecnica = parseFloat(regra.valor) || 0;
          }
        } catch (e) {
          // ignore
        }
      }
      
      // Main Technician
      if (o.tecnico_id && tech) {
        let calculatedValue;
        
        if (isEntregaTecnica) {
           calculatedValue = valorFixoEntregaTecnica;
           if (o.auxiliar_id) calculatedValue = calculatedValue / 2;
        } else {
          calculatedValue = totalBaseValue * (techRate / 100);
          
          // If auxiliary exists, technician only gets half
          if (o.auxiliar_id) {
            calculatedValue = calculatedValue / 2;
          }
        }
        
        const isPaid = paidOSIds[`${o.id}-tech`] || false;
        
        commissions.push({
          id: `OS-${o.id}-tech`,
          os_id: o.id,
          numero_os: o.numero_os,
          tecnico_id: o.tecnico_id,
          tecnico_nome: tech.apelido || tech.nome || "Técnico Não Definido",
          data: o.data_termino || o.data_atendimento || o.created_at || "",
          valor_os: totalOS,
          valor_mao_obra: laborValue,
          valor_comissao: calculatedValue,
          status: isPaid ? "PAGO" : "PENDENTE" as "PAGO" | "PENDENTE",
          descricao: `Comissão automática O.S. ${o.numero_os} (Técnico)${o.auxiliar_id ? ' (50%)' : ''}`,
          cliente_nome: clienteNome,
          equipamento_modelo: equipModelo,
          equipamento_serie: equipSerie,
          tipo_os: tipoOS
        });
      }

      // Auxiliary Technician
      if (o.auxiliar_id) {
        const aux = tecnicos.find(t => t.id === o.auxiliar_id);
        if (aux) {
          let calculatedValue;
          if (isEntregaTecnica) {
             calculatedValue = valorFixoEntregaTecnica / 2;
          } else {
             // Auxiliary gets half of the technician's base commission
             calculatedValue = (totalBaseValue * (techRate / 100)) / 2;
          }
          const isPaid = paidOSIds[`${o.id}-aux`] || false;
          
          commissions.push({
            id: `OS-${o.id}-aux`,
            os_id: o.id,
            numero_os: o.numero_os,
            tecnico_id: o.auxiliar_id,
            tecnico_nome: aux.apelido || aux.nome || "Auxiliar Não Definido",
            data: o.data_termino || o.data_atendimento || o.created_at || "",
            valor_os: totalOS,
            valor_mao_obra: laborValue,
            valor_comissao: calculatedValue,
            status: isPaid ? "PAGO" : "PENDENTE" as "PAGO" | "PENDENTE",
            descricao: `Comissão automática O.S. ${o.numero_os} (Auxiliar) (50%)`,
            cliente_nome: clienteNome,
            equipamento_modelo: equipModelo,
            equipamento_serie: equipSerie,
            tipo_os: tipoOS
          });
        }
      }
    });

    return commissions;
  };

  // Combine automatic and manual commissions
  const getAllCommissions = () => {
    const autoComms = getAutoCommissions().map(ac => ({
      id: ac.id,
      tecnico_id: ac.tecnico_id || 0,
      tecnico_nome: ac.tecnico_nome,
      data: ac.data ? ac.data.substring(0, 10) : "",
      valor: ac.valor_comissao,
      descricao: ac.descricao,
      status: ac.status,
      isManual: false,
      os_id: ac.os_id,
      payment_key: ac.id, // Use unique key for payment toggle
      cliente_nome: ac.cliente_nome,
      equipamento_modelo: ac.equipamento_modelo,
      equipamento_serie: ac.equipamento_serie,
      tipo_os: ac.tipo_os,
      valor_os: ac.valor_os
    }));

    const manualComms = comissoesManuais.map(mc => {
      const tech = tecnicos.find(t => t.id === mc.tecnico_id);
      return {
        id: mc.id,
        tecnico_id: mc.tecnico_id,
        tecnico_nome: tech?.apelido || tech?.nome || "Técnico Não Definido",
        data: mc.data,
        valor: mc.valor,
        descricao: mc.descricao,
        status: mc.status,
        isManual: true,
        os_id: undefined
      };
    });

    return [...autoComms, ...manualComms].sort((a, b) => b.data.localeCompare(a.data));
  };

  // Filter commissions
  const getFilteredCommissions = () => {
    const all = getAllCommissions();
    const filtered = all.filter(c => {
      // Search term filter
      const q = searchTerm.toLowerCase();
      const matchesSearch = c.tecnico_nome.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q);
      
      // Tech select filter
      const matchesTech = selectedTechFilter === "" || String(c.tecnico_id) === selectedTechFilter;
      
      // Status filter
      const matchesStatus = selectedStatusFilter === "TODAS" || c.status === selectedStatusFilter;

      return matchesSearch && matchesTech && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField as keyof any];
      let valB: any = b[sortField as keyof any];

      if (sortField === "tecnico_nome") {
        valA = a.tecnico_nome || "";
        valB = b.tecnico_nome || "";
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
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle Commission Payment Status toggle for O.S.
  const handleToggleOSPayment = (paymentKey: string) => {
    const updated = { ...paidOSIds, [paymentKey]: !paidOSIds[paymentKey] };
    setPaidOSIds(updated);
    localStorage.setItem("gst_comissoes_os_pagas", JSON.stringify(updated));
    showToast(updated[paymentKey] ? "Comissão marcada como PAGA!" : "Comissão estornada para PENDENTE.");
  };

  // Manual commissions CRUD actions
  const openForm = (comm: ComissaoManual | null = null) => {
    if (comm) {
      setEditingComissao(comm);
      setFormTecnicoId(String(comm.tecnico_id));
      setFormData(comm.data);
      setFormValor(comm.valor);
      setFormDescricao(comm.descricao);
      setFormStatus(comm.status);
    } else {
      setEditingComissao(null);
      setFormTecnicoId("");
      setFormData(new Date().toISOString().substring(0, 10));
      setFormValor(0);
      setFormDescricao("");
      setFormStatus("PENDENTE");
    }
    setIsModalOpen(true);
  };

  const closeForm = () => {
    setIsModalOpen(false);
    setEditingComissao(null);
  };

  const handleSaveCommission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTecnicoId || formValor <= 0 || !formDescricao.trim()) {
      showToast("Preencha todos os campos corretamente.", "error");
      return;
    }

    const payload: ComissaoManual = {
      id: editingComissao?.id || "M" + String(Date.now()),
      tecnico_id: Number(formTecnicoId),
      data: formData,
      valor: Number(formValor),
      descricao: formDescricao.toUpperCase(),
      status: formStatus
    };

    let updatedList: ComissaoManual[];
    if (editingComissao) {
      updatedList = comissoesManuais.map(c => c.id === editingComissao.id ? payload : c);
      showToast("Comissão alterada com sucesso!");
    } else {
      updatedList = [...comissoesManuais, payload];
      showToast("Lançamento de comissão/bônus registrado!");
    }

    saveManualCommissions(updatedList);
    closeForm();
  };

  const handleDeleteCommission = (id: string) => {
    if (!confirm("Deseja realmente excluir este lançamento manual de comissão?")) return;
    const updated = comissoesManuais.filter(c => c.id !== id);
    saveManualCommissions(updated);
    showToast("Lançamento excluído.");
  };

  // Calculate high-level summary stats
  const filteredComms = getFilteredCommissions();
  const totalPendente = filteredComms.filter(c => c.status === "PENDENTE").reduce((sum, c) => sum + c.valor, 0);
  const totalPago = filteredComms.filter(c => c.status === "PAGO").reduce((sum, c) => sum + c.valor, 0);
  const totalGeral = totalPendente + totalPago;

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
              toastMessage.type === "success" ? "bg-emerald-600" : toastMessage.type === "error" ? "bg-rose-600" : "bg-blue-600"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header and top rule slider */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase text-brand-ink">
            Comissões e Tarifas
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestão de pagamento de comissões técnicas por horas trabalhadas e lançamentos manuais de bonificações.
          </p>
        </div>

        <div className="flex items-center gap-3">


          <button
            onClick={() => openForm(null)}
            className="btn bg-brand-red text-white hover:bg-brand-red-dark border-none shadow-sm flex items-center gap-1.5 py-2 px-4 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Lançar Comissão Manual
          </button>
        </div>
      </div>

      {/* Metric Cards Block */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Pendente</span>
              <h2 className="text-2xl font-extrabold font-display text-brand-ink mt-2">
                {totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h2>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase">Comissões aguardando acerto</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Pago</span>
              <h2 className="text-2xl font-extrabold font-display text-brand-ink mt-2">
                {totalPago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h2>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase">Histórico de acertos quitados</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gray-900" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Acumulado</span>
              <h2 className="text-2xl font-extrabold font-display text-brand-ink mt-2">
                {totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h2>
            </div>
            <div className="p-2.5 bg-gray-50 text-gray-700 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase font-mono">Faturamento operacional de comissão</p>
        </div>
      </div>

      {/* Grid Filters and Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar Search / Filter */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Pesquisar por técnico ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg w-full text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <select
              value={selectedTechFilter}
              onChange={(e) => setSelectedTechFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-600 font-semibold"
            >
              <option value="">Filtrar Técnico...</option>
              {tecnicos.map(t => (
                <option key={t.id} value={t.id}>{t.apelido || t.nome}</option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-600 font-semibold"
            >
              <option value="TODAS">Ver Todos Status</option>
              <option value="PENDENTE">Apenas Pendentes</option>
              <option value="PAGO">Apenas Pagos</option>
            </select>

            <button
              onClick={async () => {
                setIsLoading(true);
                await onRefresh();
                setIsLoading(false);
                showToast("Dados atualizados!", "info");
              }}
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
                <th className="p-4 w-28 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("data")}>
                  <div className="flex items-center gap-1">
                    Data
                    {sortField === "data" && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                    )}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("tecnico_nome")}>
                  <div className="flex items-center gap-1">
                    Técnico Beneficiário
                    {sortField === "tecnico_nome" && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                    )}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors">Cliente / Equipamento</th>
                <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors">Tipo / Valor O.S.</th>
                <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("descricao")}>
                  <div className="flex items-center gap-1">
                    Descrição
                    {sortField === "descricao" && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                    )}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("isManual")}>
                  <div className="flex items-center gap-1">
                    Tipo
                    {sortField === "isManual" && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("status")}>
                  <div className="flex items-center justify-center gap-1">
                    Status
                    {sortField === "status" && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-right cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("valor")}>
                  <div className="flex items-center justify-end gap-1">
                    Valor Líquido
                    {sortField === "valor" && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-right w-36">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredComms.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    Nenhum registro de comissão correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                filteredComms.map((comm) => (
                  <tr 
                    key={comm.id} 
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="p-4 text-gray-600 font-semibold">
                      {comm.data ? new Date(comm.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="p-4 font-bold text-brand-ink">
                      {comm.tecnico_nome}
                    </td>
                    <td className="p-4 text-gray-600">
                      <div className="font-semibold">{comm.cliente_nome || "—"}</div>
                      <div className="text-[10px] text-gray-400">{comm.equipamento_modelo || "—"} | SÉRIE: {comm.equipamento_serie || "—"}</div>
                    </td>
                    <td className="p-4 text-gray-600">
                      <div className="font-semibold">{comm.tipo_os || "—"}</div>
                      <div className="text-[10px] text-gray-400">O.S.: {comm.valor_os?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00"}</div>
                    </td>
                    <td className="p-4 text-gray-600 font-semibold max-w-xs truncate">
                      {comm.descricao}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                        comm.isManual 
                          ? "bg-purple-50 text-purple-700 border-purple-100" 
                          : "bg-blue-50 text-blue-700 border-blue-100"
                      }`}>
                        {comm.isManual ? "MANUAL" : "AUTO"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                        comm.status === "PAGO" 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                          : "bg-amber-50 text-amber-800 border-amber-100"
                      }`}>
                        {comm.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-brand-ink">
                      {comm.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="p-4 text-right space-x-1 flex items-center justify-end">
                      {comm.isManual ? (
                        <>
                          <button
                            onClick={() => openForm(comm as unknown as ComissaoManual)}
                            className="p-1 text-sky-600 hover:bg-sky-50 rounded"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCommission(comm.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => comm.payment_key && handleToggleOSPayment(comm.payment_key)}
                          className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded transition-colors ${
                            comm.status === "PAGO"
                              ? "bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-700 border border-gray-200"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                          }`}
                        >
                          {comm.status === "PAGO" ? "Reverter" : "Pagar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Commission Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-brand-red" />
                  <h3 className="font-display font-extrabold uppercase text-sm tracking-wider">
                    {editingComissao ? "Editar Lançamento Manual" : "Lançar Bonificação Manual"}
                  </h3>
                </div>
                <button onClick={closeForm} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCommission} className="p-6 space-y-4 text-brand-ink">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Técnico Beneficiário *</label>
                  <select
                    required
                    value={formTecnicoId}
                    onChange={(e) => setFormTecnicoId(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                  >
                    <option value="">Selecione o técnico...</option>
                    {tecnicos.map(t => (
                      <option key={t.id} value={t.id}>{t.nome} ({t.apelido})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Data de Competência *</label>
                    <input
                      type="date"
                      required
                      value={formData}
                      onChange={(e) => setFormData(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Valor do Lançamento (R$) *</label>
                    <input
                      type="number"
                      required
                      min={0.01}
                      step={0.01}
                      value={formValor}
                      onChange={(e) => setFormValor(Number(e.target.value))}
                      placeholder="Ex: 250.00"
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Status do Acerto</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "PENDENTE" | "PAGO")}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red font-semibold"
                  >
                    <option value="PENDENTE">Pendente (A pagar)</option>
                    <option value="PAGO">Pago (Quitado)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Descrição / Justificativa *</label>
                  <textarea
                    required
                    value={formDescricao}
                    onChange={(e) => setFormDescricao(e.target.value)}
                    rows={3}
                    placeholder="EX: ADICIONAL DE KM SÁBADO OU PRÊMIO POR META DE REVISÕES ATINGIDA"
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red min-h-[60px]"
                  />
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
                    className="btn bg-brand-red text-white hover:bg-brand-red-dark text-xs py-2 flex items-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Lançamento
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
