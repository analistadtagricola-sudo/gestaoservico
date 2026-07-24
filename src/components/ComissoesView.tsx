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
  ArrowDown,
  Printer,
  ArrowLeft,
  Trophy,
  Target,
  PieChart,
  BarChart2
} from "lucide-react";
import { OrdemServico, Tecnico } from "../types";
import { API } from "../lib/api";

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Print Mode State
  const [printMode, setPrintMode] = useState(false);
  const [printTechId, setPrintTechId] = useState("");
  const [printOverrides, setPrintOverrides] = useState<Record<string, string>>({});
  const [printServiceOverrides, setPrintServiceOverrides] = useState<Record<string, string>>({});

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
  const [paidOSIds, setPaidOSIds] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("gst_comissoes_os_pagas");
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const [comissoesTab, setComissoesTab] = useState<"lancamentos" | "detalhes" | "historico" | "metas" | "config">("lancamentos");
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Sorting State
  const [sortField, setSortField] = useState<string>("data");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Company Configuration State for Branding
  const [companyConfig, setCompanyConfig] = useState<{
    nome?: string;
    subtitulo?: string;
    endereco?: string;
    telefone?: string;
    cnpj?: string;
    email?: string;
    inscricao_estadual?: string;
    logo?: string;
  } | null>(null);

  useEffect(() => {
    // Load manual commission records from localStorage for immediate visual response
    const savedManuais = localStorage.getItem("gst_comissoes_manuais");
    if (savedManuais) {
      setComissoesManuais(JSON.parse(savedManuais));
    }

    // Load company config
    const loadCompanyConfig = () => {
      const savedCompany = localStorage.getItem("gst_company_config_v1");
      if (savedCompany) {
        try {
          setCompanyConfig(JSON.parse(savedCompany));
        } catch (e) {
          // ignore
        }
      }
    };
    loadCompanyConfig();
    window.addEventListener("company_config_updated", loadCompanyConfig);

    // Load all actual commission records from Supabase to prevent loss across sessions
    const syncWithSupabase = async () => {
      try {
        const dbComms = await API.comissoes.listar();
        if (dbComms && dbComms.length > 0) {
          const updatedPaidOSIds: Record<string, boolean> = {};
          const updatedManualComms: ComissaoManual[] = [];

          dbComms.forEach((comm: any) => {
            if (comm.tipo_lancamento === "MANUAL") {
              updatedManualComms.push({
                id: String(comm.id),
                tecnico_id: Number(comm.tecnico_id),
                data: comm.data_comissao,
                valor: Number(comm.valor_comissao),
                descricao: comm.observacao || "",
                status: comm.status
              });
            } else {
              if (comm.os_id) {
                const desc = String(comm.observacao || "");
                if (desc.includes("(Auxiliar)")) {
                  updatedPaidOSIds[`OS-${comm.os_id}-aux`] = comm.status === "PAGO";
                } else {
                  updatedPaidOSIds[`OS-${comm.os_id}-tech`] = comm.status === "PAGO";
                }
              }
            }
          });

          if (updatedManualComms.length > 0) {
            setComissoesManuais(updatedManualComms);
            localStorage.setItem("gst_comissoes_manuais", JSON.stringify(updatedManualComms));
          }

          setPaidOSIds(prev => {
            const merged = { ...prev, ...updatedPaidOSIds };
            localStorage.setItem("gst_comissoes_os_pagas", JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.warn("Erro ao carregar comissoes do banco de dados:", err);
      } finally {
        setIsInitialLoadComplete(true);
      }
    };

    syncWithSupabase();

    return () => window.removeEventListener("company_config_updated", loadCompanyConfig);
  }, []);

  // Automatic synchronization of commissions to Supabase 'comissoes' table (strictly after initial load)
  useEffect(() => {
    if (isInitialLoadComplete && ordens && ordens.length > 0) {
      const allComms = getAllCommissions();
      if (allComms.length > 0) {
        API.comissoes.sincronizar(allComms).catch(err => {
          console.warn("Erro ao sincronizar comissoes com banco de dados:", err);
        });
      }
    }
  }, [isInitialLoadComplete, ordens, comissoesManuais, paidOSIds]);

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
    
    // Load config
    const savedConfig = localStorage.getItem("gst_comissoes_config");
    let config: any = {
      regraPadrao: {
        baseCalculo: "faturamento_total",
        percentualTecnico: 20,
        valorHoraComissao: 50,
        valorKmComissao: 1.50,
        regraAuxiliar: "racha_50_50",
        valorAuxiliar: 0
      },
      regrasAtendimento: []
    };

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.modo_calculo) config.modo_calculo = parsed.modo_calculo;
        if (parsed.status_os) config.status_os = parsed.status_os;
        if (parsed.regraPadrao) {
          config.regraPadrao = {
            ...parsed.regraPadrao,
            baseCalculo: parsed.regraPadrao.baseCalculo
          };
        }
        
        // Handle migration from old format
        if (parsed.regrasEntrega && (!parsed.regrasAtendimento || parsed.regrasAtendimento.length === 0)) {
          config.regrasAtendimento = parsed.regrasEntrega.map((r: any) => ({
            tipo: r.tipo,
            baseCalculo: "fixo",
            valorTecnico: parseFloat(r.valor) || 0,
            regraAuxiliar: "racha_50_50",
            valorAuxiliar: 0
          }));
        } else if (parsed.regrasAtendimento && parsed.regrasAtendimento.length > 0) {
          const mockRuleTypes = [
            "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - PLAINA",
            "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - GRADES",
            "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - INOCULADOR/MONITORAMENTO",
            "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - KUHN (SEM ASSISTENCIA FABRICA)",
            "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - JORGE MAQ. (SEM ASSISTENCIA FABRICA)",
            "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - IMPLEMENTOS TERCEIROS",
            "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - DRONES",
            "MONTAGEM/ENTREGA TÉCNICA - EMPRESA - PLATAFORMA",
            "MANUTENÇÃO CORRETIVA",
            "MANUTENÇÃO PREVENTIVA",
            "GARANTIA"
          ];
          config.regrasAtendimento = parsed.regrasAtendimento
            .filter((r: any) => !mockRuleTypes.some(m => m.toLowerCase().trim() === (r.tipo || "").toLowerCase().trim()))
            .map((r: any) => ({
              ...r,
              baseCalculo: r.baseCalculo
            }));
        } else {
          config.regrasAtendimento = [];
        }
      } catch (e) {
        // ignore
      }
    }

    finalized.forEach(o => {
      const laborValue = Number(o.valor_mao_obra) || 0;
      const displacementValue = Number(o.valor_deslocamento) || 0;
      const totalBaseValue = laborValue + displacementValue;
      const totalOS = Number(o.valor_total) || 0;

      const tech = tecnicos.find(t => t.id === o.tecnico_id);
      
      // Client/Implement details
      const clienteNome = o.clientes?.razao_social || "N/A";
      const equipModelo = o.implementos?.modelo || "N/A";
      const equipSerie = o.implementos?.numero_serie || "N/A";
      const tipoOS = o.tipo_atendimento || "N/A";
      
      const normalizeStr = (str: string) => {
        return (str || "")
          .toLowerCase()
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ");
      };

      const normTipoAtendimento = normalizeStr(o.tipo_atendimento);

      // Find if we have a specific rule matching this Tipo de Atendimento
      let matchedRule = config.regrasAtendimento.find((r: any) => normalizeStr(r.tipo) === normTipoAtendimento);
      if (!matchedRule) {
        // Fallback partial match
        matchedRule = config.regrasAtendimento.find((r: any) => {
          const rNorm = normalizeStr(r.tipo);
          return normTipoAtendimento.includes(rNorm) || rNorm.includes(normTipoAtendimento);
        });
      }

      const defaultRule = {
        tipo: "Padrão (Vendas/Faturado)",
        baseCalculo: config.regraPadrao.baseCalculo || "faturamento_total",
        valorTecnico: Number(config.regraPadrao.percentualTecnico ?? 20),
        valorHoraComissao: Number(config.regraPadrao.valorHoraComissao ?? 50),
        valorKmComissao: Number(config.regraPadrao.valorKmComissao ?? 1.50),
        regraAuxiliar: config.regraPadrao.regraAuxiliar || "racha_50_50",
        valorAuxiliar: Number(config.regraPadrao.valorAuxiliar ?? 0)
      };

      // Helper function to calculate values for a rule
      const calculateForRule = (ruleToUse: any) => {
        let baseValue = 0;
        let baseDesc = "";

        if (o.modo_debito_interno) {
          if (ruleToUse.baseCalculo === "fixo") {
            baseValue = Number(ruleToUse.valorTecnico) || 0;
            baseDesc = "Valor Fixo";
          } else if (ruleToUse.baseCalculo === "horas_e_km_customizado") {
            const customHourRate = Number(ruleToUse.valorHoraComissao ?? 50);
            const customKmRate = Number(ruleToUse.valorKmComissao ?? 1.50);
            const hrs = parseFloat(o.horas_trabalhadas_total || "0") || 0;
            const kms = Number(o.km_rodado_total) || 0;
            const hrsKmCalculated = (hrs * customHourRate) + (kms * customKmRate);

            if (hrsKmCalculated > 0) {
              baseValue = hrsKmCalculated;
              baseDesc = `Horas e KM Reduzidos (R$ ${customHourRate.toFixed(2)}/h e R$ ${customKmRate.toFixed(2)}/km)`;
            } else {
              baseValue = Number(o.valor_referencia_servico) || totalBaseValue || totalOS;
              baseDesc = "Ref. Débito Interno";
            }
          } else {
            baseValue = Number(o.valor_referencia_servico) || totalBaseValue || totalOS;
            baseDesc = "Ref. Débito Interno";
          }
        } else {
          // FATURAMENTO NORMAL PARA CLIENTE (modo_debito_interno === false)
          if (ruleToUse.baseCalculo === "fixo") {
            baseValue = Number(ruleToUse.valorTecnico) || 0;
            baseDesc = "Valor Fixo";
          } else if (ruleToUse.baseCalculo === "faturamento_total") {
            baseValue = totalOS > 0 ? totalOS : (totalBaseValue > 0 ? totalBaseValue : (Number(o.valor_referencia_servico) || 0));
            baseDesc = "Faturamento Total";
          } else {
            // Para O.S. Faturadas para Cliente (sem débito interno), a base utiliza Mão de Obra + Deslocamento
            baseValue = totalBaseValue > 0 ? totalBaseValue : (totalOS > 0 ? totalOS : (Number(o.valor_referencia_servico) || 0));
            baseDesc = "M.O. + Deslocamento";
          }
        }

        let techComm = 0;
        let auxComm = 0;
        let techDesc = "";
        let auxDesc = "";

        // Main tech commission
        if (ruleToUse.baseCalculo === "fixo") {
          const rawAmount = Number(ruleToUse.valorTecnico) || 0;
          if (o.auxiliar_id && ruleToUse.regraAuxiliar === "racha_50_50") {
            techComm = rawAmount / 2;
            techDesc = ` (Racha 50% de R$ ${rawAmount.toFixed(2)} Fixo)`;
          } else {
            techComm = rawAmount;
            techDesc = ` (Fixo R$ ${rawAmount.toFixed(2)})`;
          }
        } else {
          const rate = Number(ruleToUse.valorTecnico) || 0;
          const rawCommission = baseValue * (rate / 100);
          if (o.auxiliar_id && ruleToUse.regraAuxiliar === "racha_50_50") {
            techComm = rawCommission / 2;
            techDesc = ` (Racha 50% de ${rate}% sobre ${baseDesc})`;
          } else {
            techComm = rawCommission;
            techDesc = ` (${rate}% sobre ${baseDesc})`;
          }
        }

        // Auxiliary commission if exists
        if (o.auxiliar_id) {
          if (ruleToUse.regraAuxiliar === "racha_50_50") {
            if (ruleToUse.baseCalculo === "fixo") {
              const rawAmount = Number(ruleToUse.valorTecnico) || 0;
              auxComm = rawAmount / 2;
              auxDesc = ` (Racha 50% de R$ ${rawAmount.toFixed(2)} Fixo)`;
            } else {
              const rate = Number(ruleToUse.valorTecnico) || 0;
              auxComm = (baseValue * (rate / 100)) / 2;
              auxDesc = ` (Racha 50% de ${rate}% sobre ${baseDesc})`;
            }
          } else if (ruleToUse.regraAuxiliar === "valor_customizado") {
            if (ruleToUse.baseCalculo === "fixo") {
              const rawAmount = Number(ruleToUse.valorAuxiliar) || 0;
              auxComm = rawAmount;
              auxDesc = ` (Fixo R$ ${rawAmount.toFixed(2)})`;
            } else {
              const rateAux = Number(ruleToUse.valorAuxiliar) || 0;
              auxComm = baseValue * (rateAux / 100);
              auxDesc = ` (${rateAux}% sobre ${baseDesc})`;
            }
          } else { // "sem_comissao"
            auxComm = 0;
            auxDesc = " (Sem comissão configurada)";
          }
        }

        return { rule: ruleToUse, baseValue, baseDesc, techComm, auxComm, techDesc, auxDesc };
      };

      // Determine calculation result based on modo_calculo
      let calcResult;
      if (config.modo_calculo === "APENAS_PADRAO") {
        calcResult = calculateForRule(defaultRule);
      } else if (config.modo_calculo === "MAIOR_COMISSAO" && matchedRule) {
        const specResult = calculateForRule(matchedRule);
        const defResult = calculateForRule(defaultRule);
        calcResult = defResult.techComm > specResult.techComm ? defResult : specResult;
      } else {
        // REGRA_MAIS_ESPECIFICA (or fallback)
        calcResult = calculateForRule(matchedRule || defaultRule);
      }

      let { rule, baseValue, baseDesc, techComm: techCommission, auxComm: auxCommission, techDesc: techDescSuffix, auxDesc: auxDescSuffix } = calcResult;

      if (o.comissao_custom_opcao === "personalizado") {
        techCommission = o.comissao_custom_valor_tecnico !== undefined ? o.comissao_custom_valor_tecnico : 0;
        auxCommission = o.comissao_custom_valor_auxiliar !== undefined ? o.comissao_custom_valor_auxiliar : 0;
        techDescSuffix = " (Personalizado)";
        auxDescSuffix = " (Personalizado)";
      }

      // Add Main Tech commission
      if (o.tecnico_id && tech) {
        const isPaid = paidOSIds[`OS-${o.id}-tech`] || false;
        commissions.push({
          id: `OS-${o.id}-tech`,
          os_id: o.id,
          numero_os: o.numero_os,
          tecnico_id: o.tecnico_id,
          tecnico_nome: tech.apelido || tech.nome || "Técnico Não Definido",
          data: o.data_termino || o.data_atendimento || o.created_at || "",
          valor_os: totalOS,
          valor_mao_obra: laborValue,
          valor_comissao: techCommission,
          status: isPaid ? "PAGO" : "PENDENTE" as "PAGO" | "PENDENTE",
          descricao: `Comissão O.S. ${o.numero_os} (Técnico)${techDescSuffix}`,
          cliente_nome: clienteNome,
          equipamento_modelo: equipModelo,
          equipamento_serie: equipSerie,
          tipo_os: tipoOS,
          modo_debito_interno: o.modo_debito_interno,
          valor_referencia_servico: o.valor_referencia_servico
        });
      }

      // Add Auxiliary Tech commission if exists
      if (o.auxiliar_id) {
        const aux = tecnicos.find(t => t.id === o.auxiliar_id);
        if (aux) {
          const isPaid = paidOSIds[`OS-${o.id}-aux`] || false;
          commissions.push({
            id: `OS-${o.id}-aux`,
            os_id: o.id,
            numero_os: o.numero_os,
            tecnico_id: o.auxiliar_id,
            tecnico_nome: aux.apelido || aux.nome || "Auxiliar Não Definido",
            data: o.data_termino || o.data_atendimento || o.created_at || "",
            valor_os: totalOS,
            valor_mao_obra: laborValue,
            valor_comissao: auxCommission,
            status: isPaid ? "PAGO" : "PENDENTE" as "PAGO" | "PENDENTE",
            descricao: `Comissão O.S. ${o.numero_os} (Auxiliar)${auxDescSuffix}`,
            cliente_nome: clienteNome,
            equipamento_modelo: equipModelo,
            equipamento_serie: equipSerie,
            tipo_os: tipoOS,
            modo_debito_interno: o.modo_debito_interno,
            valor_referencia_servico: o.valor_referencia_servico
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
      numero_os: ac.numero_os || "—",
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
      valor_os: ac.valor_os,
      modo_debito_interno: (ac as any).modo_debito_interno,
      valor_referencia_servico: (ac as any).valor_referencia_servico
    }));

    const manualComms = comissoesManuais.map(mc => {
      const tech = tecnicos.find(t => t.id === mc.tecnico_id);
      return {
        id: mc.id,
        tecnico_id: mc.tecnico_id,
        tecnico_nome: tech?.apelido || tech?.nome || "Técnico Não Definido",
        numero_os: "—",
        data: mc.data,
        valor: mc.valor,
        descricao: mc.descricao,
        status: mc.status,
        isManual: true,
        os_id: undefined,
        payment_key: mc.id,
        cliente_nome: "Lançamento Manual",
        equipamento_modelo: "—",
        equipamento_serie: "—",
        tipo_os: "Lançamento Manual",
        valor_os: 0,
        modo_debito_interno: false,
        valor_referencia_servico: 0
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

      // Date range filter
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && c.data >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && c.data <= endDate;
      }

      return matchesSearch && matchesTech && matchesStatus && matchesDate;
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
    const isNowPaid = !paidOSIds[paymentKey];
    const updated = { ...paidOSIds, [paymentKey]: isNowPaid };
    setPaidOSIds(updated);
    localStorage.setItem("gst_comissoes_os_pagas", JSON.stringify(updated));

    // Find the technician ID from the payment key to target precisely in Supabase
    const all = getAllCommissions();
    const commItem = all.find(c => c.payment_key === paymentKey);
    const tecnicoId = commItem?.tecnico_id;

    // Sync status change to Supabase
    API.comissoes.atualizarStatus(paymentKey, isNowPaid ? "PAGO" : "PENDENTE", tecnicoId).catch(e => {
      console.warn("Erro ao atualizar status de comissao no Supabase:", e);
    });

    showToast(isNowPaid ? "Comissão marcada como PAGA!" : "Comissão estornada para PENDENTE.");
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

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTecnicoId || formValor <= 0 || !formDescricao.trim()) {
      showToast("Preencha todos os campos corretamente.", "error");
      return;
    }

    const techObj = tecnicos.find(t => String(t.id) === String(formTecnicoId));

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

    // Save to Supabase 'comissoes' table
    try {
      await API.comissoes.salvar({
        isManual: true,
        tecnico_id: payload.tecnico_id,
        tecnico_nome: techObj?.apelido || techObj?.nome || "Técnico",
        data: payload.data,
        valor: payload.valor,
        descricao: payload.descricao,
        status: payload.status
      });
    } catch (err) {
      console.warn("Erro ao salvar comissao no Supabase:", err);
    }

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

  // Helper for Tipo de O.S. classification
  const getTipoOSLabel = (tipoAtendimento: string, descricao: string) => {
    const lower = (tipoAtendimento || "").toLowerCase();
    const descLower = (descricao || "").toLowerCase();
    if (lower.includes("garantia") || descLower.includes("garantia")) return "GARANTIA";
    if (lower.includes("retrabalho") || descLower.includes("retrabalho")) return "RETRABALHO";
    if (
      lower.includes("entrega") || 
      lower.includes("montagem") || 
      lower.includes("treinamento") || 
      lower.includes("empresa") || 
      lower.includes("interno") || 
      lower.includes("debito")
    ) {
      return "DEBITO INTERNO";
    }
    return "VENDA";
  };

  if (printMode) {
    const selectedPrintTechObj = tecnicos.find(t => String(t.id) === printTechId);
    
    // Filter commissions for this technician in print mode
    const printComms = getAllCommissions().filter(c => {
      const matchesTech = String(c.tecnico_id) === printTechId;
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && c.data >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && c.data <= endDate;
      }
      return matchesTech && matchesDate;
    }).sort((a, b) => a.data.localeCompare(b.data)); // ascending chronological order

    const totalPrintComissao = printComms.reduce((sum, c) => sum + c.valor, 0);

    const getPeriodLabel = () => {
      if (startDate && endDate) {
        const dStart = new Date(startDate + "T12:00:00").toLocaleDateString("pt-BR");
        const dEnd = new Date(endDate + "T12:00:00").toLocaleDateString("pt-BR");
        return `FECHAMENTO PERÍODO (${dStart} À ${dEnd})`;
      }
      if (printComms.length > 0) {
        const dates = printComms.map(c => c.data).filter(Boolean);
        if (dates.length > 0) {
          const minDateStr = dates.reduce((min, d) => d < min ? d : min, dates[0]);
          const maxDateStr = dates.reduce((max, d) => d > max ? d : max, dates[0]);
          const dStart = new Date(minDateStr + "T12:00:00").toLocaleDateString("pt-BR");
          const dEnd = new Date(maxDateStr + "T12:00:00").toLocaleDateString("pt-BR");
          return `FECHAMENTO PERÍODO (${dStart} À ${dEnd})`;
        }
      }
      return "FECHAMENTO DE PERÍODO";
    };

    return (
      <div className="bg-white min-h-screen text-black p-4 sm:p-8 font-sans printable-area">
        {/* Navigation & Controls Row (Hidden when printing) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 border border-gray-200 p-4 rounded-xl mb-8 print:hidden shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setPrintMode(false)}
              className="py-1.5 px-3 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg font-bold text-xs flex items-center gap-1.5 text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Técnico:</span>
              <select
                value={printTechId}
                onChange={(e) => setPrintTechId(e.target.value)}
                className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs bg-white text-gray-800 font-bold focus:outline-none focus:border-brand-red"
              >
                <option value="">Selecione o Técnico...</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} ({t.apelido})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1 max-w-xs leading-tight">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              Você pode alterar o "Tipo de O.S." e editar "Serviços" direto na tabela antes de imprimir.
            </span>
            <button
              onClick={() => setTimeout(() => window.print(), 200)}
              disabled={!printTechId}
              className="py-1.5 px-4 bg-brand-red text-white hover:bg-brand-red-dark disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" /> Imprimir Relatório
            </button>
          </div>
        </div>

        {printTechId ? (
          <div className="max-w-[1000px] mx-auto bg-white border border-gray-200 print:border-none p-6 sm:p-10 rounded-xl print:p-0">
            {/* Branded Company Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
              <div className="space-y-1 text-left">
                <h1 className="font-sans font-black text-lg tracking-tight text-gray-900 leading-none">
                  {companyConfig?.nome || "Configuração de Empresa Não Definida"}
                </h1>
                {companyConfig?.subtitulo && (
                  <p className="text-[9px] font-bold text-brand-red uppercase tracking-wide">
                    {companyConfig.subtitulo}
                  </p>
                )}
                <p className="text-[10px] text-gray-500 leading-normal">
                  {companyConfig?.endereco || "Endereço não configurado"}<br />
                  {companyConfig?.cnpj ? `CNPJ: ${companyConfig.cnpj}` : ""} {companyConfig?.inscricao_estadual ? ` - Insc. Estadual: ${companyConfig.inscricao_estadual}` : ""}<br />
                  {companyConfig?.telefone ? `Fone: ${companyConfig.telefone}` : ""} {companyConfig?.email ? ` - ${companyConfig.email}` : ""}
                </p>
              </div>

              {/* Dynamic Styled Red/Orange Brand Logo & Kuhn Emblem or uploaded logo */}
              <div className="flex items-center gap-4 self-center sm:self-auto">
                {companyConfig?.logo ? (
                  <img 
                    src={companyConfig.logo} 
                    alt="Logo da Empresa" 
                    className="max-h-12 max-w-[200px] object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
              </div>
            </div>

            {/* Horizontal divider bar */}
            <div className="border-t-2 border-black mb-6" />

            {/* Technician and Commission Card Summary Grid */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-6">
              {/* Technician Box */}
              <div className="border-2 border-black p-4 min-w-[280px] sm:min-w-[340px] text-center bg-white rounded-sm">
                <span className="block text-[8px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Técnico Colaborador</span>
                <span className="font-sans font-extrabold text-base sm:text-lg tracking-wide uppercase text-black">
                  {selectedPrintTechObj ? selectedPrintTechObj.nome : "—"}
                </span>
              </div>

              {/* Summary Totals Table */}
              <div className="w-full sm:w-auto">
                <table className="border-collapse font-sans font-bold text-xs min-w-[200px]">
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 bg-gray-50 px-4 py-2 text-left text-[9px] uppercase tracking-wider text-gray-500 font-extrabold w-28">
                        Comissão
                      </td>
                      <td className="border border-gray-300 px-5 py-2 text-right font-mono text-sm text-black" style={{ backgroundColor: "#e2f0d9" }}>
                        {totalPrintComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 bg-gray-50 px-4 py-2 text-left text-[9px] uppercase tracking-wider text-gray-500 font-extrabold w-28">
                        Total
                      </td>
                      <td className="border border-gray-300 px-5 py-2 text-right font-mono text-sm text-black font-extrabold" style={{ backgroundColor: "#e2f0d9" }}>
                        {totalPrintComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Period Center Banner */}
            <div className="bg-gray-100 text-center py-2.5 border-t border-b border-black font-sans font-black text-xs sm:text-sm uppercase tracking-widest mb-6 text-black">
              {getPeriodLabel()}
            </div>

            {/* Print Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-gray-300 text-[10px]">
                <thead>
                  <tr className="border-b-2 border-black bg-gray-50 font-bold text-black uppercase tracking-wider text-[9px]">
                    <th className="p-2 border border-gray-300 text-center w-20">Data</th>
                    <th className="p-2 border border-gray-300 text-center w-14">O.S.</th>
                    <th className="p-2 border border-gray-300 text-left">Cliente</th>
                    <th className="p-2 border border-gray-300 text-left min-w-[200px]">Serviços</th>
                    <th className="p-2 border border-gray-300 text-left w-40">Tipo de O.S.</th>
                    <th className="p-2 border border-gray-300 text-right w-28">Valor do Serviço</th>
                    <th className="p-2 border border-gray-300 text-right w-24">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 font-medium">
                  {printComms.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                        Nenhuma comissão registrada para este período.
                      </td>
                    </tr>
                  ) : (
                    printComms.map((comm) => {
                      const defaultTipoOS = getTipoOSLabel(comm.tipo_os || "", comm.descricao || "");
                      const currentTipoOS = printOverrides[comm.id] !== undefined ? printOverrides[comm.id] : defaultTipoOS;
                      
                      const defaultServico = comm.tipo_os || comm.descricao || "Serviço/Manutenção";
                      const currentServico = printServiceOverrides[comm.id] !== undefined ? printServiceOverrides[comm.id] : defaultServico;

                      const isFixedRate = (comm.tipo_os || "").toLowerCase().includes("entrega") || (comm.tipo_os || "").toLowerCase().includes("montagem");
                      const serviceValFormatted = isFixedRate ? "—" : (comm.valor_os ? comm.valor_os.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");

                      return (
                        <tr key={comm.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-2 border border-gray-300 text-center font-mono">
                            {comm.data ? new Date(comm.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="p-2 border border-gray-300 text-center font-mono font-bold">
                            {comm.numero_os}
                          </td>
                          <td className="p-2 border border-gray-300 uppercase text-gray-800 font-semibold max-w-[200px] truncate">
                            {comm.cliente_nome || "—"}
                          </td>
                          <td className="p-2 border border-gray-300">
                            <input
                              type="text"
                              value={currentServico}
                              onChange={(e) => setPrintServiceOverrides(prev => ({ ...prev, [comm.id]: e.target.value }))}
                              className="print:hidden w-full border border-gray-200 hover:border-gray-400 rounded px-1 py-0.5 bg-transparent focus:bg-white text-[10px]"
                            />
                            <span className="hidden print:inline">{currentServico}</span>
                          </td>
                          <td className="p-2 border border-gray-300 font-bold">
                            <select
                              value={currentTipoOS}
                              onChange={(e) => setPrintOverrides(prev => ({ ...prev, [comm.id]: e.target.value }))}
                              className="print:hidden w-full border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-800 text-[10px] font-bold"
                            >
                              <option value="VENDA">VENDA</option>
                              <option value="DEBITO INTERNO">DEBITO INTERNO</option>
                              <option value="GARANTIA">GARANTIA</option>
                              <option value="RETRABALHO">RETRABALHO</option>
                            </select>
                            <span className="hidden print:inline">{currentTipoOS}</span>
                          </td>
                          <td className="p-2 border border-gray-300 text-right font-mono">
                            {serviceValFormatted}
                          </td>
                          <td className="p-2 border border-gray-300 text-right font-mono font-bold text-black">
                            {comm.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Print Footer / Signature blocks */}
            <div className="mt-16 grid grid-cols-2 gap-12 text-center text-[10px] uppercase font-bold tracking-wide">
              <div>
                <div className="border-t border-black w-48 mx-auto mb-1"></div>
                <span>Assinatura do Técnico</span>
              </div>
              <div>
                <div className="border-t border-black w-48 mx-auto mb-1"></div>
                <span>{companyConfig?.nome || "Assinatura da Empresa"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-gray-50 border border-dashed border-gray-300 rounded-2xl max-w-lg mx-auto text-center">
            <User className="w-12 h-12 text-gray-400 mb-3" />
            <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Selecione um Técnico</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              Por favor, selecione o técnico colaborador no seletor acima para carregar o relatório de fechamento de comissões.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Dynamic calculations for dashboard - 100% REAL AND INTERACTIVE!
  const getComissaoDoMes = () => {
    const all = getAllCommissions();
    const currentMonthStr = "2026-07"; // default current month according to session time (July 2026)
    // Calculate the real sum for the current month
    const sum = all
      .filter(c => c.data && c.data.startsWith(currentMonthStr))
      .reduce((sum, c) => sum + c.valor, 0);
    return sum;
  };

  const comissaoDoMes = getComissaoDoMes();

  const getTecnicoDestaque = () => {
    const techSums: Record<string, number> = {};
    filteredComms.forEach(c => {
      techSums[c.tecnico_nome] = (techSums[c.tecnico_nome] || 0) + c.valor;
    });
    
    let topTech = "";
    let topVal = 0;
    
    Object.entries(techSums).forEach(([name, val]) => {
      if (val > topVal) {
        topVal = val;
        topTech = name;
      }
    });

    if (!topTech) {
      return { nome: "Nenhum no Período", valor: 0 };
    }
    return { nome: topTech, valor: topVal };
  };

  const tecnicoDestaque = getTecnicoDestaque();

  // Monthly aggregated data for selected year
  const monthlyData = [
    { month: "Jan", key: "01", valor: 0 },
    { month: "Fev", key: "02", valor: 0 },
    { month: "Mar", key: "03", valor: 0 },
    { month: "Abr", key: "04", valor: 0 },
    { month: "Mai", key: "05", valor: 0 },
    { month: "Jun", key: "06", valor: 0 },
    { month: "Jul", key: "07", valor: 0 },
    { month: "Ago", key: "08", valor: 0 },
    { month: "Set", key: "09", valor: 0 },
    { month: "Out", key: "10", valor: 0 },
    { month: "Nov", key: "11", valor: 0 },
    { month: "Dez", key: "12", valor: 0 },
  ];

  // We filter the monthly trend chart using search and tech criteria to make it interactive, 
  // but we omit the specific date filter so that they can see the whole 12-month historical trend!
  const commsForTrendChart = getAllCommissions().filter(c => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = c.tecnico_nome.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q);
    const matchesTech = selectedTechFilter === "" || String(c.tecnico_id) === selectedTechFilter;
    const matchesStatus = selectedStatusFilter === "TODAS" || c.status === selectedStatusFilter;
    return matchesSearch && matchesTech && matchesStatus;
  });

  monthlyData.forEach(item => {
    const sum = commsForTrendChart
      .filter(c => c.data && c.data.startsWith(`${selectedYear}-${item.key}`))
      .reduce((s, c) => s + c.valor, 0);
    item.valor = sum;
  });

  const chartMonthlyData = monthlyData;

  // Technician ranking data - 100% real based on active filters (excluding tech filter itself so comparisons stay useful)
  const commsForRanking = getAllCommissions().filter(c => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = c.tecnico_nome.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q);
    const matchesStatus = selectedStatusFilter === "TODAS" || c.status === selectedStatusFilter;
    let matchesDate = true;
    if (startDate) matchesDate = matchesDate && c.data >= startDate;
    if (endDate) matchesDate = matchesDate && c.data <= endDate;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const techMap: Record<number, { name: string; valor: number }> = {};
  commsForRanking.forEach(c => {
    if (!techMap[c.tecnico_id]) {
      techMap[c.tecnico_id] = { name: c.tecnico_nome, valor: 0 };
    }
    techMap[c.tecnico_id].valor += c.valor;
  });

  const finalRanking = Object.entries(techMap)
    .map(([id, item]) => ({ id: Number(id), name: item.name, valor: item.valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  // Donut chart status calculations - 100% real based on active filters!
  const donutPendente = totalPendente;
  const donutPago = totalPago;
  const donutTotal = donutPendente + donutPago;

  const pctPendente = donutTotal > 0 ? (donutPendente / donutTotal) * 100 : 0;
  const pctPago = donutTotal > 0 ? (donutPago / donutTotal) * 100 : 0;

  // SVG Circle stroke dash values
  const circ = 251.3;
  const strokeDashPendente = (pctPendente / 100) * circ;
  const strokeDashPago = (pctPago / 100) * circ;

  return (
    <div className="space-y-6 text-xs">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <div className="fixed inset-x-0 bottom-8 md:left-64 z-[100] flex justify-center pointer-events-none px-4">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`pointer-events-auto px-6 py-3 rounded-lg shadow-2xl text-white font-semibold text-sm flex items-center gap-2.5 ${
                toastMessage.type === "success" ? "bg-emerald-600" : toastMessage.type === "error" ? "bg-rose-600" : "bg-blue-600"
              }`}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{toastMessage.text}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header and top controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase text-brand-ink">
            Comissões e Resultados
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Painel consolidado de resultados, acompanhamento técnico e lançamentos de comissões por serviços.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setPrintTechId(selectedTechFilter || (tecnicos[0]?.id ? String(tecnicos[0].id) : ""));
              setPrintMode(true);
            }}
            className="btn bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm flex items-center gap-1.5 py-2 px-4 rounded-xl font-bold"
            title="Visualizar e imprimir relatório de fechamento"
          >
            <Printer className="w-4 h-4" />
            Imprimir Fechamento
          </button>

          <button
            onClick={() => openForm(null)}
            className="btn bg-brand-red text-white hover:bg-brand-red-dark border-none shadow-sm flex items-center gap-1.5 py-2 px-4 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Lançar Comissão Manual
          </button>
        </div>
      </div>

      {/* 5-Column Dashboard KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Pendente */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Pendente</span>
              <h2 className="text-xl font-extrabold font-display text-brand-ink mt-2">
                {totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h2>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase">Aguardando acerto de contas</p>
        </div>

        {/* Total Pago */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Pago</span>
              <h2 className="text-xl font-extrabold font-display text-brand-ink mt-2">
                {totalPago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h2>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase">Comissões quitadas e liquidadas</p>
        </div>

        {/* Total Acumulado */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-sky-600" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Acumulado</span>
              <h2 className="text-xl font-extrabold font-display text-brand-ink mt-2">
                {totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h2>
            </div>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase">Volume operacional histórico</p>
        </div>

        {/* Comissão do Mês */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Comissão do Mês</span>
              <h2 className="text-xl font-extrabold font-display text-brand-ink mt-2">
                {comissaoDoMes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h2>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase">Total previsto para pagamento</p>
        </div>

        {/* Técnico Destaque */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-yellow-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Técnico Destaque</span>
              <h2 className="text-lg font-black font-display text-brand-ink mt-2 truncate w-full">
                {tecnicoDestaque.nome}
              </h2>
              <span className="text-[11px] font-bold text-brand-red font-mono mt-0.5 block">
                {tecnicoDestaque.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase">Líder de produção no período</p>
        </div>
      </div>

      {/* Dash de Resultados: Graficos do modulo de comissao */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Comissões por Mês Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm lg:col-span-5 flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-display font-extrabold text-sm uppercase text-brand-ink flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                Comissões por Mês
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Análise de evolução mensal</p>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-200 rounded px-2 py-0.5 text-[10px] bg-white font-bold text-gray-700"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          {/* SVG Vertical Columns Chart */}
          <div className="pt-6 pb-2 flex-1 flex items-end justify-between gap-2.5 h-44">
            {chartMonthlyData.map((d) => {
              const maxMonthVal = Math.max(...chartMonthlyData.map((item) => item.valor), 1);
              const heightPct = Math.max(5, (d.valor / maxMonthVal) * 100);
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full mb-1 bg-gray-900 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                    {d.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                  </div>
                  
                  {/* Compact value indicator */}
                  <span className="text-[8px] font-bold text-gray-500 mb-1 leading-none">
                    {d.valor > 0 ? `${(d.valor / 1000).toFixed(0)}k` : "—"}
                  </span>

                  {/* Column Bar */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`w-full rounded-t-sm transition-all duration-200 cursor-pointer ${
                      d.month === "Jul" ? "bg-brand-red group-hover:bg-brand-red-dark" : "bg-blue-600 group-hover:bg-blue-700"
                    }`}
                  />

                  {/* Month Label */}
                  <span className="text-[9px] font-bold text-gray-400 uppercase mt-2.5">{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking de Técnicos (Mês) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-display font-extrabold text-sm uppercase text-brand-ink flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-emerald-600" />
                  Ranking de Técnicos
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Distribuição de comissões acumuladas</p>
              </div>
            </div>

            <div className="space-y-3.5 pt-4">
              {finalRanking.map((r, idx) => {
                const maxRankVal = Math.max(...finalRanking.map((item) => item.valor), 1);
                const pct = (r.valor / maxRankVal) * 100;
                return (
                  <div key={r.id || idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white ${
                          idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-amber-600" : "bg-blue-600"
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-gray-700">{r.name}</span>
                      </div>
                      <span className="font-mono font-bold text-gray-900">
                        {r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                        className="bg-emerald-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status das Comissões Pie/Donut Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm lg:col-span-3 flex flex-col justify-between">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-display font-extrabold text-sm uppercase text-brand-ink flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-orange-500" />
              Status das Comissões
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Percentual de quitação</p>
          </div>

          <div className="flex flex-col items-center justify-center pt-4 pb-2">
            {/* SVG Donut */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth="10"
                />
                {/* Pagas Arc (Green) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeDasharray={`${strokeDashPago} ${circ - strokeDashPago}`}
                  strokeLinecap="round"
                />
                {/* Pendentes Arc (Orange) - offset to sit next to green */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="10"
                  strokeDasharray={`${strokeDashPendente} ${circ - strokeDashPendente}`}
                  strokeDashoffset={-strokeDashPago}
                  strokeLinecap="round"
                />
              </svg>
              {/* Center text */}
              <div className="absolute text-center">
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block leading-none">Total</span>
                <span className="text-[10px] font-black font-mono text-brand-ink mt-0.5 block leading-none">
                  {donutTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* Legend underneath */}
            <div className="mt-4 w-full space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0"></span>
                  <span className="text-gray-500 font-bold">Pagas</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-800">{pctPago.toFixed(0)}%</span>
                  <span className="text-gray-400 font-medium ml-1">({donutPago.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })})</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full shrink-0"></span>
                  <span className="text-gray-500 font-bold">Pendentes</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-800">{pctPendente.toFixed(0)}%</span>
                  <span className="text-gray-400 font-medium ml-1">({donutPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styled Horizontal Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
        <button
          onClick={() => setComissoesTab("lancamentos")}
          className={`flex-1 text-center py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all ${
            comissoesTab === "lancamentos" ? "bg-white text-brand-ink shadow-sm font-extrabold" : "text-gray-500 hover:text-brand-ink"
          }`}
        >
          Lançamentos
        </button>
        <button
          onClick={() => setComissoesTab("detalhes")}
          className={`flex-1 text-center py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all ${
            comissoesTab === "detalhes" ? "bg-white text-brand-ink shadow-sm font-extrabold" : "text-gray-500 hover:text-brand-ink"
          }`}
        >
          Detalhes da Comissão
        </button>
        <button
          onClick={() => setComissoesTab("historico")}
          className={`flex-1 text-center py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all ${
            comissoesTab === "historico" ? "bg-white text-brand-ink shadow-sm font-extrabold" : "text-gray-500 hover:text-brand-ink"
          }`}
        >
          Histórico de Pagamentos
        </button>
        <button
          onClick={() => setComissoesTab("metas")}
          className={`flex-1 text-center py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all ${
            comissoesTab === "metas" ? "bg-white text-brand-ink shadow-sm font-extrabold" : "text-gray-500 hover:text-brand-ink"
          }`}
        >
          Metas
        </button>
        <button
          onClick={() => setComissoesTab("config")}
          className={`flex-1 text-center py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all ${
            comissoesTab === "config" ? "bg-white text-brand-ink shadow-sm font-extrabold" : "text-gray-500 hover:text-brand-ink"
          }`}
        >
          Configurações
        </button>
      </div>

      {/* Grid Filters and Active Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Render Toolbar if tab is lancamentos, detalhes, or historico */}
        {(comissoesTab === "lancamentos" || comissoesTab === "historico" || comissoesTab === "detalhes") && (
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">De:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white text-gray-600 font-semibold focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Até:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white text-gray-600 font-semibold focus:outline-none"
                />
              </div>

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

              {comissoesTab !== "historico" && (
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-600 font-semibold"
                >
                  <option value="TODAS">Ver Todos Status</option>
                  <option value="PENDENTE">Apenas Pendentes</option>
                  <option value="PAGO">Apenas Pagos</option>
                </select>
              )}

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
        )}

        {/* TAB 1: LANÇAMENTOS */}
        {comissoesTab === "lancamentos" && (
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
                  <th className="p-4 text-right w-36 font-bold">Ações</th>
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
                        <div className="text-[10px] text-gray-400">
                          {comm.modo_debito_interno ? (
                            <span className="text-amber-600 font-extrabold uppercase bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                              Déb. Interno (Ref: {comm.valor_referencia_servico?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
                            </span>
                          ) : (
                            `O.S.: ${comm.valor_os?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00"}`
                          )}
                        </div>
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
                            className={`px-2.5 py-1 text-[10px] font-black uppercase rounded transition-all flex items-center justify-center gap-1 group relative overflow-hidden ${
                              comm.status === "PAGO"
                                ? "bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700 border border-emerald-200 hover:border-rose-200"
                                : "bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                            }`}
                          >
                            {comm.status === "PAGO" ? (
                              <>
                                <span className="group-hover:hidden flex items-center gap-1 font-extrabold text-emerald-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Pago
                                </span>
                                <span className="hidden group-hover:inline font-black text-rose-700">
                                  Reverter
                                </span>
                              </>
                            ) : (
                              "Pagar"
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: DETALHES DA COMISSÃO */}
        {comissoesTab === "detalhes" && (
          <div className="p-5 space-y-6">
            <h4 className="text-sm font-extrabold uppercase text-brand-ink border-b pb-2">Extrato Detalhado por Colaborador</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tecnicos.map(t => {
                const tComms = filteredComms.filter(c => c.tecnico_id === t.id);
                const tPendente = tComms.filter(c => c.status === "PENDENTE").reduce((s, c) => s + c.valor, 0);
                const tPago = tComms.filter(c => c.status === "PAGO").reduce((s, c) => s + c.valor, 0);
                const tTotal = tPendente + tPago;
                return (
                  <div key={t.id} className="border border-gray-200 rounded-xl p-4 space-y-3 hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-center">
                      <strong className="text-gray-800 text-sm font-black">{t.nome} ({t.apelido})</strong>
                      <span className="text-[10px] bg-gray-100 text-gray-500 py-0.5 px-2 rounded-full font-bold uppercase">{t.cargo || "Técnico"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <div>
                        <span className="text-gray-400 font-bold uppercase block">Pendente</span>
                        <strong className="text-amber-600 font-mono text-xs block mt-1">{tPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold uppercase block">Pago</span>
                        <strong className="text-emerald-600 font-mono text-xs block mt-1">{tPago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold uppercase block">Acumulado</span>
                        <strong className="text-brand-ink font-mono text-xs block mt-1">{tTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1">
                      <span>Total de lançamentos: <strong>{tComms.length}</strong></span>
                      <button
                        onClick={() => {
                          setSelectedTechFilter(String(t.id));
                          setComissoesTab("lancamentos");
                        }}
                        className="text-blue-600 hover:underline font-bold"
                      >
                        Ver lançamentos &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: HISTÓRICO DE PAGAMENTOS */}
        {comissoesTab === "historico" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-4 w-28">Data</th>
                  <th className="p-4">Técnico Beneficiário</th>
                  <th className="p-4">Cliente / Equipamento</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Valor Pago</th>
                  <th className="p-4 text-right w-36 font-bold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredComms.filter(c => c.status === "PAGO").length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      Nenhum histórico de pagamento quitado para este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredComms.filter(c => c.status === "PAGO").map((comm) => (
                    <tr key={comm.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-gray-600 font-semibold">
                        {comm.data ? new Date(comm.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="p-4 font-bold text-brand-ink">{comm.tecnico_nome}</td>
                      <td className="p-4 text-gray-600">
                        <div className="font-semibold">{comm.cliente_nome || "—"}</div>
                        <div className="text-[10px] text-gray-400">{comm.equipamento_modelo}</div>
                      </td>
                      <td className="p-4 text-gray-600 font-semibold max-w-xs truncate">{comm.descricao}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border bg-blue-50 text-blue-700 border-blue-100">
                          {comm.isManual ? "MANUAL" : "AUTO"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold border bg-emerald-50 text-emerald-800 border-emerald-100">
                          {comm.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-600">
                        {comm.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="p-4 text-right flex items-center justify-end">
                        {comm.isManual ? (
                          <span className="text-gray-400 text-[10px] font-bold">Manual</span>
                        ) : (
                          <button
                            onClick={() => comm.payment_key && handleToggleOSPayment(comm.payment_key)}
                            className="px-2.5 py-1 text-[10px] font-black uppercase rounded bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700 border border-emerald-200 hover:border-rose-200 transition-all flex items-center justify-center gap-1 group"
                          >
                            <span className="group-hover:hidden flex items-center gap-1 font-extrabold text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Pago
                            </span>
                            <span className="hidden group-hover:inline font-black text-rose-700">
                              Reverter
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: METAS */}
        {comissoesTab === "metas" && (
          <div className="p-5 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h4 className="text-sm font-extrabold uppercase text-brand-ink">Acompanhamento de Metas de Produtividade</h4>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 py-1 px-2.5 rounded font-black uppercase">Meta do Período: R$ 5.000,00</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tecnicos.map(t => {
                const tComms = filteredComms.filter(c => c.tecnico_id === t.id);
                const totalComm = tComms.reduce((s, c) => s + c.valor, 0);
                const targetVal = 5000.00;
                const pct = Math.min(100, (totalComm / targetVal) * 100);
                return (
                  <div key={t.id} className="border border-gray-200 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-gray-800 text-sm font-black">{t.nome}</strong>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Técnico Beneficiário</span>
                      </div>
                      <span className="text-[12px] font-black font-mono text-brand-ink">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    {/* Visual bar */}
                    <div className="space-y-1.5">
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6 }}
                          className={`h-full rounded-full ${
                            pct >= 100 ? "bg-emerald-500" : pct >= 75 ? "bg-indigo-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                        <span>Realizado: {totalComm.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        <span>Meta: {targetVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: CONFIGURAÇÕES */}
        {comissoesTab === "config" && (
          <div className="p-6 space-y-6">
            <div className="border-b border-gray-100 pb-2">
              <h4 className="text-sm font-extrabold uppercase text-brand-ink">Políticas e Regras de Pagamento Ativas</h4>
              <p className="text-gray-500 text-xs mt-0.5">Visão geral das regras e bases de cálculo para geração automática de tarifas.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
                <h5 className="font-extrabold text-xs text-brand-ink uppercase flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-brand-red animate-pulse" />
                  Regra Geral de Vendas / Faturado
                </h5>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>&bull; Base de Cálculo: <strong className="text-gray-800">Faturamento M.O. + Deslocamento</strong></p>
                  <p>&bull; Percentual Técnico Titular: <strong className="text-gray-800">20%</strong> sobre a base de cálculo</p>
                  <p>&bull; Racha Auxiliar: <strong className="text-gray-800">Racha de 50/50</strong> se houver auxiliar escalado</p>
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
                <h5 className="font-extrabold text-xs text-brand-ink uppercase flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-indigo-600" />
                  Garantias, Retrabalhos e Débito Interno
                </h5>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>&bull; Garantias / Retrabalhos: <strong className="text-gray-800">Sem comissão para o Técnico</strong> (cobertura operacional)</p>
                  <p>&bull; Débito Interno (Kuhn/Entrega): <strong className="text-gray-800">Valor Fixo ou Horas + KM</strong></p>
                  <p>&bull; Tarifa de Hora Técnica Kuhn: <strong className="text-gray-800">R$ 50,00/h</strong> de viagem/serviço</p>
                  <p>&bull; Deslocamento KM Interno: <strong className="text-gray-800">R$ 1,50/km</strong> rodado</p>
                </div>
              </div>
            </div>
          </div>
        )}
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
