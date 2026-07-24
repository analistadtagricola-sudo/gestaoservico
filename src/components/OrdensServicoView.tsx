/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  PlusCircle, 
  Search, 
  RefreshCw, 
  Edit, 
  Pencil,
  Trash2, 
  X, 
  Save, 
  ChevronLeft, 
  ChevronRight,
  ClipboardList,
  User,
  Tractor,
  Calendar,
  Clock,
  Wrench,
  FileSpreadsheet,
  AlertTriangle,
  FileText,
  DollarSign,
  Coins,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Trash,
  Printer,
  Upload,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  MessageCircle
} from "lucide-react";
import { OrdemServico, Cliente, Implemento, Tecnico, Apontamento, Veiculo, TipoAtendimento } from "../types";
import { API } from "../lib/api";
import { formatOSNotificationText } from "../lib/googleAuth";
import { useUser } from "../lib/UserContext";
import { addAuditLog } from "../lib/auditLogger";

interface OrdensServicoViewProps {
  ordens: OrdemServico[];
  clientes: Cliente[];
  implementos: Implemento[];
  tecnicos: Tecnico[];
  onRefresh: () => Promise<void>;
  preSelectedOSId?: number | null;
  preSelectedStatus?: string | null;
  onClearPreSelectedOS?: () => void;
}

type OSTabType = "dados" | "atendimento" | "apontamentos" | "pecas" | "despesas" | "encerramento";

interface PecaItem {
  id: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  xml_imported?: boolean;
}

export const OrdensServicoView: React.FC<OrdensServicoViewProps> = ({
  ordens,
  clientes,
  implementos,
  tecnicos,
  onRefresh,
  preSelectedOSId,
  preSelectedStatus,
  onClearPreSelectedOS
}) => {
  const { currentUser } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("TODAS");
  const [selectedTech, setSelectedTech] = useState("");
  
  // View mode
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<OSTabType>("dados");
  const [currentOS, setCurrentOS] = useState<OrdemServico | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Sorting State
  const [sortField, setSortField] = useState<string>("numero_os");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Form Fields State
  const [clienteId, setClienteId] = useState("");
  const [implementoId, setImplementoId] = useState("");
  const [tipoAtendimento, setTipoAtendimento] = useState("");
  const [prioridade, setPrioridade] = useState<"NORMAL" | "ALTA" | "URGENTE">("NORMAL");
  const [status, setStatus] = useState<OrdemServico["status"]>("ABERTA");
  const [isManualStatus, setIsManualStatus] = useState(false);
  const [reclamacao, setReclamacao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [solicitante, setSolicitante] = useState("");

  // Atendimento State
  const [dataAtendimento, setDataAtendimento] = useState("");
  const [dataTermino, setDataTermino] = useState("");
  const [horaInicial, setHoraInicial] = useState("");
  const [horaFinal, setHoraFinal] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [auxiliarId, setAuxiliarId] = useState("");
  const [servicoExecutado, setServicoExecutado] = useState("");

  // Apontamentos State
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([]);
  const [newApontData, setNewApontData] = useState("");
  const [newApontHoraIn, setNewApontHoraIn] = useState("");
  const [newApontHoraFim, setNewApontHoraFim] = useState("");
  const [newApontTecId, setNewApontTecId] = useState("");
  const [newApontDesc, setNewApontDesc] = useState("");
  const [editingApontId, setEditingApontId] = useState<number | string | null>(null);

  // Peças State
  const [pecas, setPecas] = useState<PecaItem[]>([]);
  const [newPecaCod, setNewPecaCod] = useState("");
  const [newPecaDesc, setNewPecaDesc] = useState("");
  const [newPecaQtde, setNewPecaQtde] = useState<number>(1);
  const [newPecaValor, setNewPecaValor] = useState<number>(0);

  // Despesas & Finalização State
  const [kmRodado, setKmRodado] = useState<number>(0);
  const [kmInicial, setKmInicial] = useState<number>(0);
  const [kmFinal, setKmFinal] = useState<number>(0);
  const [valorKmUnitario, setValorKmUnitario] = useState<number>(0);
  const [valorDeslocamento, setValorDeslocamento] = useState<number>(0);
  const [valorHoraUnitario, setValorHoraUnitario] = useState<number>(0);
  const [valorMaoObra, setValorMaoObra] = useState<number>(0);
  const [maoObraManual, setMaoObraManual] = useState(false);
  const [deslocamentoManual, setDeslocamentoManual] = useState(false);
  const [veiculoUsado, setVeiculoUsado] = useState("");
  const [veiculosList, setVeiculosList] = useState<Veiculo[]>([]);
  const [tiposAtendimentoList, setTiposAtendimentoList] = useState<TipoAtendimento[]>([]);
  const [showInternalDebitMode, setShowInternalDebitMode] = useState(false);
  const [centroCustoDebito, setCentroCustoDebito] = useState("");
  const [observacaoDebito, setObservacaoDebito] = useState("");
  const [centrosCustoOpcoes, setCentrosCustoOpcoes] = useState<string[]>([]);

  // Custom commission overrides states
  const [comissaoCustomOpcao, setComissaoCustomOpcao] = useState<"automatico" | "personalizado">("automatico");
  const [comissaoCustomValorTecnico, setComissaoCustomValorTecnico] = useState<number>(0);
  const [comissaoCustomValorAuxiliar, setComissaoCustomValorAuxiliar] = useState<number>(0);

  // Searchable client dropdown states
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");

  useEffect(() => {
    const loadVeiculosAndTipos = async () => {
      try {
        const vData = await API.veiculos.listar();
        setVeiculosList(vData.filter(v => v.ativo !== false));
        const tData = await API.tiposAtendimento.listar();
        setTiposAtendimentoList(tData.filter(t => t.ativo !== false));
      } catch (e) {
        console.error("Erro ao carregar veículos ou tipos de atendimento:", e);
      }
    };
    loadVeiculosAndTipos();
  }, [isFormOpen]);

  // Helper for dynamic status calculation
  const getDynamicStatus = (
    currentStatus: OrdemServico["status"],
    dataAtend: string,
    horaIn: string,
    apontsCount: number
  ): OrdemServico["status"] => {
    // 1. ABERTA -> AGENDADA when data_atendimento (Início do Atendimento) is defined
    if (currentStatus === "ABERTA" && dataAtend) {
      return "AGENDADA";
    }

    // 2. AGENDADA -> EM ATENDIMENTO when the day and hour has arrived or passed
    if (currentStatus === "AGENDADA" && dataAtend) {
      const now = new Date();
      
      const localYear = now.getFullYear();
      const localMonth = String(now.getMonth() + 1).padStart(2, "0");
      const localDay = String(now.getDate()).padStart(2, "0");
      const localTodayStr = `${localYear}-${localMonth}-${localDay}`;
      
      if (localTodayStr > dataAtend) {
        return "EM ATENDIMENTO";
      } else if (localTodayStr === dataAtend) {
        if (horaIn) {
          const [h, m] = horaIn.split(":").map(Number);
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();
          if (currentHour > h || (currentHour === h && currentMin >= m)) {
            return "EM ATENDIMENTO";
          }
        } else {
          // If no time is specified, being the same day is enough
          return "EM ATENDIMENTO";
        }
      }
    }

    // 3. EM ATENDIMENTO -> AGUARDANDO (represented visually as "AGUARDANDO FINALIZAÇÃO") when there is at least one appointment log
    if (currentStatus === "EM ATENDIMENTO" && apontsCount > 0) {
      return "AGUARDANDO";
    }

    // 4. EM ATENDIMENTO -> AGUARDANDO if 2 days have passed since the scheduled date
    if (currentStatus === "EM ATENDIMENTO" && dataAtend) {
      const parts = dataAtend.split("-").map(Number);
      if (parts.length === 3) {
        const scheduledDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const todayDate = new Date();
        scheduledDate.setHours(0,0,0,0);
        todayDate.setHours(0,0,0,0);
        const diffDays = (todayDate.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 2) {
          return "AGUARDANDO";
        }
      }
    }

    return currentStatus;
  };

  // Dynamic status evaluation effect
  useEffect(() => {
    if (!isFormOpen || isManualStatus || status === "FINALIZADA" || status === "CANCELADA") {
      return;
    }

    const newStatus = getDynamicStatus(status, dataAtendimento, horaInicial, apontamentos.length);
    if (newStatus !== status) {
      setStatus(newStatus);
    }
  }, [dataAtendimento, horaInicial, apontamentos.length, isManualStatus, isFormOpen, status]);

  const [outrosCustos, setOutrosCustos] = useState<number>(0);
  const [notaFiscal, setNotaFiscal] = useState("");
  const [numNotaFiscal, setNumNotaFiscal] = useState("");
  const [dataNotaFiscal, setDataNotaFiscal] = useState("");
  const [horimetroFinal, setHorimetroFinal] = useState<number | "">("");
  const [localizacaoMaquina, setLocalizacaoMaquina] = useState("");
  const [revisaoExecutada, setRevisaoExecutada] = useState("");

  // XML NFe Import States
  const [isXmlImportOpen, setIsXmlImportOpen] = useState(false);
  const [xmlContent, setXmlContent] = useState("");
  const [parsedNfeItems, setParsedNfeItems] = useState<any[]>([]);
  const [parsedNfeNumber, setParsedNfeNumber] = useState("");
  const [parsedNfeEmit, setParsedNfeEmit] = useState("");
  const [parsedNfeTotal, setParsedNfeTotal] = useState(0);

  // Print Preview Mode State
  const [printPreviewOS, setPrintPreviewOS] = useState<OrdemServico | null>(null);
  const [printPreviewCampoOS, setPrintPreviewCampoOS] = useState<OrdemServico | null>(null);

  // Company config state for printable invoice header
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    const loadCompany = () => {
      const stored = localStorage.getItem("gst_company_config_v1");
      if (stored) {
        try {
          setCompany(JSON.parse(stored));
        } catch (e) {
          // ignore
        }
      } else {
        setCompany(null);
      }
    };

    loadCompany();

    // Listen for company_config_updated custom events
    window.addEventListener("company_config_updated", loadCompany);
    return () => {
      window.removeEventListener("company_config_updated", loadCompany);
    };
  }, []);

  // Fetch pointing records on demand for print preview O.S.
  useEffect(() => {
    if (printPreviewOS && printPreviewOS.id && !printPreviewOS.apontamentos) {
      API.apontamentos.listar(printPreviewOS.id).then((apList) => {
        setPrintPreviewOS((prev) => prev && prev.id === printPreviewOS.id ? { ...prev, apontamentos: apList } : prev);
      }).catch(console.error);
    }
  }, [printPreviewOS]);

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const getUltimoHorimetroApontado = (implId: number | string) => {
    if (!implId) return "";
    const related = ordens.filter(o => String(o.implemento_id) === String(implId));
    const otherOS = currentOS ? related.filter(o => String(o.id) !== String(currentOS.id)) : related;
    const maxHorimetro = otherOS.reduce((max, o) => {
      const val = Number(o.horimetro_final);
      return !isNaN(val) && val > max ? val : max;
    }, 0);
    return maxHorimetro > 0 ? maxHorimetro : "";
  };

  // Synchronize technician hourly and KM rates from technician profile
  useEffect(() => {
    if (tecnicoId) {
      const tech = tecnicos.find(t => String(t.id) === String(tecnicoId));
      if (tech) {
        if (!currentOS) {
          setValorKmUnitario(tech.valor_km || 0);
          setValorHoraUnitario(tech.valor_hora || 0);
        } else {
          if (!valorKmUnitario || valorKmUnitario === 0) setValorKmUnitario(tech.valor_km || 0);
          if (!valorHoraUnitario || valorHoraUnitario === 0) setValorHoraUnitario(tech.valor_hora || 0);
        }
      }
    }
  }, [tecnicoId, tecnicos, currentOS]);

  // Sync KM Inicial / KM Final to KM Rodado
  useEffect(() => {
    if (kmFinal > 0 && kmFinal >= kmInicial) {
      const calculatedKM = kmFinal - kmInicial;
      setKmRodado(calculatedKM);
    }
  }, [kmInicial, kmFinal]);

  // Removed automatic sync of Mão de Obra to avoid overwriting manual inputs

  // Open form directly when preselected ID changes
  const processedPreSelectedRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (preSelectedOSId !== undefined && preSelectedOSId !== null) {
      if (processedPreSelectedRef.current !== preSelectedOSId) {
        processedPreSelectedRef.current = preSelectedOSId;
        if (preSelectedOSId === 0) {
          // Create new
          openForm(null);
        } else {
          const found = ordens.find(o => o.id === preSelectedOSId);
          if (found) {
            openForm(found);
          }
        }
        onClearPreSelectedOS?.();
      }
    } else {
      processedPreSelectedRef.current = null;
    }
  }, [preSelectedOSId, ordens]);

  // Set the list filter if a specific status has been pre-selected (e.g. from Dashboard status cards)
  useEffect(() => {
    if (preSelectedStatus) {
      setSelectedStatus(preSelectedStatus);
      setCurrentPage(1);
      setIsFormOpen(false); // Make sure the list view is shown, closing any open form
    }
  }, [preSelectedStatus]);

  // Load and listen to Cost Centers updates from Settings
  useEffect(() => {
    const loadCentros = () => {
      const saved = localStorage.getItem("gst_centros_custo");
      if (saved) {
        try {
          setCentrosCustoOpcoes(JSON.parse(saved));
        } catch (e) {
          setCentrosCustoOpcoes(["Oficina", "PDI / Entrega Técnica", "Pós-Vendas", "Comercial / Vendas", "Frota / Veículos", "Administrativo"]);
        }
      } else {
        const defaultCentros = ["Oficina", "PDI / Entrega Técnica", "Pós-Vendas", "Comercial / Vendas", "Frota / Veículos", "Administrativo", "Garantia Fabricante"];
        setCentrosCustoOpcoes(defaultCentros);
        localStorage.setItem("gst_centros_custo", JSON.stringify(defaultCentros));
      }
    };
    loadCentros();
    window.addEventListener("centros_custo_updated", loadCentros);
    return () => window.removeEventListener("centros_custo_updated", loadCentros);
  }, []);

  // Load secondary O.S. details (Apontamentos, Peças, Despesas)
  const loadOSDetails = async (os: OrdemServico) => {
    if (!os.id) return;
    setIsLoading(true);
    setApontamentos([]); // Clear current list first to avoid ghosting
    try {
      const apList = await API.apontamentos.listar(os.id);
      console.log("Loaded appointments for OS", os.id, ":", apList);
      setApontamentos(apList);

      // Restore custom lists for parts from LocalStorage
      const savedPecas = localStorage.getItem(`gst_os_pecas_${os.id}`);
      if (savedPecas) {
        setPecas(JSON.parse(savedPecas));
      } else {
        setPecas([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredImplementos = () => {
    if (!clienteId) return [];
    return implementos.filter(i => i.cliente_id === Number(clienteId));
  };

  const getSelectedClientInfo = () => {
    if (!clienteId) return { cidade: "", uf: "" };
    const found = clientes.find(c => c.id === Number(clienteId));
    return found ? { cidade: found.cidade, uf: found.uf } : { cidade: "", uf: "" };
  };

  const openForm = (os: OrdemServico | null = null) => {
    setActiveTab("dados");
    setIsManualStatus(false);
    if (os) {
      setCurrentOS(os);
      setClienteId(os.cliente_id ? String(os.cliente_id) : "");
      setImplementoId(os.implemento_id ? String(os.implemento_id) : "");
      setTipoAtendimento(os.tipo_atendimento || "");
      setPrioridade(os.prioridade || "NORMAL");
      setStatus(os.status);
      setReclamacao(os.reclamacao);
      setObservacao(os.observacao || "");
      setSolicitante(os.solicitante || "");

      // Atendimento
      setDataAtendimento(os.data_atendimento ? os.data_atendimento.substring(0, 10) : "");
      setDataTermino(os.data_termino ? os.data_termino.substring(0, 10) : "");
      setHoraInicial(os.hora_inicial || "");
      setHoraFinal(os.hora_final || "");
      setTecnicoId(String(os.tecnico_id || ""));
      setAuxiliarId(String(os.auxiliar_id || ""));
      setServicoExecutado(os.servico_executado || "");

      // Encerramento
      setKmRodado(os.km_rodado_total || 0);
      setKmInicial(os.km_inicial || 0);
      setKmFinal(os.km_final || 0);
      const matchedTech = tecnicos.find(t => String(t.id) === String(os.tecnico_id));
      setValorKmUnitario(os.valor_km_unitario !== undefined && os.valor_km_unitario !== null ? os.valor_km_unitario : (matchedTech?.valor_km || 0));
      setValorDeslocamento(os.valor_deslocamento || 0);
      setDeslocamentoManual(os.valor_deslocamento !== undefined && os.valor_deslocamento !== null && os.valor_deslocamento !== 0);
      setValorHoraUnitario(os.valor_hora_unitario !== undefined && os.valor_hora_unitario !== null ? os.valor_hora_unitario : (matchedTech?.valor_hora || 0));
      setValorMaoObra(os.valor_mao_obra || 0);
      setMaoObraManual(os.valor_mao_obra !== undefined && os.valor_mao_obra !== null && os.valor_mao_obra !== 0);
      setVeiculoUsado(os.veiculo_usado || "");
      setOutrosCustos(os.valor_terceiros || 0);
      setNotaFiscal(os.nota_fiscal || "");
      setNumNotaFiscal(os.num_nota_fiscal || "");
      setDataNotaFiscal(os.data_nota_fiscal ? os.data_nota_fiscal.substring(0, 10) : "");
      setHorimetroFinal(os.horimetro_final || getUltimoHorimetroApontado(os.implemento_id) || "");
      const rawLocOS = os.localizacao_maquina || (os as any).localizacao || implementos.find(i => String(i.id) === String(os.implemento_id))?.localizacao || "";
      setLocalizacaoMaquina((rawLocOS && String(rawLocOS).trim().toUpperCase() !== "EMPTY") ? String(rawLocOS).trim() : "");
      setRevisaoExecutada(os.revisao_executada || "");

      setComissaoCustomOpcao(os.comissao_custom_opcao || "automatico");
      setComissaoCustomValorTecnico(os.comissao_custom_valor_tecnico || 0);
      setComissaoCustomValorAuxiliar(os.comissao_custom_valor_auxiliar || 0);

      let isInternal = os.modo_debito_interno || 
                        (os.tipo_atendimento || "").toUpperCase().includes("DÉBITO INTERNO") || 
                        (os.tipo_atendimento || "").toUpperCase().includes("GARANTIA") || 
                        (os.tipo_atendimento || "").toUpperCase().includes("ENTREGA TÉCNICA") || 
                        (os.tipo_atendimento || "").toUpperCase().includes("CORTESIA");

      if (!isInternal) {
        try {
          const savedConfig = localStorage.getItem("gst_comissoes_config");
          if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            if (parsed.regrasAtendimento && Array.isArray(parsed.regrasAtendimento)) {
              isInternal = parsed.regrasAtendimento.some((r: any) => (r?.tipo || "").toLowerCase().trim() === (os?.tipo_atendimento || "").toLowerCase().trim());
            }
          }
        } catch (e) {}
      }
      setShowInternalDebitMode(Boolean(isInternal));
      setCentroCustoDebito(os.centro_custo_debito || "");
      setObservacaoDebito(os.observacao_debito || "");

      loadOSDetails(os);
    } else {
      setCurrentOS(null);
      setClienteId("");
      setImplementoId("");
      setTipoAtendimento("");
      setPrioridade("NORMAL");
      setStatus("ABERTA");
      setReclamacao("");
      setObservacao("");
      setSolicitante("");
      setShowInternalDebitMode(false);
      setCentroCustoDebito("");
      setObservacaoDebito("");

      // Atendimento
      setDataAtendimento("");
      setDataTermino("");
      setHoraInicial("");
      setHoraFinal("");
      setTecnicoId("");
      setAuxiliarId("");
      setServicoExecutado("");

      // Encerramento
      setKmRodado(0);
      setKmInicial(0);
      setKmFinal(0);
      setValorKmUnitario(0);
      setValorDeslocamento(0);
      setDeslocamentoManual(false);
      setValorHoraUnitario(0);
      setValorMaoObra(0);
      setMaoObraManual(false);
      setVeiculoUsado("");
      setOutrosCustos(0);
      setNotaFiscal("");
      setNumNotaFiscal("");
      setDataNotaFiscal("");
      setHorimetroFinal("");
      setLocalizacaoMaquina("");

      setComissaoCustomOpcao("automatico");
      setComissaoCustomValorTecnico(0);
      setComissaoCustomValorAuxiliar(0);
      setShowInternalDebitMode(false);
      setApontamentos([]);
      setPecas([]);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setCurrentOS(null);
  };

  // Calculations for Labor hours based on Apontamentos
  const calcularTotalHorasTrabalhadas = () => {
    const uniqueBlocks = new Set<string>();
    let total = 0;
    
    apontamentos.forEach(a => {
      // Create a unique key for the time block to avoid counting simultaneous work twice
      const key = `${a.data_servico}_${a.hora_inicial}_${a.hora_final}`;
      
      if (!uniqueBlocks.has(key)) {
        uniqueBlocks.add(key);
        total += Number(a.horas_trabalhadas || 0);
      }
    });
    
    return total;
  };

  // Calculations for Pieces costs
  const calcularTotalPecas = () => {
    return pecas.reduce((sum, p) => sum + (p.quantidade * p.valor_unitario), 0);
  };

  // Mileage rate calculation based on selected technician
  const calcularCustoDeslocamento = () => {
    if (deslocamentoManual) return valorDeslocamento;
    if (!tecnicoId) return 0;
    const tech = tecnicos.find(t => t.id === Number(tecnicoId));
    const rate = valorKmUnitario > 0 ? valorKmUnitario : (tech?.valor_km || 0);
    return kmRodado * rate;
  };

  const calcularCustoMaoObra = () => {
    if (maoObraManual) return valorMaoObra;
    if (!tecnicoId) return 0;
    const tech = tecnicos.find(t => t.id === Number(tecnicoId));
    const rate = valorHoraUnitario > 0 ? valorHoraUnitario : (tech?.valor_hora || 0);
    return calcularTotalHorasTrabalhadas() * rate;
  };

  // Total O.S. budget sum
  const calcularValorTotalOS = () => {
    return Number(valorMaoObra || 0) + Number(valorDeslocamento || 0) + Number(outrosCustos || 0);
  };

  const handleSendTechWhatsapp = (targetOS?: OrdemServico) => {
    const activeOS = targetOS || currentOS;
    const targetTechId = activeOS?.tecnico_id || (tecnicoId ? Number(tecnicoId) : null);
    if (!targetTechId) {
      showToast("Esta O.S. não possui técnico responsável atribuído.", "error");
      return;
    }
    const tech = tecnicos.find(t => t.id === Number(targetTechId));
    if (!tech || !tech.telefone) {
      showToast(`O técnico ${tech?.nome || ""} não possui telefone cadastrado.`, "error");
      return;
    }
    const phoneClean = (tech.telefone || "").replace(/\D/g, "");
    if (!phoneClean) {
      showToast("Número de telefone do técnico é inválido.", "error");
      return;
    }
    const phoneFull = phoneClean.length <= 11 ? `55${phoneClean}` : phoneClean;
    const clientObj = clientes.find(c => String(c.id) === String(activeOS?.cliente_id || clienteId));
    const implObj = implementos.find(i => String(i.id) === String(activeOS?.implemento_id || implementoId));

    const fullOSObject: Partial<OrdemServico> = {
      ...(activeOS || {}),
      tecnico_id: Number(targetTechId),
      data_atendimento: activeOS?.data_atendimento || dataAtendimento,
      hora_inicial: activeOS?.hora_inicial || horaInicial,
      tipo_atendimento: activeOS?.tipo_atendimento || tipoAtendimento,
      reclamacao: activeOS?.reclamacao || reclamacao,
      prioridade: activeOS?.prioridade || prioridade
    };

    const msg = formatOSNotificationText(fullOSObject, tecnicos, clientObj, implObj);

    const waUrl = `https://api.whatsapp.com/send?phone=${phoneFull}&text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const handleSaveOS = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clienteId || clienteId === "0" || !implementoId || implementoId === "0") {
      showToast("Preencha todos os campos obrigatórios (*)", "error");
      return null;
    }

    const reclamacaoVal = (reclamacao || "").trim() || "Atendimento Solicitado";

    // Load Agenda configuration
    let agendaCfg = { bloquearSobreposicao: true, notificarTecnicoWhatsapp: true };
    try {
      const storedCfg = localStorage.getItem("gst_agenda_config_v1");
      if (storedCfg) {
        agendaCfg = { ...agendaCfg, ...JSON.parse(storedCfg) };
      }
    } catch (e) {}

    // Check schedule overlap if configured
    if (agendaCfg.bloquearSobreposicao && tecnicoId && dataAtendimento) {
      const selectedTechId = Number(tecnicoId);
      const targetDateStr = String(dataAtendimento).substring(0, 10);
      const existingOS = ordens.find(o => 
        o.id !== currentOS?.id &&
        o.status !== "CANCELADA" &&
        (o.tecnico_id === selectedTechId || o.auxiliar_id === selectedTechId) &&
        ((o.data_atendimento && o.data_atendimento.substring(0, 10) === targetDateStr) || (o.data_abertura && o.data_abertura.substring(0, 10) === targetDateStr))
      );

      if (existingOS) {
        const confirmOverlap = window.confirm(
          `⚠️ ALERTA DE SOBREPOSIÇÃO DE HORÁRIOS!\n\nO técnico selecionado já possui a O.S. Nº ${existingOS.numero_os} agendada para o dia ${targetDateStr}.\n\nDeseja continuar e salvar o agendamento mesmo assim?`
        );
        if (!confirmOverlap) {
          setIsLoading(false);
          return null;
        }
      }
    }

    setIsLoading(true);

    const valTotal = calcularValorTotalOS();

    const payload: OrdemServico = {
      numero_os: currentOS?.numero_os || "",
      status: status,
      cliente_id: Number(clienteId),
      implemento_id: Number(implementoId),
      tipo_atendimento: tipoAtendimento || "ASSISTÊNCIA TÉCNICA",
      prioridade: prioridade,
      reclamacao: reclamacaoVal,
      observacao,
      solicitante,

      // Atendimento
      data_atendimento: dataAtendimento || null,
      data_termino: dataTermino || null,
      hora_inicial: horaInicial,
      hora_final: horaFinal,
      tecnico_id: tecnicoId ? Number(tecnicoId) : undefined,
      auxiliar_id: auxiliarId ? Number(auxiliarId) : undefined,
      servico_executado: servicoExecutado,

      // Costs & Encerramento
      km_rodado_total: kmRodado,
      km_inicial: kmInicial,
      km_final: kmFinal,
      valor_km_unitario: valorKmUnitario,
      valor_hora_unitario: valorHoraUnitario,
      veiculo_usado: veiculoUsado,
      valor_deslocamento: Number(valorDeslocamento || 0),
      valor_mao_obra: Number(valorMaoObra || 0),
      valor_terceiros: Number(outrosCustos || 0),
      nota_fiscal: notaFiscal,
      num_nota_fiscal: numNotaFiscal,
      data_nota_fiscal: dataNotaFiscal || null,
      valor_total: valTotal,
      horas_trabalhadas_total: String(calcularTotalHorasTrabalhadas()),
      horimetro_final: horimetroFinal !== "" ? Number(horimetroFinal) : undefined,
      localizacao_maquina: localizacaoMaquina.trim() || undefined,
      localizacao: localizacaoMaquina.trim() || undefined,
      revisao_executada: revisaoExecutada,

      // Custom commission overrides fields
      comissao_custom_opcao: comissaoCustomOpcao,
      comissao_custom_valor_tecnico: Number(comissaoCustomValorTecnico),
      comissao_custom_valor_auxiliar: Number(comissaoCustomValorAuxiliar),

      // Internal debit mode database fields
      modo_debito_interno: showInternalDebitMode,
      classificacao_atendimento_interno: showInternalDebitMode ? (tipoAtendimento || "ASSISTÊNCIA TÉCNICA") : null,
      centro_custo_debito: centroCustoDebito || null,
      observacao_debito: showInternalDebitMode ? observacaoDebito : null,
      valor_referencia_servico: (() => {
        if (!showInternalDebitMode) return 0;
        let calcValue = 0;
        try {
          const savedConfig = localStorage.getItem("gst_comissoes_config");
          if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            const matched = parsed.regrasAtendimento?.find((r: any) => (r?.tipo || "").toLowerCase().trim() === (tipoAtendimento || "").toLowerCase().trim());
            const rule = matched || parsed.regraPadrao;
            if (rule) {
              if (rule.baseCalculo === "fixo") {
                calcValue = Number(rule.valorTecnico || 0) + (rule.relacaoAuxiliar === "desabilitado" ? 0 : Number(rule.valorAuxiliar || 0));
              } else {
                // For all other bases (horas_e_km_customizado, faturamento_total, or mao_de_obra_deslocamento) in internal debit,
                // we calculate the reference value using the fixed, reduced rates configured in the rule or standard rule.
                const hRate = Number(rule.valorHoraComissao ?? 50);
                const kRate = Number(rule.valorKmComissao ?? 1.50);
                calcValue = (parseFloat(String(calcularTotalHorasTrabalhadas())) * hRate) + (Number(kmRodado) * kRate);
              }
            } else {
              // Fallback default reduced rates
              calcValue = (parseFloat(String(calcularTotalHorasTrabalhadas())) * 50) + (Number(kmRodado) * 1.50);
            }
          } else {
            // Fallback default reduced rates
            calcValue = (parseFloat(String(calcularTotalHorasTrabalhadas())) * 50) + (Number(kmRodado) * 1.50);
          }
        } catch (e) {
          // Fallback default reduced rates
          calcValue = (parseFloat(String(calcularTotalHorasTrabalhadas())) * 50) + (Number(kmRodado) * 1.50);
        }
        return calcValue;
      })(),
      base_calculo_referencia: (() => {
        if (!showInternalDebitMode) return "Horas + KM Reduz.";
        try {
          const savedConfig = localStorage.getItem("gst_comissoes_config");
          if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            const matched = parsed.regrasAtendimento?.find((r: any) => (r?.tipo || "").toLowerCase().trim() === (tipoAtendimento || "").toLowerCase().trim());
            const rule = matched || parsed.regraPadrao;
            if (rule) {
              if (rule.baseCalculo === "fixo") return "Taxa Fixa";
              const hRate = Number(rule.valorHoraComissao ?? 50);
              const kRate = Number(rule.valorKmComissao ?? 1.50);
              return `Horas + KM Reduz. (R$ ${hRate.toFixed(2)}/h e R$ ${kRate.toFixed(2)}/km)`;
            }
          }
        } catch (e) {}
        return "Horas + KM Reduz. (R$ 50.00/h e R$ 1.50/km)";
      })()
    };

    try {
      console.log("Saving OS with payload:", payload);
      let savedOS: OrdemServico;
      if (currentOS && currentOS.id) {
        savedOS = await API.ordensServico.atualizar(currentOS.id, payload);
        showToast("Ordem de Serviço salva com sucesso!", "success");
        addAuditLog(
          currentUser?.nome || currentUser?.usuario,
          "Ordens de Serviço",
          "SUCESSO",
          "Atualização de O.S.",
          `A Ordem de Serviço ${savedOS.numero_os} foi atualizada com sucesso.`
        );
      } else {
        savedOS = await API.ordensServico.inserir(payload);
        showToast("Ordem de Serviço criada com sucesso!", "success");
        addAuditLog(
          currentUser?.nome || currentUser?.usuario,
          "Ordens de Serviço",
          "SUCESSO",
          "Abertura de O.S.",
          `A Ordem de Serviço ${savedOS.numero_os || "nova"} foi criada com sucesso.`
        );
      }
      
      console.log("Saved OS result:", savedOS);
      // Save parts to specific sub key
      if (savedOS.id) {
        localStorage.setItem(`gst_os_pecas_${savedOS.id}`, JSON.stringify(pecas));
      }

      // Sync machine location to equipment record
      if (implementoId && localizacaoMaquina.trim()) {
        const targetEquipment = implementos.find(i => String(i.id) === String(implementoId));
        if (targetEquipment && targetEquipment.id) {
          const locVal = localizacaoMaquina.trim();
          try {
            await API.implementos.atualizar(targetEquipment.id, {
              ...targetEquipment,
              localizacao: locVal
            });
            const locMappingStr = localStorage.getItem("gst_implemento_localizacao");
            const locMapping = locMappingStr ? JSON.parse(locMappingStr) : {};
            locMapping[targetEquipment.id] = locVal;
            localStorage.setItem("gst_implemento_localizacao", JSON.stringify(locMapping));
          } catch (eLoc) {
            console.warn("Could not sync location to equipment on OS save:", eLoc);
          }
        }
      }

      await onRefresh();
      // Reload details to get the synchronized apontamentos
      await loadOSDetails(savedOS);
      setCurrentOS(savedOS);

      // Sync form states with saved data to ensure UI matches DB exactly
      if (savedOS.cliente_id) setClienteId(String(savedOS.cliente_id));
      if (savedOS.implemento_id) setImplementoId(String(savedOS.implemento_id));
      if (savedOS.tipo_atendimento) setTipoAtendimento(savedOS.tipo_atendimento);
      if (savedOS.prioridade) setPrioridade(savedOS.prioridade);
      if (savedOS.status) setStatus(savedOS.status);
      if (savedOS.tecnico_id !== undefined) setTecnicoId(savedOS.tecnico_id ? String(savedOS.tecnico_id) : "");
      if (savedOS.auxiliar_id !== undefined) setAuxiliarId(savedOS.auxiliar_id ? String(savedOS.auxiliar_id) : "");
      if (savedOS.data_atendimento !== undefined) setDataAtendimento(savedOS.data_atendimento ? savedOS.data_atendimento.substring(0, 10) : "");
      if (savedOS.data_termino !== undefined) setDataTermino(savedOS.data_termino ? savedOS.data_termino.substring(0, 10) : "");
      if (savedOS.hora_inicial !== undefined) setHoraInicial(savedOS.hora_inicial || "");
      if (savedOS.hora_final !== undefined) setHoraFinal(savedOS.hora_final || "");
      if (savedOS.reclamacao !== undefined) setReclamacao(savedOS.reclamacao);
      if (savedOS.servico_executado !== undefined) setServicoExecutado(savedOS.servico_executado);
      if (savedOS.observacao !== undefined) setObservacao(savedOS.observacao || "");
      if (savedOS.solicitante !== undefined) setSolicitante(savedOS.solicitante || "");
      if (savedOS.numero_os) {
        // Force update of number if it was generated
        setCurrentOS(prev => prev ? { ...prev, numero_os: savedOS.numero_os } : savedOS);
      }
      if (savedOS.km_rodado_total !== undefined) setKmRodado(savedOS.km_rodado_total);
      if (savedOS.horimetro_final !== undefined) setHorimetroFinal(savedOS.horimetro_final);
      if (savedOS.localizacao_maquina !== undefined || (savedOS as any).localizacao !== undefined) {
        setLocalizacaoMaquina(savedOS.localizacao_maquina || (savedOS as any).localizacao || "");
      }
      if (savedOS.modo_debito_interno !== undefined) setShowInternalDebitMode(Boolean(savedOS.modo_debito_interno));
      if (savedOS.centro_custo_debito !== undefined) setCentroCustoDebito(savedOS.centro_custo_debito || "");
      if (savedOS.observacao_debito !== undefined) setObservacaoDebito(savedOS.observacao_debito || "");

      // Auto notify technician via WhatsApp if enabled in agenda config
      if (agendaCfg.notificarTecnicoWhatsapp && savedOS.tecnico_id) {
        const targetTech = tecnicos.find(t => t.id === savedOS.tecnico_id);
        if (targetTech && targetTech.telefone) {
          const phoneClean = (targetTech.telefone || "").replace(/\D/g, "");
          if (phoneClean) {
            const phoneFull = phoneClean.length <= 11 ? `55${phoneClean}` : phoneClean;
            const clientObj = clientes.find(c => String(c.id) === String(clienteId));
            const implObj = implementos.find(i => String(i.id) === String(implementoId));

            const msg = formatOSNotificationText(savedOS, tecnicos, clientObj, implObj);

            const waUrl = `https://api.whatsapp.com/send?phone=${phoneFull}&text=${encodeURIComponent(msg)}`;
            setTimeout(() => {
              if (window.confirm(`Deseja enviar a notificação da O.S. ${savedOS.numero_os} via WhatsApp para o técnico ${targetTech.nome}?`)) {
                window.open(waUrl, "_blank");
              }
            }, 300);
          }
        }
      }

      return savedOS;
    } catch (err: any) {
      console.error("Error in handleSaveOS:", err);
      showToast(`Erro ao salvar O.S.: ${err?.message || "Erro desconhecido"}`, "error");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeOS = async () => {
    let activeOS = currentOS;
    if (!activeOS || !activeOS.id) {
      activeOS = await handleSaveOS();
      if (!activeOS || !activeOS.id) {
        showToast("Grave a O.S. primeiro para liberar o encerramento.", "error");
        return;
      }
    }

    if (!horimetroFinal) {
      showToast("Por favor, preencha o Horímetro Final antes de encerrar.", "error");
      return;
    }

    // Retrieve equipment to validate horimetro
    const equipment = implementos.find(i => i.id === Number(implementoId));
    if (equipment) {
      const currentHorimetro = Number(equipment.horimetro_atual) || 0;
      if (Number(horimetroFinal) < currentHorimetro) {
        showToast(`O horímetro informado (${horimetroFinal} h) é menor que o atual (${currentHorimetro} h).`, "error");
        return;
      }
    }

    setIsLoading(true);
    try {
      // First save general fields
      const saved = await handleSaveOS();
      if (saved && saved.id) {
        await API.ordensServico.finalizar(saved.id);
        
        // Also update equipment horímetro & location dynamically!
        if (equipment && equipment.id) {
          const locVal = localizacaoMaquina.trim() || equipment.localizacao;
          await API.implementos.atualizar(equipment.id, {
            ...equipment,
            horimetro_atual: Number(horimetroFinal) || equipment.horimetro_atual,
            localizacao: locVal,
            observacao: `${equipment.observacao || ""}\n[Atendimento O.S. ${saved.numero_os} em ${new Date().toLocaleDateString("pt-BR")} - Horímetro: ${horimetroFinal}h]`.trim()
          });
          if (locVal) {
            const locMappingStr = localStorage.getItem("gst_implemento_localizacao");
            const locMapping = locMappingStr ? JSON.parse(locMappingStr) : {};
            locMapping[equipment.id] = locVal;
            localStorage.setItem("gst_implemento_localizacao", JSON.stringify(locMapping));
          }
        }

        setStatus("FINALIZADA");
        showToast(`O.S. ${saved.numero_os} FINALIZADA COM SUCESSO!`, "success");
        closeForm();
        await onRefresh();
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao finalizar O.S.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOS = async () => {
    if (!currentOS || !currentOS.id) {
      // In sandboxed environments, confirm() is blocked. 
      // Proceeding directly as the button click is explicit intent.
      closeForm();
      return;
    }
    
    // In sandboxed environments, confirm() is blocked. 
    // Proceeding directly as the button click is explicit intent.
    
    setIsLoading(true);
    try {
      await API.ordensServico.cancelar(currentOS.id);
      setStatus("CANCELADA");
      showToast("Ordem de Serviço Cancelada.", "success");
      closeForm();
      await onRefresh();
    } catch (err) {
      console.error(err);
      showToast("Erro ao cancelar O.S.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Add or Update a specific labor record (Apontamento)
  const handleAddApontamento = async () => {
    let activeOS = currentOS;
    if (!activeOS || !activeOS.id) {
      activeOS = await handleSaveOS();
      if (!activeOS || !activeOS.id) {
        showToast("Por favor, preencha os dados obrigatórios da aba 'Dados da O.S.' primeiro.", "error");
        return;
      }
    }
    
    if (!newApontData || !newApontHoraIn || !newApontHoraFim) {
      showToast("Preencha todos os campos obrigatórios (Data, Hora Início, Hora Fim).", "error");
      return;
    }

    // Calculate elapsed hours
    const [hIn, mIn] = newApontHoraIn.split(":").map(Number);
    const [hFim, mFim] = newApontHoraFim.split(":").map(Number);
    let diff = (hFim * 60 + mFim) - (hIn * 60 + mIn);
    if (diff < 0) diff += 24 * 60; // crossover midnight
    const hoursDecimal = Number((diff / 60).toFixed(2));

    setIsLoading(true);
    try {
      if (editingApontId) {
        // UPDATE MODE
        const existing = apontamentos.find(a => a.id === editingApontId);
        if (!existing) throw new Error("Apontamento não encontrado.");

        const updatedAp: Apontamento = {
          ...existing,
          data_servico: newApontData,
          hora_inicial: newApontHoraIn,
          hora_final: newApontHoraFim,
          horas_trabalhadas: hoursDecimal,
          descricao_servico: newApontDesc || existing.descricao_servico
        };

        const result = await API.apontamentos.atualizar(Number(editingApontId), updatedAp);
        
        setApontamentos(prev => prev.map(a => a.id === editingApontId ? result : a));
        showToast("Apontamento atualizado com sucesso!");
        addAuditLog(
          currentUser?.nome || currentUser?.usuario,
          "Ordens de Serviço",
          "INFO",
          "Atualização de Apontamento",
          `Apontamento de horas atualizado com sucesso na Ordem de Serviço ${activeOS?.numero_os || "N/A"}.`
        );
        setEditingApontId(null);
      } else {
        // INSERT MODE
        if (!tecnicoId) {
          showToast("Por favor, selecione o Técnico Principal Responsável na aba Agendamento primeiro.", "error");
          setIsLoading(false);
          return;
        }

        const newAp: Apontamento = {
          os_id: activeOS.id!,
          tecnico_id: Number(tecnicoId),
          data_servico: newApontData,
          hora_inicial: newApontHoraIn,
          hora_final: newApontHoraFim,
          horas_trabalhadas: hoursDecimal,
          descricao_servico: newApontDesc || "Atendimento em Campo"
        };
        
        const insertedMain = await API.apontamentos.inserir(newAp);
        const insertedItems: Apontamento[] = [insertedMain];

        // If there is an assistant, insert a pointing record for them too
        if (auxiliarId && auxiliarId !== "" && auxiliarId !== "0" && auxiliarId !== "null" && auxiliarId !== tecnicoId) {
          const auxAp: Apontamento = {
            os_id: activeOS.id!,
            tecnico_id: Number(auxiliarId),
            data_servico: newApontData,
            hora_inicial: newApontHoraIn,
            hora_final: newApontHoraFim,
            horas_trabalhadas: hoursDecimal,
            descricao_servico: newApontDesc || "Auxílio em Atendimento de Campo"
          };
          const insertedAux = await API.apontamentos.inserir(auxAp);
          insertedItems.push(insertedAux);
        }
        
        setApontamentos(prev => {
          const ids = insertedItems.map(i => i.id);
          const filtered = prev.filter(p => !ids.includes(p.id));
          return [...insertedItems, ...filtered];
        });

        showToast("Apontamento registrado com sucesso!");
        addAuditLog(
          currentUser?.nome || currentUser?.usuario,
          "Ordens de Serviço",
          "INFO",
          "Registro de Apontamento",
          `Novo apontamento de horas registrado com sucesso na Ordem de Serviço ${activeOS?.numero_os || "N/A"}.`
        );
      }
      
      // Reset inputs
      setNewApontData("");
      setNewApontHoraIn("");
      setNewApontHoraFim("");
      setNewApontDesc("");
      
      // Transition from EM ATENDIMENTO to AGUARDANDO when a pointing hour is logged or updated!
      if (status === "EM ATENDIMENTO") {
        setStatus("AGUARDANDO");
        if (activeOS && activeOS.id) {
          await API.ordensServico.atualizar(activeOS.id, {
            ...activeOS,
            status: "AGUARDANDO"
          });
        }
      }

      // Reload details from server to ensure consistency
      await loadOSDetails(activeOS);
    } catch (err) {
      console.error(err);
      showToast("Erro ao processar apontamento.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEditApontamento = (a: Apontamento) => {
    setEditingApontId(a.id || null);
    setNewApontData(a.data_servico || "");
    setNewApontHoraIn(a.hora_inicial || "");
    setNewApontHoraFim(a.hora_final || "");
    setNewApontDesc(a.descricao_servico || "");
    
    // Scroll to the "NOVO REGISTRO DE HORAS" section
    const section = document.getElementById("novo-apontamento-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCancelEditApontamento = () => {
    setEditingApontId(null);
    setNewApontData("");
    setNewApontHoraIn("");
    setNewApontHoraFim("");
    setNewApontDesc("");
  };

  const handleDeleteApontamento = async (apId: number | string) => {
    setIsLoading(true);
    try {
      console.log("Handle Delete: Forcing removal of ID:", apId);
      
      // 1. Immediate UI removal (Optimistic Update)
      setApontamentos(prev => prev.filter(a => String(a.id) !== String(apId)));
      
      // 2. API call
      const success = await API.apontamentos.excluir(apId);
      
      if (success) {
        showToast("Apontamento removido.");
        addAuditLog(
          currentUser?.nome || currentUser?.usuario,
          "Ordens de Serviço",
          "INFO",
          "Exclusão de Apontamento",
          `Um apontamento de horas da Ordem de Serviço ${currentOS?.numero_os || "N/A"} foi excluído com sucesso.`
        );
        // We wait a bit before refreshing from server to allow DB consistency
        setTimeout(async () => {
          if (currentOS?.id) {
            const freshList = await API.apontamentos.listar(currentOS.id);
            setApontamentos(freshList);
          }
        }, 1500);
      } else {
        showToast("Removido da tela, mas houve um erro na sincronização.", "info");
      }
    } catch (err: any) {
      console.error("Error deleting pointing:", err);
      showToast("Erro ao excluir: " + (err.message || "Erro desconhecido"), "error");
      
      // Rollback UI if it failed catastrophically? 
      // Better to refresh from server
      if (currentOS) await loadOSDetails(currentOS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOS = async (osId: number, numeroOS: string) => {
    if (!confirm(`Deseja realmente excluir a Ordem de Serviço ${numeroOS}?`)) return;
    setIsLoading(true);
    try {
      await API.ordensServico.excluir(osId);
      showToast(`Ordem de Serviço ${numeroOS} excluída com sucesso!`, "success");
      addAuditLog(
        currentUser?.nome || currentUser?.usuario,
        "Ordens de Serviço",
        "SUCESSO",
        "Exclusão de O.S.",
        `A Ordem de Serviço ${numeroOS} foi excluída com sucesso.`
      );
      await onRefresh();
    } catch (err) {
      console.error(err);
      showToast("Erro ao excluir Ordem de Serviço.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Parts list functions
  const handleAddPeca = () => {
    if (!newPecaDesc || newPecaQtde <= 0) return;
    const newItem: PecaItem = {
      id: "P" + String(Date.now()),
      codigo: newPecaCod || "—",
      descricao: newPecaDesc.toUpperCase(),
      quantidade: Number(newPecaQtde),
      valor_unitario: Number(newPecaValor),
      xml_imported: false
    };
    const updated = [...pecas, newItem];
    setPecas(updated);
    if (currentOS?.id) {
      localStorage.setItem(`gst_os_pecas_${currentOS.id}`, JSON.stringify(updated));
    }
    setNewPecaCod("");
    setNewPecaDesc("");
    setNewPecaQtde(1);
    setNewPecaValor(0);
  };

  const handleDeletePeca = (itemId: string) => {
    const updated = pecas.filter(p => p.id !== itemId);
    setPecas(updated);
    if (currentOS?.id) {
      localStorage.setItem(`gst_os_pecas_${currentOS.id}`, JSON.stringify(updated));
    }
  };

  // Preset XML content for demonstration and testing purposes
  const baldansXmlPreset = `<?xml version="1.0" encoding="utf-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35260700012345678901234567890123456789012345" versao="4.00">
      <ide>
        <nNF>14529</nNF>
        <dhEmi>2026-07-10T14:30:00-03:00</dhEmi>
      </ide>
      <emit>
        <xNome>BALDAN IMPLEMENTOS AGRICOLAS S.A.</xNome>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>BAL-MAN-245</cProd>
          <xProd>MANCAL COMPLETO AGRICOLA BALDAN 1.1/2</xProd>
          <qCom>2.00</qCom>
          <vUnCom>450.00</vUnCom>
          <vProd>900.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>BAL-RET-892</cProd>
          <xProd>RETENTOR EIXO GRADE BALDAN</xProd>
          <qCom>4.00</qCom>
          <vUnCom>35.00</vUnCom>
          <vProd>140.00</vProd>
        </prod>
      </det>
      <det nItem="3">
        <prod>
          <cProd>BAL-DIS-28</cProd>
          <xProd>DISCO DE GRADE BALDAN 28 POLEGADAS</xProd>
          <qCom>2.00</qCom>
          <vUnCom>400.00</vUnCom>
          <vProd>800.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>1840.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

  const johnDeereXmlPreset = `<?xml version="1.0" encoding="utf-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35260700012345678901234567890123456789012346" versao="4.00">
      <ide>
        <nNF>82301</nNF>
        <dhEmi>2026-07-14T09:15:00-03:00</dhEmi>
      </ide>
      <emit>
        <xNome>REVENDA E PECAS JOHN DEERE LTDA</xNome>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>JD-AN20349</cProd>
          <xProd>FILTRO DE AR COMPLETO JD 7515</xProd>
          <qCom>1.00</qCom>
          <vUnCom>245.00</vUnCom>
          <vProd>245.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>JD-RE50483</cProd>
          <xProd>FILTRO DE OLEO MOTOR RE50483</xProd>
          <qCom>2.00</qCom>
          <vUnCom>120.00</vUnCom>
          <vProd>240.00</vProd>
        </prod>
      </det>
      <det nItem="3">
        <prod>
          <cProd>JD-AW68-20</cProd>
          <xProd>OLEO HIDRAULICO AW 68 DEERE (BALDE 20L)</xProd>
          <qCom>1.00</qCom>
          <vUnCom>370.00</vUnCom>
          <vProd>370.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>855.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

  const parseNfeXml = (xmlStr: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
      
      const parseError = xmlDoc.getElementsByTagName("parsererror");
      if (parseError.length > 0) {
        throw new Error("Erro de formatação no arquivo XML.");
      }

      const nNFElems = xmlDoc.getElementsByTagName("nNF");
      const nNF = nNFElems.length > 0 ? nNFElems[0].textContent || "" : "";

      const emitElems = xmlDoc.getElementsByTagName("emit");
      let emitName = "";
      if (emitElems.length > 0) {
        const xNomeElems = emitElems[0].getElementsByTagName("xNome");
        if (xNomeElems.length > 0) {
          emitName = xNomeElems[0].textContent || "";
        }
      }

      const vNFElems = xmlDoc.getElementsByTagName("vNF");
      const vNF = vNFElems.length > 0 ? parseFloat(vNFElems[0].textContent || "0") : 0;

      const detElems = xmlDoc.getElementsByTagName("det");
      const items = [];
      for (let i = 0; i < detElems.length; i++) {
        const det = detElems[i];
        const cProd = det.getElementsByTagName("cProd")[0]?.textContent || "";
        const xProd = det.getElementsByTagName("xProd")[0]?.textContent || "";
        const qCom = parseFloat(det.getElementsByTagName("qCom")[0]?.textContent || "1");
        const vUnCom = parseFloat(det.getElementsByTagName("vUnCom")[0]?.textContent || "0");
        const vProd = parseFloat(det.getElementsByTagName("vProd")[0]?.textContent || "0");
        
        items.push({
          id: `xml_item_${i}_${Date.now()}`,
          codigo: cProd,
          descricao: xProd,
          quantidade: qCom,
          valor_unitario: vUnCom,
          valor_total: vProd,
          selected: true
        });
      }

      return { nNF, emitName, vNF, items };
    } catch (error) {
      console.warn("DOMParser failed or tags missing, falling back to Regex parsing", error);
      
      const nNFMatch = xmlStr.match(/<nNF>([^<]+)<\/nNF>/);
      const nNF = nNFMatch ? nNFMatch[1] : "";

      const xNomeMatch = xmlStr.match(/<emit>[\s\S]*?<xNome>([^<]+)<\/xNome>/);
      const emitName = xNomeMatch ? xNomeMatch[1] : "";

      const vNFMatch = xmlStr.match(/<vNF>([^<]+)<\/vNF>/);
      const vNF = vNFMatch ? parseFloat(vNFMatch[1]) : 0;

      const detRegex = /<det[^>]*>([\s\S]*?)<\/det>/g;
      const items = [];
      let match;
      let index = 0;
      while ((match = detRegex.exec(xmlStr)) !== null) {
        const detContent = match[1];
        const cProdMatch = detContent.match(/<cProd>([^<]+)<\/cProd>/);
        const xProdMatch = detContent.match(/<xProd>([^<]+)<\/xProd>/);
        const qComMatch = detContent.match(/<qCom>([^<]+)<\/qCom>/);
        const vUnComMatch = detContent.match(/<vUnCom>([^<]+)<\/vUnCom>/);

        const cProd = cProdMatch ? cProdMatch[1] : "";
        const xProd = xProdMatch ? xProdMatch[1] : "";
        const qCom = qComMatch ? parseFloat(qComMatch[1]) : 1;
        const vUnCom = vUnComMatch ? parseFloat(vUnComMatch[1]) : 0;
        const vProd = qCom * vUnCom;

        if (xProd) {
          items.push({
            id: `xml_item_${index}_${Date.now()}`,
            codigo: cProd,
            descricao: xProd.toUpperCase(),
            quantidade: qCom,
            valor_unitario: vUnCom,
            valor_total: vProd,
            selected: true
          });
          index++;
        }
      }

      return { nNF, emitName, vNF, items };
    }
  };

  const processXml = (xmlStr: string) => {
    if (!xmlStr.trim()) {
      showToast("Por favor, cole ou faça upload de um XML válido.", "error");
      return;
    }
    const result = parseNfeXml(xmlStr);
    if (result.items.length === 0) {
      showToast("Nenhum item de produto encontrado no XML. Verifique o formato.", "error");
      return;
    }
    setParsedNfeNumber(result.nNF);
    setParsedNfeEmit(result.emitName);
    setParsedNfeTotal(result.vNF);
    setParsedNfeItems(result.items);
    showToast(`XML processado! ${result.items.length} peças encontradas.`, "success");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setXmlContent(text);
      processXml(text);
    };
    reader.readAsText(file);
  };

  const handleImportSelectedItems = () => {
    const selectedItems = parsedNfeItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      showToast("Nenhum item selecionado para importação.", "error");
      return;
    }

    const newPecasList = [...pecas];
    selectedItems.forEach(item => {
      const newId = "P" + String(Date.now()) + "_" + Math.random().toString(36).substr(2, 4);
      newPecasList.push({
        id: newId,
        codigo: item.codigo,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        xml_imported: true
      });
    });

    setPecas(newPecasList);
    if (currentOS?.id) {
      localStorage.setItem(`gst_os_pecas_${currentOS.id}`, JSON.stringify(newPecasList));
    }

    setIsXmlImportOpen(false);
    setXmlContent("");
    setParsedNfeItems([]);
    showToast(`${selectedItems.length} peças importadas da NF-e com sucesso!`, "success");
  };

  // Calculations for elapsed days (ABERTA to today)
  const getElapsedDays = (os: OrdemServico) => {
    if (os.status === "FINALIZADA" || os.status === "CANCELADA") return "—";
    const dateBase = os.data_abertura || os.created_at;
    if (!dateBase) return "—";
    const start = new Date(dateBase);
    const today = new Date();
    start.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diff = today.getTime() - start.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days <= 0 ? "Hoje" : `${days} d`;
  };

  // Filter & Search O.S. list
  const filteredOrdens = ordens.filter(o => {
    // 1. Status Filter
    if (selectedStatus !== "TODAS" && o.status !== selectedStatus) return false;

    // 2. Tech Filter
    if (selectedTech) {
      if (String(o.tecnico_id) !== selectedTech && String(o.auxiliar_id) !== selectedTech) return false;
    }

    // 3. Search query filter
    const q = searchTerm.toLowerCase();
    const clientName = o.clientes?.razao_social || "";
    const equipName = o.implementos?.modelo || "";
    const serieName = o.implementos?.numero_serie || "";

    return (
      o.numero_os.toLowerCase().includes(q) ||
      clientName.toLowerCase().includes(q) ||
      equipName.toLowerCase().includes(q) ||
      serieName.toLowerCase().includes(q) ||
      (o.tipo_atendimento || "").toLowerCase().includes(q)
    );
  });

  const getDaysOpen = (os: OrdemServico) => {
    if (os.status === "FINALIZADA" || os.status === "CANCELADA") return -1;
    const dateBase = os.data_abertura || os.created_at;
    if (!dateBase) return -1;
    const start = new Date(dateBase);
    const today = new Date();
    start.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diff = today.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const sortedOrdens = [...filteredOrdens].sort((a, b) => {
    let valA: any = a[sortField as keyof OrdemServico];
    let valB: any = b[sortField as keyof OrdemServico];

    if (sortField === "cliente") {
      valA = a.clientes?.razao_social || "";
      valB = b.clientes?.razao_social || "";
    } else if (sortField === "equipamento") {
      valA = a.implementos?.modelo || "";
      valB = b.implementos?.modelo || "";
    } else if (sortField === "cidade") {
      valA = a.clientes?.cidade || "";
      valB = b.clientes?.cidade || "";
    } else if (sortField === "tecnico") {
      const techA = tecnicos.find(t => t.id === a.tecnico_id);
      const techB = tecnicos.find(t => t.id === b.tecnico_id);
      valA = techA?.apelido || techA?.nome || "";
      valB = techB?.apelido || techB?.nome || "";
    } else if (sortField === "dias_abertos") {
      valA = getDaysOpen(a);
      valB = getDaysOpen(b);
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

  const totalPages = Math.ceil(sortedOrdens.length / itemsPerPage) || 1;
  const pageIndex = Math.min(currentPage, totalPages);
  const startIdx = (pageIndex - 1) * itemsPerPage;
  const paginatedOrdens = sortedOrdens.slice(startIdx, startIdx + itemsPerPage);

  const selectedClientInfo = getSelectedClientInfo();


  return (
    <div className="space-y-6">
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

      {!isFormOpen ? (
        // List O.S. View
        <div className="space-y-6">
          {/* Header title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">
                Ordens de Serviço
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Controle, acompanhamento técnico e faturamento de ordens de serviço.
              </p>
            </div>

            <button
              onClick={() => openForm(null)}
              className="btn bg-brand-red text-white hover:bg-brand-red-dark border-none shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nova O.S.
            </button>
          </div>

          {/* O.S. status chips filter */}
          <div className="flex flex-wrap gap-2">
            {["TODAS", "ABERTA", "EM ATENDIMENTO", "AGENDADA", "AGUARDANDO", "FINALIZADA", "CANCELADA"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setSelectedStatus(st);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  selectedStatus === st
                    ? "bg-brand-ink text-white"
                    : "bg-white text-gray-400 border border-gray-200 hover:text-gray-700"
                }`}
              >
                {st === "AGUARDANDO" ? "AGUARDANDO FINALIZAÇÃO" : st}
              </button>
            ))}
          </div>

          {/* Search bar & filters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Pesquisar por O.S., cliente, modelo de máquina, série..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg w-full text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedTech}
                  onChange={(e) => {
                    setSelectedTech(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-600 focus:border-brand-red focus:bg-white"
                >
                  <option value="">Filtrar Técnico...</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.apelido || t.nome}</option>
                  ))}
                </select>

                <button
                  onClick={async () => {
                    setIsLoading(true);
                    await onRefresh();
                    setIsLoading(false);
                    showToast("Lista atualizada!", "info");
                  }}
                  className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List representation */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-[10px] font-bold text-gray-400 uppercase tracking-wider select-none">
                    <th className="p-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("numero_os")}>
                      <div className="flex items-center justify-center gap-1">
                        Nº O.S.
                        {sortField === "numero_os" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("status")}>
                      <div className="flex items-center gap-1">
                        Status
                        {sortField === "status" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("cliente")}>
                      <div className="flex items-center gap-1">
                        Cliente
                        {sortField === "cliente" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("equipamento")}>
                      <div className="flex items-center gap-1">
                        Equipamento / Série
                        {sortField === "equipamento" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("cidade")}>
                      <div className="flex items-center gap-1">
                        Cidade
                        {sortField === "cidade" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("tecnico")}>
                      <div className="flex items-center justify-center gap-1">
                        Técnico Principal
                        {sortField === "tecnico" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => toggleSort("dias_abertos")}>
                      <div className="flex items-center justify-center gap-1">
                        Dias Abertos
                        {sortField === "dias_abertos" && (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-brand-red shrink-0" /> : <ArrowDown className="w-3 h-3 text-brand-red shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 text-right w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {paginatedOrdens.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        Nenhuma Ordem de Serviço encontrada.
                      </td>
                    </tr>
                  ) : (
                    paginatedOrdens.map((os) => {
                      const statusColors: Record<string, string> = {
                        ABERTA: "bg-amber-100 text-amber-800 border-amber-200",
                        "EM ATENDIMENTO": "bg-blue-100 text-blue-800 border-blue-200",
                        AGENDADA: "bg-orange-100 text-orange-800 border-orange-200",
                        AGUARDANDO: "bg-purple-100 text-purple-800 border-purple-200",
                        FINALIZADA: "bg-emerald-100 text-emerald-800 border-emerald-200",
                        CANCELADA: "bg-rose-100 text-rose-800 border-rose-200"
                      };

                      const mainTech = tecnicos.find(t => t.id === os.tecnico_id);

                      return (
                        <tr key={os.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 text-center font-bold text-gray-800">{os.numero_os}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase ${statusColors[os.status]}`}>
                              {os.status === "AGUARDANDO" ? "AGUARDANDO FINALIZAÇÃO" : os.status}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-brand-ink">
                            {os.clientes?.codigo_sankhya ? (
                              <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-1.5 font-extrabold">
                                {os.clientes.codigo_sankhya}
                              </span>
                            ) : null}
                            {os.clientes?.razao_social || "Cliente Indefinido"}
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-brand-ink">{os.implementos?.modelo || "Modelo Indefinido"}</span>
                            {os.implementos && (
                              <div className="text-[10px] text-gray-400 font-mono">Série: {os.implementos.numero_serie}</div>
                            )}
                          </td>
                          <td className="p-4 text-gray-600">
                            {os.clientes?.cidade || "—"} / {os.clientes?.uf || "—"}
                          </td>
                          <td className="p-4 text-center font-semibold text-gray-700">
                            {mainTech?.apelido || mainTech?.nome || "Não Definido"}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              os.status === "FINALIZADA" || os.status === "CANCELADA"
                                ? "bg-gray-100 text-gray-400"
                                : "bg-rose-50 text-rose-700 font-semibold"
                            }`}>
                              {getElapsedDays(os)}
                            </span>
                          </td>
                          <td className="p-4 text-right flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setPrintPreviewOS(os)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer uppercase"
                              title="Imprimir Ordem de Serviço"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Imprimir
                            </button>
                            <button
                              onClick={() => openForm(os)}
                              className="bg-brand-red hover:bg-brand-red-dark text-white font-bold text-[10px] py-1.5 px-3 rounded-lg shadow-sm transition-all uppercase"
                              title="Gerenciar O.S."
                            >
                              Abrir
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4 text-xs text-gray-500 bg-gray-50/50">
              <div>
                Mostrando <span className="font-semibold">{paginatedOrdens.length}</span> de{" "}
                <span className="font-semibold">{filteredOrdens.length}</span> registros.
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1}
                  className="p-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
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
                  className="p-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Highly Polished Multi-Tab Form view
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 shadow-sm flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
                title="Voltar para a lista de Ordens de Serviço"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-gray-800">
                    Ordem de Serviço
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                    status === "FINALIZADA" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-800 border-amber-200"
                  }`}>
                    {status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Formulário integrado de serviços em campo.</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide">Código</span>
              <strong className="font-display text-2xl font-extrabold text-gray-800">
                {(currentOS?.numero_os === "EMPTY" || !currentOS?.numero_os) ? "NOVA" : currentOS.numero_os}
              </strong>
            </div>
          </div>

          {/* Nav Tabs block */}
          <div className="flex border-b border-gray-200 bg-white rounded-t-lg overflow-hidden border-t border-x scrollbar-thin">
            {[
              { id: "dados", label: "Dados da O.S." },
              { id: "atendimento", label: "Atendimento" },
              { id: "apontamentos", label: "Apontamento de Horas" },
              { id: "pecas", label: "Peças / Insumos" },
              { id: "despesas", label: "Lançar Deslocamento (KM)" },
              { id: "encerramento", label: "Fechamento da O.S." }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as OSTabType);
                }}
                className={`flex-1 text-center py-3 text-[11px] font-extrabold uppercase tracking-wide border-b-2 transition-all ${
                  activeTab === tab.id 
                    ? "border-brand-red text-brand-ink bg-gray-50" 
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab contents */}
          <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-6 shadow-sm min-h-[350px]">
            {activeTab === "dados" && (
              <div className="space-y-6 text-xs">
                {/* Proprietary Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Cliente e Chassi
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2 relative">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Cliente *</label>
                      <div className="relative">
                        <button
                          type="button"
                          disabled={status === "FINALIZADA" || status === "CANCELADA"}
                          onClick={() => {
                            setClienteDropdownOpen(!clienteDropdownOpen);
                            setClienteSearch("");
                          }}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red text-left flex justify-between items-center disabled:opacity-50 min-h-[30px]"
                        >
                          <span className="truncate">
                            {clienteId ? (
                              (() => {
                                const c = clientes.find(item => String(item.id) === clienteId);
                                return c 
                                  ? `${c.codigo_sankhya ? `[${c.codigo_sankhya}] ` : ""}${c.razao_social} (${c.cidade} - ${c.uf || ""})`
                                  : "Selecione o cliente proprietário..."
                              })()
                            ) : (
                              "Selecione o cliente proprietário..."
                            )}
                          </span>
                          <span className="text-gray-400 text-[10px] ml-1">▼</span>
                        </button>

                        {clienteDropdownOpen && (
                          <>
                            {/* Backdrop to catch clicks outside the dropdown */}
                            <div 
                              className="fixed inset-0 z-40 cursor-default" 
                              onClick={() => setClienteDropdownOpen(false)}
                            />
                            
                            {/* Dropdown container */}
                            <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-64 flex flex-col overflow-hidden">
                              {/* Search input field */}
                              <div className="p-2 border-b border-gray-100 bg-gray-50">
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Digite nome, código ou cidade para buscar..."
                                  value={clienteSearch}
                                  onChange={(e) => setClienteSearch(e.target.value)}
                                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs outline-none focus:border-brand-red bg-white font-medium"
                                />
                              </div>
                              
                              {/* Option items list */}
                              <div className="overflow-y-auto max-h-48 text-xs divide-y divide-gray-100">
                                {(() => {
                                  const cleanSearch = (clienteSearch || "")
                                    .toLowerCase()
                                    .normalize("NFD")
                                    .replace(/[\u0300-\u036f]/g, "");
                                  
                                  const filtered = clientes.filter(c => {
                                    const name = (c.razao_social || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                    const city = (c.cidade || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                    const code = String(c.codigo_sankhya || "").toLowerCase();
                                    return name.includes(cleanSearch) || city.includes(cleanSearch) || code.includes(cleanSearch);
                                  });

                                  if (filtered.length === 0) {
                                    return <div className="p-3 text-center text-gray-400">Nenhum cliente encontrado</div>;
                                  }

                                  return filtered.map(c => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        setClienteId(String(c.id));
                                        setImplementoId("");
                                        setClienteDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 hover:bg-red-50/50 hover:text-brand-ink transition-colors flex flex-col ${
                                        clienteId === String(c.id) ? "bg-red-50 text-brand-red font-bold" : ""
                                      }`}
                                    >
                                      <span className="font-semibold text-gray-800">
                                        {c.codigo_sankhya ? (
                                          <span className="text-brand-red font-mono font-extrabold mr-1.5 bg-red-50 border border-red-100 px-1 py-0.5 rounded text-[10px]">
                                            {c.codigo_sankhya}
                                          </span>
                                        ) : null}
                                        {c.razao_social}
                                      </span>
                                      <span className="text-[10px] text-gray-400 mt-0.5 font-medium">{c.cidade} - {c.uf} {c.cpf_cnpj ? `| CNPJ: ${c.cpf_cnpj}` : ""}</span>
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Cidade proprietária</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedClientInfo.cidade}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-100 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">UF</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedClientInfo.uf}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-100 text-gray-600 w-12"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Equipamento *</label>
                      <select
                        required
                        value={implementoId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setImplementoId(val);
                          if (val) {
                            const lastH = getUltimoHorimetroApontado(Number(val));
                            setHorimetroFinal(lastH);
                            const selectedImp = implementos.find(i => String(i.id) === String(val));
                            if (selectedImp && selectedImp.localizacao && selectedImp.localizacao.toUpperCase() !== "EMPTY") {
                              setLocalizacaoMaquina(selectedImp.localizacao);
                            } else {
                              setLocalizacaoMaquina("");
                            }
                          } else {
                            setHorimetroFinal("");
                          }
                        }}
                        disabled={!clienteId || status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                      >
                        <option value="">Selecione a máquina...</option>
                        {getFilteredImplementos().map(i => (
                          <option key={i.id} value={i.id}>{i.fabricante} — {i.modelo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nº de Série</label>
                      <input
                        type="text"
                        readOnly
                        value={implementos.find(i => i.id === Number(implementoId))?.numero_serie || "—"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-100 text-gray-600 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-brand-red" /> Localização / Fazenda da Máquina
                    </label>
                    <input
                      type="text"
                      value={localizacaoMaquina}
                      onChange={(e) => setLocalizacaoMaquina(e.target.value)}
                      placeholder="Ex: Fazenda Santa Maria - Gleba 2, Ariquemes - RO"
                      disabled={status === "FINALIZADA" || status === "CANCELADA"}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                    />
                  </div>
                </div>

                {/* Service Metadata */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5" /> Detalhes da Solicitação
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Tipo de Atendimento *</label>
                      <select
                        value={tipoAtendimento}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTipoAtendimento(val);
                        }}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                      >
                        <option value="">Selecione...</option>
                        {tiposAtendimentoList.length > 0 ? (
                          <>
                            {tiposAtendimentoList
                              .filter((t) => !t.nome.toUpperCase().includes("(GERAL)") && !t.nome.toUpperCase().includes("GERAL"))
                              .map((t) => (
                                <option key={t.id} value={t.nome}>{t.nome}</option>
                              ))}
                            {tipoAtendimento && !tipoAtendimento.toUpperCase().includes("(GERAL)") && !tipoAtendimento.toUpperCase().includes("GERAL") && !tiposAtendimentoList.some(t => t.nome === tipoAtendimento) && (
                              <option value={tipoAtendimento}>{tipoAtendimento}</option>
                            )}
                          </>
                        ) : (
                          <>
                            <option>GARANTIA</option>
                            <option>ASSISTÊNCIA TÉCNICA</option>
                            <option>REVISÃO PREVENTIVA</option>
                            <option>ENTREGA TÉCNICA</option>
                            <option>MONTAGEM</option>
                            <option>TREINAMENTO</option>
                            <option>OUTRO</option>
                            {tipoAtendimento && !["GARANTIA", "ASSISTÊNCIA TÉCNICA", "REVISÃO PREVENTIVA", "ENTREGA TÉCNICA", "MONTAGEM", "TREINAMENTO", "OUTRO"].includes(tipoAtendimento) && (
                              <option value={tipoAtendimento}>{tipoAtendimento}</option>
                            )}
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Prioridade da Demanda</label>
                      <select
                        value={prioridade}
                        onChange={(e) => setPrioridade(e.target.value as "NORMAL" | "ALTA" | "URGENTE")}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="ALTA">ALTA</option>
                        <option value="URGENTE">URGENTE</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Solicitante</label>
                      <input
                        type="text"
                        value={solicitante}
                        onChange={(e) => setSolicitante(e.target.value)}
                        placeholder="Ex: Gerente da Fazenda"
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Status O.S.</label>
                      <select
                        value={status}
                        onChange={(e) => {
                          setStatus(e.target.value as OrdemServico["status"]);
                          setIsManualStatus(true);
                        }}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red font-bold"
                      >
                        <option value="ABERTA">ABERTA</option>
                        <option value="EM ATENDIMENTO">EM ATENDIMENTO</option>
                        <option value="AGENDADA">AGENDADA</option>
                        <option value="AGUARDANDO">AGUARDANDO FINALIZAÇÃO</option>
                        <option value="FINALIZADA">FINALIZADA</option>
                        <option value="CANCELADA">CANCELADA</option>
                      </select>
                    </div>
                  </div>



                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Reclamação ou Serviço Solicitado *</label>
                    <textarea
                      required
                      value={reclamacao}
                      onChange={(e) => setReclamacao(e.target.value)}
                      rows={4}
                      disabled={status === "FINALIZADA" || status === "CANCELADA"}
                      placeholder="Descreva detalhadamente o problema relatado pelo cliente ou as especificações do plano preventivo solicitados..."
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red min-h-[90px]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Observações Internas</label>
                    <textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      rows={2}
                      disabled={status === "FINALIZADA" || status === "CANCELADA"}
                      placeholder="Observações complementares internas de faturamento..."
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red min-h-[50px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "atendimento" && (
              <div className="space-y-6 text-xs animate-fade">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Agenda e Técnicos Vinculados
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Início do Atendimento</label>
                      <input
                        type="date"
                        value={dataAtendimento}
                        onChange={(e) => setDataAtendimento(e.target.value)}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Término do Atendimento</label>
                      <input
                        type="date"
                        value={dataTermino}
                        onChange={(e) => setDataTermino(e.target.value)}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Hora Inicial</label>
                      <input
                        type="time"
                        value={horaInicial}
                        onChange={(e) => setHoraInicial(e.target.value)}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Hora Final</label>
                      <input
                        type="time"
                        value={horaFinal}
                        onChange={(e) => setHoraFinal(e.target.value)}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Técnico Principal Responsável *</label>
                      <select
                        value={tecnicoId}
                        onChange={(e) => setTecnicoId(e.target.value)}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                      >
                        <option value="">Selecione o técnico principal...</option>
                        {tecnicos.map(t => (
                          <option key={t.id} value={t.id}>{t.apelido || t.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Técnico Auxiliar</label>
                      <select
                        value={auxiliarId}
                        onChange={(e) => setAuxiliarId(e.target.value)}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                      >
                        <option value="">Nenhum técnico auxiliar...</option>
                        {tecnicos.map(t => (
                          <option key={t.id} value={t.id}>{t.apelido || t.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. REVISION & HOROMETER */}
                <div className="space-y-4 border-b border-gray-150 pb-5">
                  <h3 className="text-xs font-bold uppercase text-brand-red tracking-wider flex items-center gap-1">
                    <Tractor className="w-3.5 h-3.5" /> Horímetro e Revisão
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Horímetro Final da Máquina (horas)</label>
                      <input
                        type="number"
                        min={0}
                        value={horimetroFinal}
                        onChange={(e) => setHorimetroFinal(e.target.value ? Number(e.target.value) : "")}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        placeholder="Opcional se a máquina não possuir horímetro..."
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white font-mono"
                      />
                      <span className="text-[9px] text-gray-400 mt-1 block">Deixe em branco se a máquina não possuir horímetro.</span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Revisão Realizada (Plano Preventivo)</label>
                      {(() => {
                        const selectedImplementoObj = implementos.find(i => i.id === Number(implementoId));
                        const planRevisions = selectedImplementoObj?.plano_id 
                          ? API.planos.revisoes.listar(selectedImplementoObj.plano_id) 
                          : [];

                        if (planRevisions.length > 0) {
                          const isKnownRevision = planRevisions.some(r => `${r.horas_limite}H` === revisaoExecutada || r.descricao === revisaoExecutada);
                          const isCustomSelected = revisaoExecutada && !isKnownRevision;

                          return (
                            <div className="space-y-1.5">
                              <select
                                value={isCustomSelected ? "custom" : revisaoExecutada}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "custom") {
                                    setRevisaoExecutada("PERSONALIZADA");
                                  } else {
                                    setRevisaoExecutada(val);
                                  }
                                }}
                                disabled={status === "FINALIZADA" || status === "CANCELADA"}
                                className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red font-bold"
                              >
                                <option value="">Sem revisão associada</option>
                                {planRevisions.map(rev => (
                                  <option key={rev.id_revisao} value={`${rev.horas_limite}H`}>
                                    Revisão de {rev.horas_limite}H — {rev.descricao}
                                  </option>
                                ))}
                                <option value="custom">Outro / Digitar personalizado...</option>
                              </select>
                              
                              {(isCustomSelected || revisaoExecutada === "PERSONALIZADA") && (
                                <input
                                  type="text"
                                  value={revisaoExecutada === "PERSONALIZADA" ? "" : revisaoExecutada}
                                  onChange={(e) => setRevisaoExecutada(e.target.value)}
                                  disabled={status === "FINALIZADA" || status === "CANCELADA"}
                                  placeholder="Digite a revisão realizada manualmente..."
                                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white focus:border-brand-red mt-1"
                                />
                              )}
                            </div>
                          );
                        }

                        return (
                          <input
                            type="text"
                            value={revisaoExecutada}
                            onChange={(e) => setRevisaoExecutada(e.target.value)}
                            disabled={status === "FINALIZADA" || status === "CANCELADA"}
                            placeholder="Ex: 250H, 500H..."
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white"
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "apontamentos" && (
              <div className="space-y-6 text-xs animate-fade">
                {/* 1. SERVICE EXECUTION REPORT (LAUDO) */}
                <div className="space-y-4 border-b border-gray-150 pb-5">
                  <h3 className="text-xs font-bold uppercase text-brand-red tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Campo de Execução do Serviço (Laudo de Campo)
                  </h3>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">O que foi realizado / Serviço Executado</label>
                    <textarea
                      value={servicoExecutado}
                      onChange={(e) => setServicoExecutado(e.target.value)}
                      rows={4}
                      disabled={status === "FINALIZADA" || status === "CANCELADA"}
                      placeholder="Descreva de forma pormenorizada as revisões concluídas, peças substituídas de forma preventiva e o laudo de funcionamento do implemento agrícola..."
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white min-h-[100px]"
                    />
                  </div>
                </div>

                {/* 3. NEW APPOINTMENT GRID */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1 flex items-center gap-1" id="novo-apontamento-section">
                    <Clock className="w-3.5 h-3.5" /> {editingApontId ? "Editar Registro de Horas" : "Novo Registro de Horas (Apontamento)"}
                  </h3>

                  {status !== "FINALIZADA" && status !== "CANCELADA" ? (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-150 space-y-3">
                      {/* Technicians summary */}
                      <div className="bg-white border border-gray-200 rounded p-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Técnicos do Atendimento:</span>
                        <div className="flex gap-2">
                          <span className="bg-brand-red/10 text-brand-red font-bold px-2 py-0.5 rounded text-[10px]">
                            Principal: {tecnicos.find(t => t.id === Number(tecnicoId))?.apelido || tecnicos.find(t => t.id === Number(tecnicoId))?.nome || "Não selecionado"}
                          </span>
                          {auxiliarId && (
                            <span className="bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded text-[10px]">
                              Auxiliar: {tecnicos.find(t => t.id === Number(auxiliarId))?.apelido || tecnicos.find(t => t.id === Number(auxiliarId))?.nome}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Data do Serviço</label>
                          <input
                            type="date"
                            value={newApontData}
                            onChange={(e) => setNewApontData(e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Hora Início</label>
                          <input
                            type="time"
                            value={newApontHoraIn}
                            onChange={(e) => setNewApontHoraIn(e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Hora Fim</label>
                          <input
                            type="time"
                            value={newApontHoraFim}
                            onChange={(e) => setNewApontHoraFim(e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white"
                          />
                        </div>
                        
                        <div className="sm:col-span-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                          <div className="sm:col-span-3">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Descrição da Atividade</label>
                            <input
                              type="text"
                              value={newApontDesc}
                              onChange={(e) => setNewApontDesc(e.target.value)}
                              placeholder="Ex: Regulagem de torque e lubrificação preventiva..."
                              className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs bg-white"
                            />
                          </div>
                          <div className="flex gap-2 w-full">
                            <button
                              type="button"
                              onClick={handleAddApontamento}
                              className={`btn ${editingApontId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-brand-red hover:bg-brand-red-dark'} text-white text-[11px] font-bold py-1.5 shadow border-none flex-1`}
                            >
                              {editingApontId ? "Atualizar Horas" : "Lançar Horas"}
                            </button>
                            {editingApontId && (
                              <button
                                type="button"
                                onClick={handleCancelEditApontamento}
                                className="btn bg-gray-200 hover:bg-gray-300 text-gray-700 text-[11px] font-bold py-1.5 shadow border-none px-4"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] text-gray-400 block mt-1">Este lançamento registrará as horas simultaneamente para o técnico principal e auxiliar (se houver).</span>
                    </div>
                  ) : (
                    <div className="bg-amber-50 text-amber-800 p-3 rounded border border-amber-200">
                      O.S. finalizada ou cancelada. Não é possível lançar novos apontamentos.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1">Horas Apontadas</h3>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                        <th className="p-2">Técnico</th>
                        <th className="p-2">Data</th>
                        <th className="p-2">Hora Inicial</th>
                        <th className="p-2">Hora Final</th>
                        <th className="p-2 text-center">Horas Líquidas</th>
                        <th className="p-2">Descrição das Atividades</th>
                        <th className="p-2 text-right w-16">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {apontamentos.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-gray-400">Nenhum apontamento lançado para esta O.S.</td>
                        </tr>
                      ) : (
                        apontamentos.map(a => (
                          <tr key={a.id}>
                            <td className="p-2 font-bold text-brand-red uppercase text-[10px]">
                              {a.tecnicos?.apelido || a.tecnicos?.nome || "—"}
                            </td>
                            <td className="p-2">
                              {a.data_servico ? (() => {
                                const [y, m, d] = a.data_servico.split("-");
                                return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("pt-BR");
                              })() : "—"}
                            </td>
                            <td className="p-2 font-mono">{a.hora_inicial}</td>
                            <td className="p-2 font-mono">{a.hora_final}</td>
                            <td className="p-2 text-center font-bold text-brand-red font-mono">{a.horas_trabalhadas} h</td>
                            <td className="p-2 max-w-[200px] truncate text-gray-500">{a.descricao_servico}</td>
                            <td className="p-2 text-right">
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  disabled={status === "FINALIZADA" || status === "CANCELADA" || isLoading}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditApontamento(a);
                                  }}
                                  className="p-2 hover:bg-blue-100 text-blue-600 rounded-full transition-colors disabled:opacity-30"
                                  title="Editar apontamento"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={status === "FINALIZADA" || status === "CANCELADA" || isLoading}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (a.id) handleDeleteApontamento(a.id);
                                  }}
                                  className="p-2 hover:bg-rose-100 text-rose-600 rounded-full transition-colors disabled:opacity-30"
                                  title="Excluir apontamento"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Summary Footer */}
                  <div className="bg-gray-50 p-3 rounded border border-gray-150 flex flex-wrap justify-between items-center text-xs gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-500 uppercase tracking-wide">Total de Horas:</span>
                      <strong className="font-mono text-base text-brand-red font-extrabold">{calcularTotalHorasTrabalhadas().toFixed(2)} horas</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-500 uppercase tracking-wide">Total Mão de Obra Realizado:</span>
                      <strong className="font-mono text-base text-brand-red font-extrabold">
                        {(calcularTotalHorasTrabalhadas() * Number(valorHoraUnitario)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pecas" && (
              <div className="space-y-6 text-xs animate-fade">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-1.5 gap-2">
                    <h3 className="text-xs font-bold uppercase text-brand-red tracking-wider flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5" /> Incluir Peças Substituídas
                    </h3>
                    {status !== "FINALIZADA" && status !== "CANCELADA" && (
                      <button
                        type="button"
                        onClick={() => setIsXmlImportOpen(!isXmlImportOpen)}
                        className={`btn text-[10px] py-1 px-3 flex items-center gap-1 transition-all ${
                          isXmlImportOpen ? "bg-amber-600 text-white" : "bg-brand-ink text-white hover:bg-gray-800"
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        {isXmlImportOpen ? "Fechar Importador" : "Importar de XML (NF-e de Compra)"}
                      </button>
                    )}
                  </div>

                  {/* XML Import Card/Panel */}
                  {isXmlImportOpen && (
                    <div className="bg-gray-50 border border-brand-ink/20 rounded-xl p-4 space-y-4 animate-fade">
                      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="font-bold text-gray-700 flex items-center gap-1.5 text-xs">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          Importador de Nota Fiscal de Peças (NF-e XML)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsXmlImportOpen(false);
                            setXmlContent("");
                            setParsedNfeItems([]);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Column 1: Paste XML or upload file */}
                        <div className="space-y-3">
                          <p className="text-gray-500 text-[11px] leading-relaxed">
                            Arraste o arquivo XML da NF-e das peças, faça upload do arquivo ou selecione uma simulação para testar a importação direta de itens no sistema.
                          </p>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition hover:border-emerald-500 bg-white">
                              <Upload className="w-5 h-5 text-gray-400 mb-1" />
                              <span className="text-[10px] font-bold text-gray-500">SELECIONAR XML</span>
                              <input
                                type="file"
                                accept=".xml"
                                onChange={handleFileUpload}
                                className="hidden"
                              />
                            </label>

                            <div className="flex flex-col gap-1.5 justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setXmlContent(baldansXmlPreset);
                                  processXml(baldansXmlPreset);
                                }}
                                className="btn bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-[10px] font-semibold py-1.5 px-3 rounded text-left shadow-sm shrink-0"
                              >
                                ⚡ Exemplo Baldan (R$ 1.840,00)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setXmlContent(johnDeereXmlPreset);
                                  processXml(johnDeereXmlPreset);
                                }}
                                className="btn bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-[10px] font-semibold py-1.5 px-3 rounded text-left shadow-sm shrink-0"
                              >
                                ⚡ Exemplo John Deere (R$ 855,00)
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Conteúdo XML da Nota Fiscal</label>
                            <textarea
                              rows={3}
                              value={xmlContent}
                              onChange={(e) => setXmlContent(e.target.value)}
                              placeholder="Cole o código XML da nota fiscal aqui se preferir..."
                              className="w-full border border-gray-200 rounded p-2 text-[10px] font-mono bg-white resize-none"
                            />
                            {xmlContent && !parsedNfeItems.length && (
                              <button
                                type="button"
                                onClick={() => processXml(xmlContent)}
                                className="mt-1 w-full btn bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] py-1 shadow"
                              >
                                Processar Código XML
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Column 2: Extracted Preview List */}
                        <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-3">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block border-b pb-1">
                            Pré-visualização dos Dados Extraídos
                          </span>

                          {parsedNfeItems.length > 0 ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2 text-[10px] bg-gray-50 p-2 rounded border">
                                <div>
                                  <strong className="text-gray-400 block uppercase">Nº Nota Fiscal:</strong>
                                  <span className="font-bold text-gray-700">{parsedNfeNumber || "—"}</span>
                                </div>
                                <div>
                                  <strong className="text-gray-400 block uppercase">Fornecedor:</strong>
                                  <span className="font-bold text-gray-700 truncate block" title={parsedNfeEmit}>{parsedNfeEmit || "—"}</span>
                                </div>
                                <div className="col-span-2">
                                  <strong className="text-gray-400 block uppercase">Total da Nota:</strong>
                                  <span className="font-bold text-emerald-600 text-[11px] font-mono">
                                    {parsedNfeTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </span>
                                </div>
                              </div>

                              <div className="max-h-[120px] overflow-y-auto divide-y divide-gray-100 border rounded">
                                {parsedNfeItems.map((item, idx) => (
                                  <div key={item.id} className="flex items-center gap-2 p-1.5 text-[11px] hover:bg-gray-50">
                                    <input
                                      type="checkbox"
                                      checked={item.selected}
                                      onChange={(e) => {
                                        const copy = [...parsedNfeItems];
                                        copy[idx].selected = e.target.checked;
                                        setParsedNfeItems(copy);
                                      }}
                                      className="rounded text-emerald-600"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-gray-800 truncate text-[10px]" title={item.descricao}>{item.descricao}</div>
                                      <div className="text-[9px] text-gray-400 font-mono font-bold">Ref: {item.codigo}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-gray-700 font-mono text-[10px]">{item.quantidade}x</div>
                                      <div className="text-[9px] text-gray-500 font-mono">
                                        {item.valor_unitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={handleImportSelectedItems}
                                className="w-full btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 shadow flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Importar Peças Selecionadas ({parsedNfeItems.filter(i => i.selected).length})
                              </button>
                            </div>
                          ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-center text-gray-400 p-4 border border-dashed rounded">
                              <FileSpreadsheet className="w-8 h-8 text-gray-300 mb-2" />
                              <span className="text-[10px] leading-relaxed text-gray-400">Nenhum arquivo processado ainda.<br />Selecione um XML ou use um exemplo rápido ao lado para carregar os dados.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {status !== "FINALIZADA" && status !== "CANCELADA" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end bg-gray-50 p-4 rounded-lg border border-gray-150">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Cód. Peça / Part Number</label>
                        <input
                          type="text"
                          value={newPecaCod}
                          onChange={(e) => setNewPecaCod(e.target.value)}
                          placeholder="Ex: JD-L2304"
                          className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Descrição da Peça / Filtro / Óleo *</label>
                        <input
                          type="text"
                          value={newPecaDesc}
                          onChange={(e) => setNewPecaDesc(e.target.value)}
                          placeholder="Ex: FILTRO DE ÓLEO DIESEL TRATOR 8370R"
                          className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Quantidade</label>
                        <input
                          type="number"
                          min={1}
                          value={newPecaQtde}
                          onChange={(e) => setNewPecaQtde(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Valor Unitário (R$)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={newPecaValor}
                          onChange={(e) => setNewPecaValor(Number(e.target.value))}
                          placeholder="Ex: 85.00"
                          className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-5 flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddPeca}
                          className="btn bg-brand-red hover:bg-brand-red-dark text-white text-[11px] font-bold py-1.5 shadow border-none"
                        >
                          Adicionar Peça
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 text-amber-800 p-3 rounded border border-amber-200">
                      O.S. finalizada ou cancelada. Não é possível alterar a lista de peças.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1">Peças e Insumos Substituídos</h3>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                        <th className="p-2">Cód. Peça</th>
                        <th className="p-2">Descrição</th>
                        <th className="p-2 text-center">Quantidade</th>
                        <th className="p-2 text-right">Valor Unitário</th>
                        <th className="p-2 text-right">Valor Total</th>
                        <th className="p-2 text-right w-16">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pecas.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-gray-400">Nenhuma peça inserida neste orçamento/atendimento.</td>
                        </tr>
                      ) : (
                        pecas.map(p => (
                          <tr key={p.id}>
                                <td className="p-2">
                                  <div className="font-mono text-gray-700 font-bold">{p.codigo}</div>
                                  {notaFiscal && (
                                    <div className="text-[9px] text-gray-400 font-medium">NF: {notaFiscal}</div>
                                  )}
                                </td>
                            <td className="p-2 font-bold text-gray-700">{p.descricao}</td>
                            <td className="p-2 text-center font-mono">{p.quantidade}</td>
                            <td className="p-2 text-right font-mono">{p.valor_unitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                            <td className="p-2 text-right font-semibold font-mono text-gray-800">{(p.quantidade * p.valor_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                disabled={status === "FINALIZADA" || status === "CANCELADA"}
                                onClick={() => handleDeletePeca(p.id)}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded disabled:opacity-30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Summary Footer */}
                  <div className="bg-gray-50 p-3 rounded border border-gray-150 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-500 uppercase tracking-wide">Subtotal de Peças / Insumos:</span>
                      <strong className="font-mono text-base text-brand-red font-extrabold">{calcularTotalPecas().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                    </div>
                    {notaFiscal && (
                      <div className="flex justify-between items-center text-[10px] border-t border-gray-200 pt-2">
                        <span className="font-bold text-gray-400 uppercase tracking-wide">Nº da Nota Fiscal (NF-e):</span>
                        <span className="font-mono font-bold text-gray-600">{notaFiscal}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "despesas" && (
              <div className="space-y-6 text-xs animate-fade">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Lançamento de Deslocamento e KM Rodado
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">KM Inicial do Deslocamento</label>
                      <input
                        type="number"
                        min={0}
                        value={kmInicial || ""}
                        onChange={(e) => setKmInicial(Number(e.target.value))}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        placeholder="Ex: 15430"
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white font-mono"
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">KM Final do Deslocamento</label>
                      <input
                        type="number"
                        min={0}
                        value={kmFinal || ""}
                        onChange={(e) => setKmFinal(Number(e.target.value))}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        placeholder="Ex: 15550"
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">KM Total Rodado</label>
                      <input
                        type="number"
                        min={0}
                        value={kmRodado || ""}
                        onChange={(e) => setKmRodado(Number(e.target.value))}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        placeholder="Ex: 120"
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white font-mono font-bold text-brand-red"
                      />
                      <span className="text-[9px] text-gray-400 mt-1 block">Subtração automática ou digite diretamente</span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Veículo Utilizado</label>
                      <select
                        value={veiculoUsado}
                        onChange={(e) => setVeiculoUsado(e.target.value)}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white"
                      >
                        <option value="">Selecione o veículo...</option>
                        {veiculosList.length > 0 ? (
                          veiculosList.map((v) => (
                            <option key={v.id} value={v.placa}>
                              {v.modelo} ({v.placa})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="HILUX">TOYOTA HILUX (FROTA 01)</option>
                            <option value="L200">MITSUBISHI L200 (FROTA 02)</option>
                            <option value="FIORINO">FIAT FIORINO (FROTA 03)</option>
                            <option value="SAVEIRO">VW SAVEIRO (FROTA 04)</option>
                            <option value="PROPRIO">VEÍCULO PRÓPRIO DO TÉCNICO</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Summary Footer for KM */}
                  <div className="bg-gray-50 p-3 rounded border border-gray-150 flex flex-wrap justify-between items-center text-xs gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-500 uppercase tracking-wide">Total KM Realizado:</span>
                      <strong className="font-mono text-base text-brand-red font-extrabold">{kmRodado} KM</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-500 uppercase tracking-wide">Custo Deslocamento Realizado:</span>
                      <strong className="font-mono text-base text-brand-red font-extrabold">
                        {(Number(kmRodado) * Number(valorKmUnitario)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "encerramento" && (
              <div className="space-y-6 text-xs animate-fade">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valores de Fechamento da O.S.
                  </h3>

                  {/* SEÇÃO 1: RESUMO DO QUE FOI REALIZADO (CALCULADO) */}
                  <div className="bg-[#f0f7ff] p-4 rounded-xl border border-blue-100 mb-6">
                    <h4 className="font-bold text-blue-800 uppercase text-[11px] tracking-widest pb-2 mb-4 flex items-center gap-2 border-b border-blue-200/50">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      VALORES REALIZADOS (BASEADO NOS APONTAMENTOS)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-blue-50 shadow-sm transition-all hover:shadow-md">
                        <span className="text-blue-500 font-bold block uppercase text-[10px] mb-2 tracking-tight">MÃO DE OBRA REALIZADA:</span>
                        <div className="flex justify-between items-end">
                          <strong className="text-2xl font-mono text-blue-900 leading-none">{calcularTotalHorasTrabalhadas().toFixed(2)} hrs</strong>
                          <span className="text-[11px] text-blue-400 font-bold mb-0.5">x R$ {Number(valorHoraUnitario).toFixed(2)}/h</span>
                        </div>
                        <div className="text-xs font-extrabold text-blue-700 mt-3 pt-2 border-t border-blue-50 flex justify-between">
                          <span>Total Realizado:</span>
                          <span>{(calcularTotalHorasTrabalhadas() * Number(valorHoraUnitario)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-50 shadow-sm transition-all hover:shadow-md">
                        <span className="text-blue-500 font-bold block uppercase text-[10px] mb-2 tracking-tight">DESLOCAMENTO REALIZADO:</span>
                        <div className="flex justify-between items-end">
                          <strong className="text-2xl font-mono text-blue-900 leading-none">{kmRodado} KM</strong>
                          <span className="text-[11px] text-blue-400 font-bold mb-0.5">x R$ {Number(valorKmUnitario).toFixed(2)}/km</span>
                        </div>
                        <div className="text-xs font-extrabold text-blue-700 mt-3 pt-2 border-t border-blue-50 flex justify-between">
                          <span>Total Realizado:</span>
                          <span>{(Number(kmRodado) * Number(valorKmUnitario)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-50 shadow-sm transition-all hover:shadow-md">
                        <span className="text-blue-500 font-bold block uppercase text-[10px] mb-2 tracking-tight">PEÇAS EM O.S.:</span>
                        <div className="text-2xl font-mono text-blue-900 font-bold leading-none">
                          {calcularTotalPecas().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </div>
                        <div className="text-[10px] text-blue-400 font-medium mt-3 pt-2 border-t border-blue-50 italic">
                          (Lançadas na aba de Peças / Insumos)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 2: CAMPOS PARA FATURAMENTO (COBRANÇA) */}
                    <div className={`p-4 rounded-xl border mb-6 transition-all duration-300 ${showInternalDebitMode ? 'bg-amber-50 border-amber-200 shadow-inner' : 'bg-[#f2fdf7] border-emerald-100'}`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b pb-2 mb-4 gap-2 border-current opacity-80">
                        <h4 className={`font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 ${showInternalDebitMode ? 'text-amber-800' : 'text-emerald-800'}`}>
                          <div className={`w-2 h-2 rounded-full ${showInternalDebitMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                          {showInternalDebitMode ? 'MODO: SERVIÇO DE DÉBITO INTERNO' : 'VALORES PARA FATURAMENTO (COBRANÇA FINAL)'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            if (!showInternalDebitMode) {
                              setShowInternalDebitMode(true);
                              setValorMaoObra(0);
                              setMaoObraManual(true);
                              setValorDeslocamento(0);
                              setDeslocamentoManual(true);
                              setOutrosCustos(0);
                              // Look for first valid rule from comissoes_config
                              let firstRule = "DÉBITO INTERNO";
                              try {
                                const savedConfig = localStorage.getItem("gst_comissoes_config");
                                if (savedConfig) {
                                  const parsed = JSON.parse(savedConfig);
                                  if (parsed.regrasAtendimento && parsed.regrasAtendimento.length > 0) {
                                    firstRule = parsed.regrasAtendimento[0].tipo;
                                  }
                                }
                              } catch(e) {}
                              setTipoAtendimento(firstRule);
                              showToast("Modo de Débito Interno ativado. Valores de faturamento zerados.", "info");
                            } else {
                              setShowInternalDebitMode(false);
                            }
                          }}
                          disabled={status === "FINALIZADA" || status === "CANCELADA"}
                          className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 border shadow-sm ${
                            showInternalDebitMode 
                              ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          {showInternalDebitMode ? (
                            <><X className="w-3 h-3" /> Débito Interno Ativo (Desativar)</>
                          ) : (
                            <><PlusCircle className="w-3 h-3" /> Ativar Débito Interno</>
                          )}
                        </button>
                      </div>

                      {showInternalDebitMode && (
                        <div className="bg-white/60 p-4 rounded-lg border border-amber-200 mb-6 animate-in slide-in-from-top-2 duration-300">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1.5">CLASSIFICAÇÃO DO ATENDIMENTO INTERNO</label>
                              <select
                                value={tipoAtendimento}
                                onChange={(e) => setTipoAtendimento(e.target.value)}
                                disabled={status === "FINALIZADA" || status === "CANCELADA"}
                                className="w-full border border-amber-200 focus:border-amber-500 rounded-lg px-3 py-2 text-sm bg-white font-bold text-amber-900 outline-none"
                              >
                                <option value="">Selecione o Tipo...</option>
                                {(() => {
                                  try {
                                    const savedConfig = localStorage.getItem("gst_comissoes_config");
                                    const options: React.ReactNode[] = [];
                                    let hasSavedValue = false;
                                    
                                    if (savedConfig) {
                                      const parsed = JSON.parse(savedConfig);
                                      if (parsed.regrasAtendimento && Array.isArray(parsed.regrasAtendimento)) {
                                        parsed.regrasAtendimento
                                          .filter((r: any) => !r.tipo.toUpperCase().includes("(GERAL)") && !r.tipo.toUpperCase().includes("GERAL"))
                                          .forEach((r: any, idx: number) => {
                                            if (r.tipo === tipoAtendimento) {
                                              hasSavedValue = true;
                                            }
                                            options.push(
                                              <option key={idx} value={r.tipo}>{r.tipo}</option>
                                            );
                                          });
                                      }
                                    }
                                    
                                    if (tipoAtendimento && !tipoAtendimento.toUpperCase().includes("(GERAL)") && !tipoAtendimento.toUpperCase().includes("GERAL") && !hasSavedValue) {
                                      options.push(
                                        <option key="saved-fallback" value={tipoAtendimento}>{tipoAtendimento}</option>
                                      );
                                    }
                                    
                                    return options;
                                  } catch (e) {
                                    console.error("Erro ao ler regras de atendimento:", e);
                                  }
                                  return null;
                                })()}
                              </select>
                              <p className="text-[9px] text-amber-600 mt-1 italic">
                                * Esta seleção define a regra de comissão do técnico para este serviço interno.
                              </p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1.5">VALOR TOTAL DO SERVIÇO (REFERÊNCIA)</label>
                              <div className="flex items-center gap-3">
                                {(() => {
                                  let calcValue = 0;
                                  let calcLabel = "Horas + KM Reduz.";
                                  try {
                                    const savedConfig = localStorage.getItem("gst_comissoes_config");
                                    if (savedConfig) {
                                      const parsed = JSON.parse(savedConfig);
                                      const matched = parsed.regrasAtendimento?.find((r: any) => r.tipo.toLowerCase().trim() === tipoAtendimento.toLowerCase().trim());
                                      const rule = matched || parsed.regraPadrao;
                                      
                                      if (rule) {
                                        if (rule.baseCalculo === "fixo") {
                                          calcValue = Number(rule.valorTecnico || 0) + (rule.relacaoAuxiliar === "desabilitado" ? 0 : Number(rule.valorAuxiliar || 0));
                                          calcLabel = "Taxa Fixa";
                                        } else {
                                          const hRate = Number(rule.valorHoraComissao ?? 50);
                                          const kRate = Number(rule.valorKmComissao ?? 1.50);
                                          calcValue = (calcularTotalHorasTrabalhadas() * hRate) + (Number(kmRodado) * kRate);
                                          calcLabel = `Horas + KM Reduz. (R$ ${hRate.toFixed(2)}/h e R$ ${kRate.toFixed(2)}/km)`;
                                        }
                                      } else {
                                        calcValue = (calcularTotalHorasTrabalhadas() * 50) + (Number(kmRodado) * 1.50);
                                        calcLabel = "Horas + KM Reduz. (R$ 50.00/h e R$ 1.50/km)";
                                      }
                                    } else {
                                      calcValue = (calcularTotalHorasTrabalhadas() * 50) + (Number(kmRodado) * 1.50);
                                      calcLabel = "Horas + KM Reduz. (R$ 50.00/h e R$ 1.50/km)";
                                    }
                                  } catch (e) {
                                    calcValue = (calcularTotalHorasTrabalhadas() * 50) + (Number(kmRodado) * 1.50);
                                    calcLabel = "Horas + KM Reduz. (R$ 50.00/h e R$ 1.50/km)";
                                  }

                                  return (
                                    <>
                                      <div className="flex-1 bg-amber-100/50 border border-amber-200 rounded-lg px-4 py-2 font-mono text-lg font-bold text-amber-900">
                                        {calcValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                      </div>
                                      <div className="text-[10px] text-amber-600 font-medium leading-tight">
                                        Cálculo base:<br/>{calcLabel}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-amber-100">
                            <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1.5">OBSERVAÇÃO / CENTRO DE CUSTO DO DÉBITO INTERNO</label>
                            <input
                              type="text"
                              list="centros-custo-datalist-global"
                              placeholder="Selecione um Centro de Custo cadastrado ou digite..."
                              value={observacaoDebito}
                              onChange={(e) => {
                                const val = e.target.value;
                                setObservacaoDebito(val);
                                if (centrosCustoOpcoes.includes(val)) {
                                  setCentroCustoDebito(val);
                                }
                              }}
                              disabled={status === "FINALIZADA" || status === "CANCELADA"}
                              className="w-full border border-amber-200 focus:border-amber-500 rounded-lg px-3 py-2 text-sm bg-white font-bold text-amber-900 outline-none placeholder-amber-400/60 shadow-sm"
                            />
                            <p className="text-[9px] text-amber-600 mt-1 italic">
                              * Clique duas vezes ou comece a digitar para selecionar um centro de custo cadastrado.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-6">
                        {/* FINANCEIRO ROW */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1.5">MÃO DE OBRA FATURADA (R$)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-sm">R$</span>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={valorMaoObra || ""}
                                onChange={(e) => {
                                  setValorMaoObra(Number(e.target.value));
                                  setMaoObraManual(true);
                                }}
                                disabled={status === "FINALIZADA" || status === "CANCELADA"}
                                className="w-full border-2 border-emerald-100 focus:border-emerald-500 rounded-lg pl-9 pr-3 py-2.5 text-lg bg-white font-mono font-bold text-emerald-800 outline-none transition-all shadow-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1.5">DESLOCAMENTO FATURADO (R$)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-sm">R$</span>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={valorDeslocamento || ""}
                                onChange={(e) => {
                                  setValorDeslocamento(Number(e.target.value));
                                  setDeslocamentoManual(true);
                                }}
                                disabled={status === "FINALIZADA" || status === "CANCELADA"}
                                className="w-full border-2 border-emerald-100 focus:border-emerald-500 rounded-lg pl-9 pr-3 py-2.5 text-lg bg-white font-mono font-bold text-emerald-800 outline-none transition-all shadow-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1.5">SERV. TERCEIROS / OUTROS (R$)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-sm">R$</span>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={outrosCustos || ""}
                                onChange={(e) => setOutrosCustos(Number(e.target.value))}
                                disabled={status === "FINALIZADA" || status === "CANCELADA"}
                                className="w-full border-2 border-emerald-100 focus:border-emerald-500 rounded-lg pl-9 pr-3 py-2.5 text-lg bg-white font-mono font-bold text-emerald-800 outline-none transition-all shadow-sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* DOCUMENT ROW */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-emerald-100/50">
                          <div>
                            <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1.5">Nº NFS (SERVIÇO)</label>
                            <input
                              type="text"
                              value={numNotaFiscal || ""}
                              onChange={(e) => setNumNotaFiscal(e.target.value)}
                              disabled={status === "FINALIZADA" || status === "CANCELADA"}
                              placeholder="Nº da NFS"
                              className="w-full border border-emerald-200 focus:border-emerald-500 rounded-lg px-4 py-2 text-sm bg-white font-medium text-emerald-900 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1.5">CENTRO DE CUSTO</label>
                            <input
                              type="text"
                              list="centros-custo-datalist-global"
                              value={centroCustoDebito || ""}
                              onChange={(e) => setCentroCustoDebito(e.target.value)}
                              disabled={status === "FINALIZADA" || status === "CANCELADA"}
                              placeholder="Selecione ou digite..."
                              className="w-full border border-emerald-200 focus:border-emerald-500 rounded-lg px-4 py-2 text-sm bg-white font-bold text-emerald-900 outline-none transition-all"
                            />
                            <datalist id="centros-custo-datalist-global">
                              {centrosCustoOpcoes.map((item, idx) => (
                                <option key={idx} value={item} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1.5">REFERÊNCIA / OBS. FATURAMENTO</label>
                            <input
                              type="text"
                              value={notaFiscal || ""}
                              onChange={(e) => setNotaFiscal(e.target.value)}
                              disabled={status === "FINALIZADA" || status === "CANCELADA"}
                              placeholder="Ex: Faturado conforme pedido X..."
                              className="w-full border border-emerald-200 focus:border-emerald-500 rounded-lg px-4 py-2 text-sm bg-white font-medium text-emerald-900 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Orçamento Final Summary */}
                <div className="border border-gray-200 p-6 rounded-xl bg-gray-50 shadow-sm">
                  <h3 className="text-xs font-black uppercase text-gray-800 tracking-widest mb-4">ORÇAMENTO FINAL DO FECHAMENTO</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mb-6">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight block">Peças (Informativo):</span>
                      <span className="font-mono text-xs text-gray-500 block italic font-bold">
                        {calcularTotalPecas().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight block">Total Horas:</span>
                      <span className="font-mono text-sm text-gray-700 font-bold block">{calcularTotalHorasTrabalhadas().toFixed(2)}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight block">Mão de Obra / Serviço:</span>
                      <span className="font-mono text-sm text-gray-800 font-extrabold block">
                        {Number(valorMaoObra).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight block">Total KM:</span>
                      <span className="font-mono text-sm text-gray-700 font-bold block">{kmRodado}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight block">Deslocamento:</span>
                      <span className="font-mono text-sm text-gray-800 font-extrabold block">
                        {Number(valorDeslocamento).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight block">Outras Despesas:</span>
                      <span className="font-mono text-sm text-gray-800 font-extrabold block">
                        {Number(outrosCustos).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">FATURAMENTO TOTAL REAL/COBRADO:</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-brand-red font-mono text-3xl font-black">
                        {calcularValorTotalOS().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Finalize operations guidance */}
                {status !== "FINALIZADA" && status !== "CANCELADA" && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-amber-900 text-xs uppercase tracking-wide">Instruções de Finalização de O.S.</h5>
                      <p className="text-amber-800 mt-1 leading-relaxed">
                        Ao clicar em "Finalizar Ordem de Serviço", o sistema efetuará o travamento total de lançamentos de horas e peças, configurará o status como FINALIZADA e atualizará o horímetro do implemento no banco de dados para <strong className="font-mono">{horimetroFinal || "Sem Horímetro"}</strong> para os disparos das revisões preventivas.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="os-form-footer flex flex-col sm:flex-row justify-between items-center bg-white p-4 border-t border-gray-100 rounded-b-xl gap-3">
            <button
              type="button"
              onClick={closeForm}
              className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 shadow-sm flex items-center gap-1.5 text-xs font-bold transition shrink-0 uppercase"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
              <span>Voltar</span>
            </button>

            <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
              {currentOS && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSendTechWhatsapp(currentOS)}
                    className="btn bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-2 font-bold flex items-center gap-1.5 cursor-pointer shadow-sm rounded-lg transition uppercase tracking-wider"
                    title="Enviar dados do agendamento via WhatsApp para o Técnico responsável"
                  >
                    <MessageCircle className="w-4 h-4 text-white" />
                    <span>TÉCNICO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintPreviewOS(currentOS)}
                    className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 font-bold flex items-center gap-1.5 cursor-pointer shadow-sm rounded-lg transition uppercase tracking-wider"
                    title="Visualizar Fatura / Impressão Completa"
                  >
                    <Printer className="w-4 h-4 text-white" />
                    <span>FATURA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintPreviewCampoOS(currentOS)}
                    className="btn bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 font-bold flex items-center gap-1.5 cursor-pointer shadow-sm rounded-lg transition uppercase tracking-wider"
                    title="Gerar Relatório de Campo"
                  >
                    <ClipboardList className="w-4 h-4 text-white" />
                    <span>RELATÓRIO</span>
                  </button>
                </>
              )}

              {status !== "FINALIZADA" && status !== "CANCELADA" && (
                <>
                  <button
                    type="button"
                    onClick={handleCancelOS}
                    className="btn bg-gray-400 hover:bg-gray-500 text-white text-xs px-3 py-2 font-bold rounded-lg transition uppercase tracking-wider"
                  >
                    CANCELAR
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveOS()}
                    className="btn bg-brand-ink hover:bg-gray-800 text-white text-xs px-3 py-2 font-bold flex items-center gap-1.5 rounded-lg transition uppercase tracking-wider"
                  >
                    <Save className="w-4 h-4" />
                    <span>SALVAR</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalizeOS}
                    className="btn bg-brand-red hover:bg-brand-red-dark text-white text-xs px-3 py-2 font-bold flex items-center gap-1.5 rounded-lg transition uppercase tracking-wider"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>FINALIZAR</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {printPreviewOS && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none">
            {/* Modal Controls Bar */}
            <div className="flex justify-between items-center bg-gray-900 text-white px-5 py-3 rounded-t-xl print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-brand-red animate-bounce" />
                <span className="font-bold text-sm tracking-wide">
                  Visualização da Fatura / Impressão de O.S. Nº {printPreviewOS.numero_os}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-brand-red text-white text-xs font-bold px-4 py-1.5 rounded hover:bg-brand-red-dark flex items-center gap-1.5 transition shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Agora
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPreviewOS(null)}
                  className="bg-gray-700 text-gray-200 text-xs font-bold px-3 py-1.5 rounded hover:bg-gray-600 flex items-center gap-1 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Fechar
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="flex-1 overflow-y-auto p-8 print:p-0 bg-white font-sans printable-area" id="printable-os-invoice">
              <div className="space-y-6 text-brand-ink text-xs max-w-[800px] mx-auto print:max-w-none">
                
                {/* Header of Invoice */}
                <div className="border-b-4 border-brand-red pb-4 flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3">
                    {company?.logo ? (
                      <img 
                        src={company.logo} 
                        alt="Logo" 
                        className="h-14 max-w-[220px] object-contain" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-[#E30613] rounded-lg flex items-center justify-center text-white font-black text-2xl tracking-tighter shadow-sm shrink-0">
                        {company?.nome ? company.nome.charAt(0).toUpperCase() : "D"}
                      </div>
                    )}
                    <div>
                      <h1 className="font-display text-lg font-black uppercase text-gray-900 tracking-tight">
                        {company?.nome || "Oficina Mecânica Agrícola"}
                      </h1>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        {company?.subtitulo || "Serviços Mecânicos e Soluções de Campo"}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {company?.endereco 
                          ? `${company.endereco} ${company.telefone ? `| Contato: ${company.telefone}` : ""} ${company.cnpj ? `| CNPJ: ${company.cnpj}` : ""}` 
                          : "Configure os dados da sua empresa no menu de configurações"
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right border-l pl-4 border-gray-200">
                    <span className="text-[9px] font-bold text-gray-400 block uppercase">Ordem de Serviço</span>
                    <strong className="text-xl font-mono text-brand-red font-black block">Nº {printPreviewOS.numero_os}</strong>
                    <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[8px] font-extrabold uppercase border ${
                      printPreviewOS.status === "FINALIZADA" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}>
                      {printPreviewOS.status}
                    </span>
                  </div>
                </div>

                {/* Main OS fields mapping */}
                {printPreviewOS.modo_debito_interno && (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide block">Modo de Débito Interno</span>
                      <span className="font-extrabold text-amber-900 uppercase">
                        {printPreviewOS.classificacao_atendimento_interno || printPreviewOS.tipo_atendimento || "Serviço Interno"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide block">Centro de Custo</span>
                      <span className="font-mono font-extrabold text-amber-900 uppercase">
                        {printPreviewOS.centro_custo_debito || "Não Informado"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide block">Base p/ Referência</span>
                      <span className="font-bold text-amber-900">
                        {printPreviewOS.base_calculo_referencia || "Horas + KM Reduz."}
                        {printPreviewOS.valor_referencia_servico ? ` (${printPreviewOS.valor_referencia_servico.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})` : ""}
                      </span>
                    </div>
                    {printPreviewOS.observacao_debito && (
                      <div className="sm:col-span-3 border-t border-amber-200/50 pt-2 -mt-1">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide block">Observação do Débito</span>
                        <span className="text-amber-800 font-semibold italic">{printPreviewOS.observacao_debito}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
                  
                  {/* Client details block */}
                  <div className="border border-gray-200 rounded-lg p-3 space-y-1.5 bg-gray-50/50">
                    <h3 className="text-[10px] font-bold uppercase text-brand-red tracking-wider border-b pb-1 font-sans">
                      Dados do Cliente
                    </h3>
                    <div className="grid grid-cols-3 gap-y-1 text-[11px]">
                      <span className="text-gray-400 font-bold">Cliente:</span>
                      <span className="col-span-2 font-bold text-gray-800">
                        {printPreviewOS.clientes?.razao_social || "N/A"}
                      </span>
                      
                      <span className="text-gray-400 font-bold">CNPJ/CPF:</span>
                      <span className="col-span-2 font-mono text-gray-600">
                        {printPreviewOS.clientes?.cpf_cnpj || "N/A"}
                      </span>
                      
                      <span className="text-gray-400 font-bold">Cidade/UF:</span>
                      <span className="col-span-2 text-gray-700">
                        {printPreviewOS.clientes?.cidade || "—"} / {printPreviewOS.clientes?.uf || "—"}
                      </span>

                      <span className="text-gray-400 font-bold">Fone:</span>
                      <span className="col-span-2 text-gray-700">
                        {printPreviewOS.clientes?.telefone || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Machinery / Equipment details block */}
                  <div className="border border-gray-200 rounded-lg p-3 space-y-1.5 bg-gray-50/50">
                    <h3 className="text-[10px] font-bold uppercase text-brand-red tracking-wider border-b pb-1 font-sans">
                      Equipamento / Máquina
                    </h3>
                    <div className="grid grid-cols-3 gap-y-1 text-[11px]">
                      <span className="text-gray-400 font-bold">Modelo:</span>
                      <span className="col-span-2 font-bold text-gray-800">
                        {printPreviewOS.implementos?.modelo || "N/A"}
                      </span>
                      
                      <span className="text-gray-400 font-bold">Série/Chassi:</span>
                      <span className="col-span-2 font-mono text-gray-600">
                        {printPreviewOS.implementos?.numero_serie || "N/A"}
                      </span>
                      
                      <span className="text-gray-400 font-bold">Fabricante:</span>
                      <span className="col-span-2 text-gray-700">
                        {printPreviewOS.implementos?.fabricante || "—"}
                      </span>

                      <span className="text-gray-400 font-bold">Horímetro:</span>
                      <span className="col-span-2 text-gray-700 font-mono font-bold">
                        {printPreviewOS.horimetro_final || printPreviewOS.implementos?.horimetro || "—"} h
                      </span>

                      <span className="text-gray-400 font-bold">Localização:</span>
                      <span className="col-span-2 text-gray-700 font-semibold">
                        {printPreviewOS.localizacao_maquina || printPreviewOS.implementos?.localizacao || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Complaint and service execution section */}
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <h3 className="text-[10px] font-bold uppercase text-brand-red tracking-wider border-b pb-1 font-sans">
                    Atendimento de Campo e Laudo Técnico
                  </h3>
                  
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <strong className="text-gray-400 uppercase text-[10px] block">Problema Relatado:</strong>
                      <p className="text-gray-700 italic bg-gray-50 p-2 rounded border border-gray-100 whitespace-pre-line leading-relaxed">
                        {printPreviewOS.reclamacao || "Nenhuma reclamação registrada."}
                      </p>
                    </div>

                    <div>
                      <strong className="text-gray-400 uppercase text-[10px] block">Serviço Técnico Executado:</strong>
                      <p className="text-gray-800 font-bold bg-rose-50/40 p-2 rounded border border-rose-100 whitespace-pre-line leading-relaxed">
                        {printPreviewOS.servico_executado || "Serviço mecânico em andamento de bancada."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pt-1 print:grid-cols-4">
                      <div>
                        <strong className="text-gray-400 block uppercase">Técnico Principal:</strong>
                        <span className="font-bold text-gray-700">
                          {tecnicos.find(t => t.id === printPreviewOS.tecnico_id)?.nome || "Não Definido"}
                        </span>
                      </div>
                      <div>
                        <strong className="text-gray-400 block uppercase">Auxiliar de Campo:</strong>
                        <span className="font-bold text-gray-700">
                          {tecnicos.find(t => t.id === printPreviewOS.auxiliar_id)?.nome || "Nenhum"}
                        </span>
                      </div>
                      <div>
                        <strong className="text-gray-400 block uppercase">Data Entrada:</strong>
                        <span className="font-bold text-gray-700">
                          {printPreviewOS.data_atendimento ? new Date(printPreviewOS.data_atendimento).toLocaleDateString("pt-BR") : "—"}
                        </span>
                      </div>
                      <div>
                        <strong className="text-gray-400 block uppercase">Plano Preventivo:</strong>
                        <span className="font-bold text-gray-700">{printPreviewOS.revisao_executada || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table of substituted parts */}
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <h3 className="text-[10px] font-bold uppercase text-brand-red tracking-wider border-b pb-1 font-sans">
                    Peças, Filtros e Insumos Substituídos
                  </h3>

                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                        <th className="p-1.5">Código / Ref</th>
                        <th className="p-1.5">Descrição do Item</th>
                        <th className="p-1.5 text-center">Quant.</th>
                        <th className="p-1.5 text-right">Unitário</th>
                        <th className="p-1.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        let parsedPecas: PecaItem[] = [];
                        try {
                          const storedPecas = localStorage.getItem(`gst_os_pecas_${printPreviewOS.id}`);
                          if (storedPecas) {
                            parsedPecas = JSON.parse(storedPecas);
                          }
                        } catch (e) {
                          console.warn(e);
                        }
                        
                        if (parsedPecas.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="p-3 text-center text-gray-400 italic">
                                Nenhuma peça substituída ou insumo lançado nesta Ordem de Serviço.
                              </td>
                            </tr>
                          );
                        }

                        return parsedPecas.map((p, idx) => (
                          <tr key={p.id || idx}>
                            <td className="p-1.5 font-mono text-gray-500">{p.codigo}</td>
                            <td className="p-1.5 font-bold text-gray-700">{p.descricao}</td>
                            <td className="p-1.5 text-center font-mono">{p.quantidade}</td>
                            <td className="p-1.5 text-right font-mono">{p.xml_imported ? "—" : p.valor_unitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                            <td className="p-1.5 text-right font-bold font-mono text-gray-800">{p.xml_imported ? "—" : (p.quantidade * p.valor_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals & Final Financial Breakdown */}
                {(() => {
                  let parsedPecas: PecaItem[] = [];
                  try {
                    const stored = localStorage.getItem(`gst_os_pecas_${printPreviewOS.id}`);
                    if (stored) parsedPecas = JSON.parse(stored);
                  } catch (e) { console.warn(e); }
                  const sumPecas = parsedPecas.reduce((acc, curr) => acc + (curr.xml_imported ? 0 : (curr.quantidade * curr.valor_unitario)), 0);

                  const tech = tecnicos.find(t => String(t.id) === String(printPreviewOS.tecnico_id));
                  const rateTech = printPreviewOS.valor_hora_unitario || tech?.valor_hora || 0;
                  const duration = printPreviewOS.apontamentos?.reduce((acc, curr) => acc + Number(curr.horas_trabalhadas || 0), 0) || 0;
                  const sumTech = (printPreviewOS.valor_mao_obra !== undefined && printPreviewOS.valor_mao_obra > 0)
                    ? printPreviewOS.valor_mao_obra
                    : duration * rateTech;

                  const km = Number(printPreviewOS.km_rodado_total || printPreviewOS.km_rodado || 0);
                  const rateKm = printPreviewOS.valor_km_unitario || tech?.valor_km || 0;
                  const sumDesloc = (printPreviewOS.valor_deslocamento !== undefined && printPreviewOS.valor_deslocamento > 0)
                    ? printPreviewOS.valor_deslocamento
                    : km * rateKm;

                  const sumTerceiros = Number(printPreviewOS.valor_terceiros || printPreviewOS.outros_custos || 0);

                  const sumCalculatedTotal = sumPecas + sumTech + sumDesloc + sumTerceiros;
                  const totalFaturado = (printPreviewOS.valor_total !== undefined && printPreviewOS.valor_total > 0)
                    ? printPreviewOS.valor_total
                    : sumCalculatedTotal;

                  return (
                    <div className={`border border-gray-200 rounded-lg p-4 bg-gray-50/60 grid grid-cols-2 ${sumTerceiros > 0 ? 'md:grid-cols-5 print:grid-cols-5' : 'md:grid-cols-4 print:grid-cols-4'} gap-4 text-xs`}>
                      <div>
                        <span className="text-gray-400 font-bold block uppercase text-[9px]">Peças e Insumos:</span>
                        <strong className="font-mono text-gray-700 mt-1 block">
                          {sumPecas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </strong>
                      </div>

                      <div>
                        <span className="text-gray-400 font-bold block uppercase text-[9px]">Mão de Obra Técnica:</span>
                        <strong className="font-mono text-gray-700 mt-1 block">
                          {sumTech.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </strong>
                      </div>

                      <div>
                        <span className="text-gray-400 font-bold block uppercase text-[9px]">Deslocamento (KM):</span>
                        <strong className="font-mono text-gray-700 mt-1 block">
                          {sumDesloc.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </strong>
                      </div>

                      {sumTerceiros > 0 && (
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Serv. Terceiros / Outros:</span>
                          <strong className="font-mono text-gray-700 mt-1 block">
                            {sumTerceiros.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </strong>
                        </div>
                      )}

                      <div className="border-l pl-4 border-gray-300">
                        <span className="text-brand-red font-extrabold block uppercase text-[9px]">Valor Total Faturado:</span>
                        <strong className="font-mono text-base text-brand-red font-black mt-1 block">
                          {totalFaturado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </strong>
                      </div>
                    </div>
                  );
                })()}

                {/* Signature Fields */}
                <div className="pt-8 grid grid-cols-2 gap-12 text-center text-[11px] print:grid-cols-2">
                  <div className="border-t border-gray-400 pt-2 space-y-1">
                    <div className="font-bold text-gray-800">__________________________________________</div>
                    <div className="font-bold text-gray-700">Responsável Técnico / Mecânico</div>
                    <div className="text-[9px] text-gray-400">{company?.nome || "Oficina Mecânica Agrícola"}</div>
                  </div>
                  <div className="border-t border-gray-400 pt-2 space-y-1">
                    <div className="font-bold text-gray-800">__________________________________________</div>
                    <div className="font-bold text-gray-700">Assinatura do Cliente</div>
                    <div className="text-[9px] text-gray-400">Autorização de Execução e Recebimento</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {printPreviewCampoOS && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none">
            {/* Modal Controls Bar */}
            <div className="flex justify-between items-center bg-gray-900 text-white px-5 py-3 rounded-t-xl print:hidden">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-brand-red" />
                <span className="font-bold text-sm tracking-wide">
                  RELATÓRIO DE CAMPO PADRÃO — O.S. Nº {printPreviewCampoOS.numero_os}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded hover:bg-emerald-700 flex items-center gap-1.5 transition shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Ficha
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPreviewCampoOS(null)}
                  className="bg-gray-700 text-gray-200 text-xs font-bold px-3 py-1.5 rounded hover:bg-gray-600 flex items-center gap-1 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Fechar
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="flex-1 overflow-y-auto p-8 print:p-0 bg-white font-sans text-xs text-black printable-area" id="printable-os-campo">
              <div className="max-w-[820px] print:max-w-none print:w-full mx-auto space-y-1.5 print:space-y-0.5 border border-black p-3 print:p-0 rounded-xl print:rounded-none bg-white print:border-none">
                
                {/* 1. TOP HEADER BRAND BOX */}
                <div className="grid grid-cols-12 border border-black rounded-lg overflow-hidden bg-white print-break-inside-avoid">
                  {/* Brand Logo Column */}
                  <div className="col-span-4 p-1 flex flex-col justify-between items-center text-center bg-white border-r border-black min-h-[62px]">
                    {company?.logo ? (
                      <div className="h-14 flex items-center justify-center my-auto w-full p-0.5 overflow-hidden">
                        <img 
                          src={company.logo} 
                          alt="Logo" 
                          className="h-14 max-h-14 w-auto max-w-full object-contain" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-center my-auto py-0.5">
                        {/* Stylized Red Logo Icon with dynamic brand name */}
                        <div className="w-11 h-11 bg-[#E30613] rounded-lg flex items-center justify-center text-white font-black text-2xl tracking-tighter shadow-sm shrink-0 border border-red-700">
                          {company?.nome ? company.nome.charAt(0).toUpperCase() : "D"}
                        </div>
                        <div className="text-left leading-none">
                          <span className="font-display font-black text-base text-black tracking-tight block">
                            {company?.nome ? company.nome.split(" ")[0].substring(0, 10).toUpperCase() : "DANIEL"}
                          </span>
                          <span className="text-[7.5px] font-extrabold text-gray-700 uppercase tracking-widest block mt-0.5">
                            {company?.nome ? company.nome.split(" ").slice(1).join(" ").substring(0, 20).toUpperCase() : "TRATORES AGRÍCOLA"}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="text-[7px] font-black text-black uppercase tracking-wide mt-0.5 border-t border-gray-200 pt-0.5 w-full text-center">
                      {company?.subtitulo || "SEMPRE AO LADO DE QUEM PRODUZ"}
                    </div>
                  </div>

                  {/* Company Info Column */}
                  <div className="col-span-5 p-1 flex flex-col justify-center text-center text-[7.5px] border-r border-black font-sans leading-tight text-gray-800 bg-white">
                    <strong className="text-[9px] font-black text-black uppercase">
                      {company?.nome || "Daniel Tratores Agrícola Ltda"}
                    </strong>
                    {company?.cnpj || company?.inscricao_estadual ? (
                      <span className="font-semibold text-[7px]">
                        {company.cnpj ? `CNPJ: ${company.cnpj}` : ""}
                        {company.cnpj && company.inscricao_estadual ? " – " : ""}
                        {company.inscricao_estadual ? `INSC. EST. ${company.inscricao_estadual}` : ""}
                      </span>
                    ) : (
                      <span className="font-semibold text-[7px]">CNPJ: 11.994.044/0001-09 – INSC. EST. 0000000306735-1</span>
                    )}
                    <span className="text-[7px]">
                      {company?.endereco || "Rodovia BR 364, KM 516, Nº 3949 – Ariquemes/ RO – 76877-225"}
                    </span>
                    <span className="font-semibold text-[7px]">
                      {company?.telefone || company?.email ? (
                        <>
                          {company.telefone ? `Fone ${company.telefone}` : ""}
                          {company.telefone && company.email ? " | " : ""}
                          {company.email ? `e-mail: ${company.email}` : ""}
                        </>
                      ) : (
                        "Fone (69) 3535-4633 | e-mail: contato@dtagricola.com.br"
                      )}
                    </span>
                  </div>

                  {/* Report Number Block */}
                  <div className="col-span-3 p-1 flex flex-col justify-center items-center text-center bg-white">
                    <span className="text-[8px] font-bold text-gray-800 uppercase tracking-wider">Relatório Nº</span>
                    <strong className="text-base font-mono text-[#E30613] font-black tracking-tight mt-0.5">
                      {printPreviewCampoOS.numero_os}
                    </strong>
                  </div>
                </div>

                {/* 2. MAIN REPORT TITLE */}
                <div className="text-center relative py-0 print-break-inside-avoid">
                  <h2 className="text-xs font-black uppercase text-black tracking-widest border-b border-black pb-0.5 inline-block">
                    RELATÓRIO DE CAMPO
                  </h2>
                  <div className="text-[6.5px] font-bold text-black absolute left-0 bottom-0">
                    *Obrigatório o preenchimento de todos os campos.
                  </div>
                </div>

                {/* 3. DADOS DO CLIENTE */}
                <div className="border border-black rounded-lg overflow-hidden print-break-inside-avoid">
                  <div className="bg-gray-100 px-2 py-0.5 border-b border-black font-bold uppercase tracking-wide text-[8px] text-black">
                    DADOS DO CLIENTE
                  </div>
                  <div className="p-1 space-y-0.5 text-[9px]">
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Nome:</span>
                      <span className="border-b border-gray-400 font-bold text-black px-1 py-0 min-h-[15px] min-w-[220px] flex-1">
                        {printPreviewCampoOS.clientes?.razao_social || ""}
                      </span>
                      
                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Responsável:</span>
                      <span className="border-b border-gray-400 font-semibold text-black px-1 py-0 min-h-[15px] min-w-[110px] flex-1">
                        {printPreviewCampoOS.clientes?.nome_contato || ""}
                      </span>

                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Data:</span>
                      <span className="border-b border-gray-400 font-mono text-black px-1 py-0 min-h-[15px] min-w-[65px] text-center">
                        {printPreviewCampoOS.data_atendimento ? new Date(printPreviewCampoOS.data_atendimento).toLocaleDateString("pt-BR") : ""}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Cidade:</span>
                      <span className="border-b border-gray-400 font-semibold text-black px-1 py-0 min-h-[15px] min-w-[140px] flex-1">
                        {printPreviewCampoOS.clientes?.cidade || ""}
                      </span>

                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Estado:</span>
                      <span className="border-b border-gray-400 font-semibold text-black px-1 py-0 min-h-[15px] min-w-[40px] text-center">
                        {printPreviewCampoOS.clientes?.uf || ""}
                      </span>

                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Telefone:</span>
                      <span className="border-b border-gray-400 font-semibold text-black px-1 py-0 min-h-[15px] min-w-[110px] flex-1">
                        {printPreviewCampoOS.clientes?.telefone || ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. DADOS DA MÁQUINA */}
                <div className="border border-black rounded-lg overflow-hidden print-break-inside-avoid">
                  <div className="bg-gray-100 px-2 py-0.5 border-b border-black font-bold uppercase tracking-wide text-[8px] text-black">
                    DADOS DA MÁQUINA
                  </div>
                  <div className="p-1 space-y-0.5 text-[9px]">
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Modelo:</span>
                      <span className="border-b border-gray-400 font-bold text-black px-1 py-0 min-h-[15px] min-w-[150px] flex-1">
                        {printPreviewCampoOS.implementos?.modelo || ""}
                      </span>

                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Nº de série:</span>
                      <span className="border-b border-gray-400 font-mono text-black px-1 py-0 min-h-[15px] min-w-[150px] flex-1">
                        {printPreviewCampoOS.implementos?.numero_serie || ""}
                      </span>

                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Trabalho:</span>
                      <span className="flex items-center gap-1 min-w-[80px] font-bold">
                        <span className="inline-block w-2.5 h-2.5 border border-black rounded-xs mr-1"></span> Horas ______
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Potência:</span>
                      <span className="border-b border-gray-400 font-semibold text-black px-1 py-0 min-h-[15px] min-w-[80px] flex-1">
                        {printPreviewCampoOS.implementos?.potencia ? `${printPreviewCampoOS.implementos.potencia} CV` : ""}
                      </span>

                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">RPM:</span>
                      <span className="border-b border-gray-400 font-semibold text-black px-1 py-0 min-h-[15px] min-w-[80px] flex-1">
                        {printPreviewCampoOS.implementos?.rpm || ""}
                      </span>

                      <span className="flex items-center gap-1 min-w-[80px] font-bold">
                        <span className="inline-block w-2.5 h-2.5 border border-black rounded-xs mr-1"></span> Hectares ____
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. DADOS DA ASSISTÊNCIA */}
                <div className="border border-black rounded-lg overflow-hidden print-break-inside-avoid">
                  <div className="bg-gray-100 px-2 py-0.5 border-b border-black font-bold uppercase tracking-wide text-[8px] text-black">
                    DADOS DA ASSISTÊNCIA
                  </div>
                  <div className="p-1 text-[9px]">
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Técnico:</span>
                      <span className="border-b border-gray-400 font-bold text-black px-1 py-0 min-h-[15px] min-w-[140px] flex-1">
                        {tecnicos.find(t => t.id === printPreviewCampoOS.tecnico_id)?.apelido || tecnicos.find(t => t.id === printPreviewCampoOS.tecnico_id)?.nome || ""}
                      </span>

                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Auxiliar Técnico:</span>
                      <span className="border-b border-gray-400 font-semibold text-black px-1 py-0 min-h-[15px] min-w-[140px] flex-1">
                        {tecnicos.find(t => t.id === printPreviewCampoOS.auxiliar_id)?.apelido || tecnicos.find(t => t.id === printPreviewCampoOS.auxiliar_id)?.nome || ""}
                      </span>

                      <span className="font-bold uppercase text-[8px] text-gray-800 shrink-0">Telefone:</span>
                      <span className="border-b border-gray-400 font-semibold text-black px-1 py-0 min-h-[15px] min-w-[90px]">
                        {tecnicos.find(t => t.id === printPreviewCampoOS.tecnico_id)?.telefone || ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. APONTAMENTO DE SERVIÇO */}
                <div className="border border-black rounded-lg overflow-hidden print-break-inside-avoid">
                  <div className="bg-gray-100 px-2 py-0.5 border-b border-black font-bold uppercase tracking-wide text-[8px] text-black">
                    APONTAMENTO DE SERVIÇO
                  </div>
                  <table className="w-full text-center border-collapse text-[8.5px]">
                    <thead>
                      <tr className="border-b border-black font-bold text-gray-800 text-[7.5px] uppercase bg-white">
                        <th className="p-0.5 border-r border-black w-24">Data</th>
                        <th className="p-0.5 border-r border-black w-24">Hora Inicio</th>
                        <th className="p-0.5 border-r border-black w-28">Intervalo Início</th>
                        <th className="p-0.5 border-r border-black w-28">Intervalo Fim</th>
                        <th className="p-0.5 border-r border-black w-24">Hora Final</th>
                        <th className="p-0.5 w-24">Total Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(2)].map((_, i) => (
                        <tr key={i} className="border-b border-black last:border-b-0 h-[18px] bg-white">
                          <td className="p-0 border-r border-black font-mono text-gray-500 text-[8px]">___ / ___ / ____</td>
                          <td className="p-0 border-r border-black font-mono text-gray-500 text-[8px]">____ : ____</td>
                          <td className="p-0 border-r border-black font-mono text-gray-500 text-[8px]">____ : ____</td>
                          <td className="p-0 border-r border-black font-mono text-gray-500 text-[8px]">____ : ____</td>
                          <td className="p-0 border-r border-black font-mono text-gray-500 text-[8px]">____ : ____</td>
                          <td className="p-0 font-mono text-gray-500 text-[8px]">____________</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 7. APONTAMENTO DE DESLOCAMENTO */}
                <div className="border border-black rounded-lg overflow-hidden print-break-inside-avoid">
                  <div className="bg-gray-100 px-2 py-0.5 border-b border-black font-bold uppercase tracking-wide text-[8px] text-black">
                    APONTAMENTO DE DESLOCAMENTO
                  </div>
                  <table className="w-full text-center border-collapse text-[8.5px]">
                    <thead>
                      <tr className="border-b border-black font-bold text-gray-800 text-[7.5px] uppercase bg-white">
                        <th className="p-0.5 border-r border-black w-24">Data</th>
                        <th className="p-0.5 border-r border-black w-24">Hora Inicio</th>
                        <th className="p-0.5 border-r border-black w-24">Hora Final</th>
                        <th className="p-0.5 border-r border-black w-28">KM Inicial</th>
                        <th className="p-0.5 border-r border-black w-28">KM Final</th>
                        <th className="p-0.5 w-24">Total KM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(2)].map((_, i) => (
                        <tr key={i} className="border-b border-black last:border-b-0 h-[18px] bg-white">
                          <td className="p-0 border-r border-black font-mono text-gray-500 text-[8px]">___ / ___ / ____</td>
                          <td className="p-0 border-r border-black font-mono text-gray-500 text-[8px]">____ : ____</td>
                          <td className="p-0 border-r border-black font-mono text-gray-500 text-[8px]">____ : ____</td>
                          <td className="p-0 border-r border-black font-mono text-gray-500 text-[8px]">________________</td>
                          <td className="p-0 border-r border-black font-mono text-gray-500 text-[8px]">________________</td>
                          <td className="p-0 font-mono text-gray-500 text-[8px]">____________</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 8. DECLARATIVE CLAUSES & TERMS */}
                <div className="border border-black rounded-lg p-1 space-y-0.5 bg-white text-[7.5px] leading-tight print-break-inside-avoid">
                  <span className="font-bold text-black uppercase block text-[7.5px]">Os Signatários deste certificado (usuário e revenda) declaram que:</span>
                  <div className="space-y-0.5">
                    <div className="flex items-start gap-1">
                      <span className="inline-block w-2 h-2 border border-black rounded-xs shrink-0 mt-0.5"></span>
                      <p className="text-gray-900">
                        A máquina acima especificada foi colocada em serviço segundo as instruções da fábrica e da revenda pelo usuário abaixo identificado.
                      </p>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="inline-block w-2 h-2 border border-black rounded-xs shrink-0 mt-0.5"></span>
                      <p className="text-gray-900">
                        O usuário recebeu da revenda todas as instruções relativas à utilização e manutenção da máquina e aos dispositivos de segurança que a equipam, conforme descrito no manual de instruções entregue.
                      </p>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="inline-block w-2 h-2 border border-black rounded-xs shrink-0 mt-0.5"></span>
                      <p className="text-gray-900">
                        O usuário foi informado pela revenda das condições de garantia.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-6 pt-0.5 font-bold text-black text-[7.5px]">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 border border-black rounded-xs"></span> Assistência com pedido de garantia
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 border border-black rounded-xs"></span> Visita técnica para regulagem/ montagem de peças
                    </div>
                  </div>
                </div>

                {/* 9. NÃO CONFORMIDADE BLOCK (EXPANDED WRITING AREA WITH 18 LINES) */}
                <div className="border border-black rounded-lg overflow-hidden print-break-inside-avoid">
                  <div className="bg-gray-100 px-2 py-0.5 border-b border-black font-bold uppercase tracking-wide text-[8px] text-black">
                    NÃO CONFORMIDADE / OBSERVAÇÕES DE CAMPO
                  </div>
                  <div className="px-2 py-0.5 bg-white">
                    {[...Array(18)].map((_, i) => (
                      <div key={i} className="border-b border-gray-400 h-[19px] w-full"></div>
                    ))}
                  </div>
                </div>

                {/* 10. DECLARATION CLAUSE AND SIGNATURES */}
                <div className="space-y-1 pt-0.5 print-break-inside-avoid">
                  <p className="font-bold italic text-black text-[8px]">
                    Declaro que li e estou de acordo com todos os termos acima.
                  </p>

                  <div className="grid grid-cols-2 gap-8 text-center text-[8.5px] pt-1">
                    <div className="space-y-0.5">
                      <div className="font-bold text-black">____________________________________________________</div>
                      <div className="font-black text-black uppercase tracking-wide">Cliente/ Responsável</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-black">____________________________________________________</div>
                      <div className="font-black text-black uppercase tracking-wide">Técnico</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
