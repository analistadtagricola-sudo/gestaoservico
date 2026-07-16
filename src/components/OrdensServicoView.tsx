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
  TrendingUp,
  MapPin,
  CheckCircle2,
  Trash,
  Printer,
  Upload,
  ArrowLeft
} from "lucide-react";
import { OrdemServico, Cliente, Implemento, Tecnico, Apontamento } from "../types";
import { API } from "../lib/api";

interface OrdensServicoViewProps {
  ordens: OrdemServico[];
  clientes: Cliente[];
  implementos: Implemento[];
  tecnicos: Tecnico[];
  onRefresh: () => Promise<void>;
  preSelectedOSId?: number | null;
  onClearPreSelectedOS?: () => void;
}

type OSTabType = "dados" | "atendimento" | "apontamentos" | "pecas" | "despesas" | "encerramento";

interface PecaItem {
  id: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

export const OrdensServicoView: React.FC<OrdensServicoViewProps> = ({
  ordens,
  clientes,
  implementos,
  tecnicos,
  onRefresh,
  preSelectedOSId,
  onClearPreSelectedOS
}) => {
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

  // Form Fields State
  const [clienteId, setClienteId] = useState("");
  const [implementoId, setImplementoId] = useState("");
  const [tipoAtendimento, setTipoAtendimento] = useState("ASSISTÊNCIA TÉCNICA");
  const [prioridade, setPrioridade] = useState<"NORMAL" | "ALTA" | "URGENTE">("NORMAL");
  const [status, setStatus] = useState<OrdemServico["status"]>("ABERTA");
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
  const [valorKmUnitario, setValorKmUnitario] = useState<number>(2.5);
  const [valorDeslocamento, setValorDeslocamento] = useState<number>(0);
  const [valorHoraUnitario, setValorHoraUnitario] = useState<number>(150);
  const [valorMaoObra, setValorMaoObra] = useState<number>(0);
  const [veiculoUsado, setVeiculoUsado] = useState("");
  const [outrosCustos, setOutrosCustos] = useState<number>(0);
  const [notaFiscal, setNotaFiscal] = useState("");
  const [horimetroFinal, setHorimetroFinal] = useState<number | "">("");
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

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Synchronize technician hourly and KM rates
  useEffect(() => {
    if (tecnicoId) {
      const tech = tecnicos.find(t => t.id === Number(tecnicoId));
      if (tech) {
        if (!currentOS) {
          setValorKmUnitario(tech.valor_km || 2.5);
          setValorHoraUnitario(tech.valor_hora || 150);
        } else {
          if (valorKmUnitario === 2.5 || valorKmUnitario === 0) setValorKmUnitario(tech.valor_km || 2.5);
          if (valorHoraUnitario === 150 || valorHoraUnitario === 0) setValorHoraUnitario(tech.valor_hora || 150);
        }
      }
    }
  }, [tecnicoId, tecnicos, currentOS]);

  // Sync KM Inicial / KM Final to KM Rodado and Valor Deslocamento
  useEffect(() => {
    if (kmFinal > 0 && kmFinal >= kmInicial) {
      const calculatedKM = kmFinal - kmInicial;
      setKmRodado(calculatedKM);
      setValorDeslocamento(calculatedKM * valorKmUnitario);
    } else if (kmRodado > 0) {
      setValorDeslocamento(kmRodado * valorKmUnitario);
    }
  }, [kmInicial, kmFinal, kmRodado, valorKmUnitario]);

  // Sync Hora Inicial / Hora Final to Valor Mão de Obra
  useEffect(() => {
    const calcularHorasDeTempos = (inicio: string, fim: string) => {
      if (!inicio || !fim) return 0;
      const [h1, m1] = inicio.split(":").map(Number);
      const [h2, m2] = fim.split(":").map(Number);
      if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
      let min1 = h1 * 60 + m1;
      let min2 = h2 * 60 + m2;
      if (min2 < min1) min2 += 24 * 60; // handle overnight
      return (min2 - min1) / 60;
    };

    const hours = calcularHorasDeTempos(horaInicial, horaFinal);
    if (hours > 0) {
      setValorMaoObra(hours * valorHoraUnitario);
    } else {
      const uniqueBlocks = new Set<string>();
      let apontHours = 0;
      apontamentos.forEach(a => {
        const key = `${a.data_servico}_${a.hora_inicial}_${a.hora_final}`;
        if (!uniqueBlocks.has(key)) {
          uniqueBlocks.add(key);
          apontHours += Number(a.horas_trabalhadas || 0);
        }
      });

      if (apontHours > 0) {
        setValorMaoObra(apontHours * valorHoraUnitario);
      }
    }
  }, [horaInicial, horaFinal, apontamentos, valorHoraUnitario]);

  // Open form directly when preselected ID changes
  useEffect(() => {
    if (preSelectedOSId !== undefined && preSelectedOSId !== null) {
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
  }, [preSelectedOSId, ordens]);

  // Load secondary O.S. details (Apontamentos, Peças, Despesas)
  const loadOSDetails = async (os: OrdemServico) => {
    if (!os.id) return;
    setIsLoading(true);
    try {
      const apList = await API.apontamentos.listar(os.id);
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
    if (os) {
      setCurrentOS(os);
      setClienteId(String(os.cliente_id));
      setImplementoId(String(os.implemento_id));
      setTipoAtendimento(os.tipo_atendimento || "ASSISTÊNCIA TÉCNICA");
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
      setValorKmUnitario(os.valor_km_unitario || 2.5);
      setValorDeslocamento(os.valor_deslocamento || 0);
      setValorHoraUnitario(os.valor_hora_unitario || 150);
      setValorMaoObra(os.valor_mao_obra || 0);
      setVeiculoUsado(os.veiculo_usado || "");
      setOutrosCustos(os.valor_terceiros || 0);
      setNotaFiscal(os.nota_fiscal || "");
      setHorimetroFinal(os.horimetro_final || "");
      setRevisaoExecutada(os.revisao_executada || "");

      loadOSDetails(os);
    } else {
      setCurrentOS(null);
      setClienteId("");
      setImplementoId("");
      setTipoAtendimento("ASSISTÊNCIA TÉCNICA");
      setPrioridade("NORMAL");
      setStatus("ABERTA");
      setReclamacao("");
      setObservacao("");
      setSolicitante("");

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
      setValorKmUnitario(2.5);
      setValorDeslocamento(0);
      setValorHoraUnitario(150);
      setValorMaoObra(0);
      setVeiculoUsado("");
      setOutrosCustos(0);
      setNotaFiscal("");
      setHorimetroFinal("");
      setRevisaoExecutada("");

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
    if (valorDeslocamento > 0) return valorDeslocamento;
    if (!tecnicoId) return 0;
    const tech = tecnicos.find(t => t.id === Number(tecnicoId));
    const rate = valorKmUnitario > 0 ? valorKmUnitario : (tech?.valor_km || 0);
    return kmRodado * rate;
  };

  const calcularCustoMaoObra = () => {
    if (valorMaoObra > 0) return valorMaoObra;
    if (!tecnicoId) return 0;
    const tech = tecnicos.find(t => t.id === Number(tecnicoId));
    const rate = valorHoraUnitario > 0 ? valorHoraUnitario : (tech?.valor_hora || 0);
    return calcularTotalHorasTrabalhadas() * rate;
  };

  // Total O.S. budget sum
  const calcularValorTotalOS = () => {
    const totalPecas = calcularTotalPecas();
    const deslocamento = valorDeslocamento > 0 ? valorDeslocamento : calcularCustoDeslocamento();
    const custoMaoObra = valorMaoObra > 0 ? valorMaoObra : calcularCustoMaoObra();
    
    return totalPecas + deslocamento + custoMaoObra + Number(outrosCustos);
  };

  const handleSaveOS = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clienteId || !implementoId || !reclamacao.trim()) {
      showToast("Preencha todos os campos obrigatórios (*)", "error");
      return null;
    }

    setIsLoading(true);

    const deslocamento = valorDeslocamento > 0 ? valorDeslocamento : calcularCustoDeslocamento();
    const custoMaoObra = valorMaoObra > 0 ? valorMaoObra : calcularCustoMaoObra();
    const valTotal = calcularValorTotalOS();

    const payload: OrdemServico = {
      numero_os: currentOS?.numero_os || "",
      status: status,
      cliente_id: Number(clienteId),
      implemento_id: Number(implementoId),
      tipo_atendimento: tipoAtendimento,
      prioridade: prioridade,
      reclamacao,
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
      valor_deslocamento: deslocamento,
      valor_mao_obra: custoMaoObra,
      valor_terceiros: Number(outrosCustos),
      nota_fiscal: notaFiscal,
      valor_total: valTotal,
      horimetro_final: horimetroFinal ? Number(horimetroFinal) : undefined,
      revisao_executada: revisaoExecutada
    };

    try {
      let savedOS: OrdemServico;
      if (currentOS && currentOS.id) {
        savedOS = await API.ordensServico.atualizar(currentOS.id, payload);
        showToast("Ordem de Serviço salva com sucesso!", "success");
      } else {
        savedOS = await API.ordensServico.inserir(payload);
        showToast("Ordem de Serviço criada com sucesso!", "success");
      }
      
      // Save parts to specific sub key
      if (savedOS.id) {
        localStorage.setItem(`gst_os_pecas_${savedOS.id}`, JSON.stringify(pecas));
      }

      await onRefresh();
      // Reload details to get the synchronized apontamentos
      await loadOSDetails(savedOS);
      setCurrentOS(savedOS);
      return savedOS;
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar O.S.", "error");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeOS = async () => {
    if (!currentOS || !currentOS.id) {
      showToast("Grave a O.S. primeiro para liberar o encerramento.", "error");
      return;
    }

    if (!horimetroFinal) {
      showToast("Por favor, preencha o Horímetro Final antes de encerrar.", "error");
      return;
    }

    // Retrieve equipment to validate horimetro
    const equipment = implementos.find(i => i.id === Number(implementoId));
    if (equipment) {
      // Standard Apps Script validation rule: must be greater or equal
      // For fallback we mock current as 0 if undefined
      const currentHorimetro = Number(equipment.ano) || 0; // fallback if no specific field
      if (Number(horimetroFinal) < currentHorimetro) {
        showToast(`O horímetro informado (${horimetroFinal} h) é menor que o atual (${currentHorimetro} h).`, "error");
        return;
      }
    }

    setIsLoading(true);
    try {
      // First save general fields
      const saved = await handleSaveOS();
      if (saved) {
        await API.ordensServico.finalizar(currentOS.id);
        
        // Also update equipment horímetro dynamically!
        if (equipment && equipment.id) {
          await API.implementos.atualizar(equipment.id, {
            ...equipment,
            observacao: `${equipment.observacao || ""}\n[Atendimento O.S. ${saved.numero_os} em ${new Date().toLocaleDateString("pt-BR")} - Horímetro: ${horimetroFinal}h]`.trim()
          });
        }

        setStatus("FINALIZADA");
        showToast(`O.S. ${currentOS.numero_os} FINALIZADA COM SUCESSO!`, "success");
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
    if (!currentOS || !currentOS.id) return;
    if (!confirm("Deseja realmente CANCELAR esta Ordem de Serviço?")) return;
    
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

  // Add a specific labor record (Apontamento)
  const handleAddApontamento = async () => {
    if (!currentOS || !currentOS.id) {
      showToast("Grave os dados gerais da O.S. antes de registrar apontamentos.", "error");
      return;
    }
    if (!tecnicoId) {
      showToast("Por favor, selecione o Técnico Principal Responsável na aba Agendamento primeiro.", "error");
      return;
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
      // Insert new pointing for Principal
      const newApPrincipal: Apontamento = {
        os_id: currentOS.id,
        tecnico_id: Number(tecnicoId),
        data_servico: newApontData,
        hora_inicial: newApontHoraIn,
        hora_final: newApontHoraFim,
        horas_trabalhadas: hoursDecimal,
        descricao_servico: newApontDesc || "Atendimento em Campo"
      };
      await API.apontamentos.inserir(newApPrincipal);

      // Insert new pointing for Auxiliar if selected
      if (auxiliarId) {
        const newApAuxiliar: Apontamento = {
          os_id: currentOS.id,
          tecnico_id: Number(auxiliarId),
          data_servico: newApontData,
          hora_inicial: newApontHoraIn,
          hora_final: newApontHoraFim,
          horas_trabalhadas: hoursDecimal,
          descricao_servico: newApontDesc || "Atendimento em Campo"
        };
        await API.apontamentos.inserir(newApAuxiliar);
      }

      showToast("Apontamento registrado com sucesso!");
      
      // Reset inputs
      setNewApontHoraIn("");
      setNewApontHoraFim("");
      setNewApontDesc("");
      
      // Reload details
      await loadOSDetails(currentOS);
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar apontamento.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApontamento = async (apId: number) => {
    if (!confirm("Excluir este apontamento de horas?")) return;
    setIsLoading(true);
    try {
      await API.apontamentos.excluir(apId);
      showToast("Apontamento removido.");
      if (currentOS) await loadOSDetails(currentOS);
    } catch (err) {
      console.error(err);
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
      valor_unitario: Number(newPecaValor)
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
        codigo: item.codigo || "NF-e",
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario
      });
    });

    setPecas(newPecasList);
    if (currentOS?.id) {
      localStorage.setItem(`gst_os_pecas_${currentOS.id}`, JSON.stringify(newPecasList));
    }

    if (parsedNfeNumber) {
      setNotaFiscal(parsedNfeNumber);
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

  const totalPages = Math.ceil(filteredOrdens.length / itemsPerPage) || 1;
  const pageIndex = Math.min(currentPage, totalPages);
  const startIdx = (pageIndex - 1) * itemsPerPage;
  const paginatedOrdens = filteredOrdens.slice(startIdx, startIdx + itemsPerPage);

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
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </motion.div>
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
                {st}
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
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-4 text-center">Nº O.S.</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Equipamento / Série</th>
                    <th className="p-4">Cidade</th>
                    <th className="p-4 text-center">Técnico Principal</th>
                    <th className="p-4 text-center">Dias Abertos</th>
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
                              {os.status}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-brand-ink">
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
                {currentOS?.numero_os || "NOVA"}
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
                  if (!currentOS && tab.id !== "dados") {
                    showToast("Por favor, salve os dados iniciais antes de abrir as outras abas.", "info");
                    return;
                  }
                  setActiveTab(tab.id as OSTabType);
                }}
                className={`flex-1 text-center py-3 text-[11px] font-extrabold uppercase tracking-wide border-b-2 transition-all ${
                  !currentOS && tab.id !== "dados" ? "text-gray-300 cursor-not-allowed bg-gray-50/50" : ""
                } ${
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
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Cliente *</label>
                      <select
                        required
                        value={clienteId}
                        onChange={(e) => {
                          setClienteId(e.target.value);
                          setImplementoId("");
                        }}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                      >
                        <option value="">Selecione o cliente proprietário...</option>
                        {clientes.map(c => (
                          <option key={c.id} value={c.id}>{c.razao_social}</option>
                        ))}
                      </select>
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
                        onChange={(e) => setImplementoId(e.target.value)}
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
                        onChange={(e) => setTipoAtendimento(e.target.value)}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red"
                      >
                        <option>GARANTIA</option>
                        <option>ASSISTÊNCIA TÉCNICA</option>
                        <option>REVISÃO PREVENTIVA</option>
                        <option>ENTREGA TÉCNICA</option>
                        <option>MONTAGEM</option>
                        <option>TREINAMENTO</option>
                        <option>OUTRO</option>
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
                        onChange={(e) => setStatus(e.target.value as OrdemServico["status"])}
                        disabled={status === "FINALIZADA" || status === "CANCELADA"}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-red font-bold"
                      >
                        <option value="ABERTA">ABERTA</option>
                        <option value="EM ATENDIMENTO">EM ATENDIMENTO</option>
                        <option value="AGENDADA">AGENDADA</option>
                        <option value="AGUARDANDO">AGUARDANDO</option>
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
                  <h3 className="text-xs font-bold uppercase text-brand-red tracking-wider border-b border-gray-100 pb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Novo Registro de Horas (Apontamento)
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
                          <button
                            type="button"
                            onClick={handleAddApontamento}
                            className="btn bg-brand-red hover:bg-brand-red-dark text-white text-[11px] font-bold py-1.5 shadow border-none w-full"
                          >
                            Lançar Horas
                          </button>
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
                        <th className="p-2">Data</th>
                        <th className="p-2">Técnico</th>
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
                            <td className="p-2">{a.data_servico ? new Date(a.data_servico).toLocaleDateString("pt-BR") : "—"}</td>
                            <td className="p-2 font-bold text-gray-700">{a.tecnicos?.apelido || a.tecnicos?.nome || "Indefinido"}</td>
                            <td className="p-2 font-mono">{a.hora_inicial}</td>
                            <td className="p-2 font-mono">{a.hora_final}</td>
                            <td className="p-2 text-center font-bold text-brand-red font-mono">{a.horas_trabalhadas} h</td>
                            <td className="p-2 max-w-[200px] truncate text-gray-500">{a.descricao_servico}</td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                disabled={status === "FINALIZADA" || status === "CANCELADA"}
                                onClick={() => a.id && handleDeleteApontamento(a.id)}
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
                  <div className="bg-gray-50 p-3 rounded border border-gray-150 flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-500 uppercase tracking-wide">Total de Horas do Atendimento:</span>
                    <strong className="font-mono text-base text-brand-red font-extrabold">{calcularTotalHorasTrabalhadas().toFixed(2)} horas</strong>
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
                            <td className="p-2 font-mono text-gray-500 font-bold">{p.codigo}</td>
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
                  <div className="bg-gray-50 p-3 rounded border border-gray-150 flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-500 uppercase tracking-wide">Subtotal de Peças / Insumos:</span>
                    <strong className="font-mono text-base text-brand-red font-extrabold">{calcularTotalPecas().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
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
                        <option value="HILUX">TOYOTA HILUX (FROTA 01)</option>
                        <option value="L200">MITSUBISHI L200 (FROTA 02)</option>
                        <option value="FIORINO">FIAT FIORINO (FROTA 03)</option>
                        <option value="SAVEIRO">VW SAVEIRO (FROTA 04)</option>
                        <option value="PROPRIO">VEÍCULO PRÓPRIO DO TÉCNICO</option>
                      </select>
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

                  <div className="bg-amber-50 text-amber-800 p-3 rounded border border-amber-200">
                    <strong>Atenção:</strong> Nem sempre o valor final cobrado é o que foi executado/calculado. Use os campos abaixo para definir ou ajustar livremente os valores reais que serão faturados.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-150">
                    {/* MAO DE OBRA */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-700 uppercase text-[10px] tracking-wide border-b border-gray-200 pb-1">Mão de Obra e Hora Técnica</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Valor Hora Técnica (R$)</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={valorHoraUnitario || ""}
                            onChange={(e) => setValorHoraUnitario(Number(e.target.value))}
                            disabled={status === "FINALIZADA" || status === "CANCELADA"}
                            placeholder="Ex: 150.00"
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Valor Pago Mão de Obra (R$)</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={valorMaoObra || ""}
                            onChange={(e) => setValorMaoObra(Number(e.target.value))}
                            disabled={status === "FINALIZADA" || status === "CANCELADA"}
                            placeholder="Ex: 450.00"
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white font-mono font-bold text-emerald-600"
                          />
                        </div>
                      </div>
                      {(() => {
                        const totalHours = apontamentos.reduce((sum, a) => sum + Number(a.horas_trabalhadas || 0), 0);
                        return totalHours > 0 ? (
                          <span className="text-[9px] text-gray-400 block">
                            Calculado automaticamente com base nos apontamentos: {totalHours.toFixed(2)} hrs apontadas x R$ {Number(valorHoraUnitario).toFixed(2)} = {(totalHours * Number(valorHoraUnitario)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                        ) : null;
                      })()}
                    </div>

                    {/* DESLOCAMENTO */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-700 uppercase text-[10px] tracking-wide border-b border-gray-200 pb-1">Deslocamento</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Valor por KM (R$)</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={valorKmUnitario || ""}
                            onChange={(e) => setValorKmUnitario(Number(e.target.value))}
                            disabled={status === "FINALIZADA" || status === "CANCELADA"}
                            placeholder="Ex: 2.50"
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Valor Total Deslocamento (R$)</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={valorDeslocamento || ""}
                            onChange={(e) => setValorDeslocamento(Number(e.target.value))}
                            disabled={status === "FINALIZADA" || status === "CANCELADA"}
                            placeholder="Ex: 300.00"
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white font-mono font-bold text-emerald-600"
                          />
                        </div>
                      </div>
                      {Number(kmRodado) > 0 ? (
                        <span className="text-[9px] text-gray-400 block">
                          Calculado automaticamente com base no KM: {kmRodado} km rodados x R$ {Number(valorKmUnitario).toFixed(2)} = {(Number(kmRodado) * Number(valorKmUnitario)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      ) : null}
                    </div>

                    {/* OUTRAS DESPESAS */}
                    <div className="space-y-3 sm:col-span-2 border-t border-gray-200 pt-3">
                      <h4 className="font-bold text-gray-700 uppercase text-[10px] tracking-wide border-b border-gray-200 pb-1">Outras Despesas e Fatura</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Despesas Diversas / Serviços de Terceiros (R$)</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={outrosCustos || ""}
                            onChange={(e) => setOutrosCustos(Number(e.target.value))}
                            disabled={status === "FINALIZADA" || status === "CANCELADA"}
                            placeholder="Ex: Hospedagem, alimentação, pedágio..."
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Código NF-e / Fatura Vinculada</label>
                          <input
                            type="text"
                            value={notaFiscal || ""}
                            onChange={(e) => setNotaFiscal(e.target.value)}
                            disabled={status === "FINALIZADA" || status === "CANCELADA"}
                            placeholder="Nº da Nota Fiscal emitida"
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Costs Sum Overview */}
                <div className="border border-gray-200 p-5 rounded-xl bg-gray-50 space-y-4">
                  <h4 className="font-display font-extrabold uppercase text-lg text-brand-ink border-b border-gray-200 pb-1">Orçamento Final do Fechamento</h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 font-bold block">Peças / Insumos:</span>
                      <span className="font-semibold text-gray-800 text-sm mt-0.5 block">{calcularTotalPecas().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block">Mão de Obra / Serviço:</span>
                      <span className="font-semibold text-gray-800 text-sm mt-0.5 block">
                        {Number(valorMaoObra).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block">Deslocamento (KM):</span>
                      <span className="font-semibold text-gray-800 text-sm mt-0.5 block">{Number(valorDeslocamento).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block">Outras Despesas:</span>
                      <span className="font-semibold text-gray-800 text-sm mt-0.5 block">{Number(outrosCustos).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-600 uppercase tracking-wide">Faturamento Total Real/Cobrado:</span>
                    <strong className="font-mono text-xl text-brand-red font-extrabold">{calcularValorTotalOS().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
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
          <div className="os-form-footer flex justify-between items-center bg-white p-4 border-t border-gray-100 rounded-b-xl gap-4">
            <button
              type="button"
              onClick={closeForm}
              className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 shadow-sm flex items-center gap-1.5 text-xs font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar à Lista
            </button>

            <div className="flex gap-2 flex-wrap items-center">
              {currentOS && (
                <>
                  <button
                    type="button"
                    onClick={() => setPrintPreviewOS(currentOS)}
                    className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Visualizar Impressão Completa da O.S."
                  >
                    <Printer className="w-4 h-4 text-white" />
                    <span>IMPRIMIR O.S. (FATURA)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintPreviewCampoOS(currentOS)}
                    className="btn bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Gerar Relatório de Campo em Branco para Preenchimento do Técnico"
                  >
                    <ClipboardList className="w-4 h-4 text-white" />
                    <span>GERAR RELATÓRIO DE CAMPO</span>
                  </button>
                </>
              )}

              {status !== "FINALIZADA" && status !== "CANCELADA" && (
                <>
                  <button
                    type="button"
                    onClick={handleCancelOS}
                    className="btn bg-gray-400 hover:bg-gray-500 text-white text-xs py-2 font-bold"
                  >
                    Cancelar O.S.
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveOS()}
                    className="btn bg-brand-ink hover:bg-gray-800 text-white text-xs py-2 font-bold flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Progresso
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalizeOS}
                    className="btn bg-brand-red hover:bg-brand-red-dark text-white text-xs py-2 font-bold flex items-center gap-1.5 animate-pulse"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Finalizar O.S.
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
            <div className="flex-1 overflow-y-auto p-8 print:p-0 bg-white font-sans" id="printable-os-invoice">
              <div className="space-y-6 text-brand-ink text-xs max-w-[800px] mx-auto print:max-w-none">
                
                {/* Header of Invoice */}
                <div className="border-b-4 border-brand-red pb-4 flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">🚜</span>
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
                        {printPreviewOS.reclamacao_cliente || "Nenhuma reclamação registrada."}
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
                            <td className="p-1.5 text-right font-mono">{p.valor_unitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                            <td className="p-1.5 text-right font-bold font-mono text-gray-800">{(p.quantidade * p.valor_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals & Final Financial Breakdown */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs print:grid-cols-4">
                  <div>
                    <span className="text-gray-400 font-bold block uppercase text-[9px]">Peças e Insumos:</span>
                    <strong className="font-mono text-gray-700 mt-1 block">
                      {(() => {
                        let parsed: PecaItem[] = [];
                        try {
                          const stored = localStorage.getItem(`gst_os_pecas_${printPreviewOS.id}`);
                          if (stored) parsed = JSON.parse(stored);
                        } catch (e) { console.warn(e); }
                        const sum = parsed.reduce((acc, curr) => acc + (curr.quantidade * curr.valor_unitario), 0);
                        return sum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                      })()}
                    </strong>
                  </div>

                  <div>
                    <span className="text-gray-400 font-bold block uppercase text-[9px]">Mão de Obra Técnica:</span>
                    <strong className="font-mono text-gray-700 mt-1 block">
                      {(() => {
                        if (printPreviewOS.valor_mao_obra !== undefined && printPreviewOS.valor_mao_obra > 0) {
                          return printPreviewOS.valor_mao_obra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                        }
                        const tech = tecnicos.find(t => t.id === printPreviewOS.tecnico_id);
                        const rate = tech?.valor_hora || 0;
                        const duration = printPreviewOS.apontamentos?.reduce((acc, curr) => acc + parseFloat(curr.horas_trabalhadas || "0"), 0) || 0;
                        return (duration * rate).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                      })()}
                    </strong>
                  </div>

                  <div>
                    <span className="text-gray-400 font-bold block uppercase text-[9px]">Deslocamento (KM):</span>
                    <strong className="font-mono text-gray-700 mt-1 block">
                      {(() => {
                        if (printPreviewOS.valor_deslocamento !== undefined && printPreviewOS.valor_deslocamento > 0) {
                          return printPreviewOS.valor_deslocamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                        }
                        const km = printPreviewOS.km_rodado_total || printPreviewOS.km_rodado || 0;
                        return (Number(km) * 2.5).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                      })()}
                    </strong>
                  </div>

                  <div className="border-l pl-4 border-gray-300">
                    <span className="text-brand-red font-extrabold block uppercase text-[9px]">Valor Total Faturado:</span>
                    <strong className="font-mono text-base text-brand-red font-black mt-1 block">
                      {(() => {
                        if (printPreviewOS.valor_total !== undefined && printPreviewOS.valor_total > 0) {
                          return printPreviewOS.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                        }
                        let parsed: PecaItem[] = [];
                        try {
                          const stored = localStorage.getItem(`gst_os_pecas_${printPreviewOS.id}`);
                          if (stored) parsed = JSON.parse(stored);
                        } catch (e) { console.warn(e); }
                        const sumPecas = parsed.reduce((acc, curr) => acc + (curr.quantidade * curr.valor_unitario), 0);

                        const tech = tecnicos.find(t => t.id === printPreviewOS.tecnico_id);
                        const rate = tech?.valor_hora || 0;
                        const duration = printPreviewOS.apontamentos?.reduce((acc, curr) => acc + parseFloat(curr.horas_trabalhadas || "0"), 0) || 0;
                        const sumTech = printPreviewOS.valor_mao_obra !== undefined && printPreviewOS.valor_mao_obra > 0
                          ? printPreviewOS.valor_mao_obra
                          : duration * rate;

                        const km = printPreviewOS.km_rodado_total || printPreviewOS.km_rodado || 0;
                        const sumDesloc = printPreviewOS.valor_deslocamento !== undefined && printPreviewOS.valor_deslocamento > 0
                          ? printPreviewOS.valor_deslocamento
                          : Number(km) * 2.5;

                        const other = Number(printPreviewOS.valor_terceiros || printPreviewOS.outros_custos || 0);

                        return (sumPecas + sumTech + sumDesloc + other).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                      })()}
                    </strong>
                  </div>
                </div>

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
            <div className="flex-1 overflow-y-auto p-8 print:p-0 bg-white font-sans text-xs text-black" id="printable-os-campo">
              <div className="max-w-[850px] mx-auto space-y-4 border border-black p-5 rounded-xl bg-white print:max-w-none print:border-none print:p-0">
                
                {/* 1. TOP HEADER BRAND BOX */}
                <div className="grid grid-cols-12 border border-black rounded-lg overflow-hidden bg-white">
                  {/* Brand Logo Column */}
                  <div className="col-span-4 p-3 flex flex-col justify-between items-center text-center bg-white border-r border-black min-h-[64px]">
                    {company?.logo ? (
                      <div className="max-h-12 flex items-center justify-center">
                        <img 
                          src={company.logo} 
                          alt="Logo" 
                          className="max-h-11 max-w-full object-contain" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-center">
                        {/* Stylized Red Logo Icon with dynamic brand name */}
                        <div className="w-10 h-10 bg-[#E30613] rounded-lg flex items-center justify-center text-white font-black text-2xl tracking-tighter shadow-sm shrink-0">
                          {company?.nome ? company.nome.charAt(0).toUpperCase() : "D"}
                        </div>
                        <div className="text-left leading-none">
                          <span className="font-display font-extrabold text-lg text-black tracking-tight block">
                            {company?.nome ? company.nome.split(" ")[0].substring(0, 10).toUpperCase() : "DANIEL"}
                          </span>
                          <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest block">
                            {company?.nome ? company.nome.split(" ").slice(1).join(" ").substring(0, 20).toUpperCase() : "TRATORES AGRÍCOLA"}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="text-[8px] font-black text-black uppercase tracking-wide mt-2 border-t border-gray-150 pt-1 w-full text-center">
                      {company?.subtitulo || "SEMPRE AO LADO DE QUEM PRODUZ"}
                    </div>
                  </div>

                  {/* Company Info Column */}
                  <div className="col-span-5 p-2.5 flex flex-col justify-center text-center text-[9px] border-r border-black font-sans leading-relaxed text-gray-700 bg-white">
                    <strong className="text-[10.5px] font-black text-black uppercase">
                      {company?.nome || "Daniel Tratores Agrícola Ltda"}
                    </strong>
                    {company?.cnpj || company?.inscricao_estadual ? (
                      <span className="font-semibold text-[8.5px]">
                        {company.cnpj ? `CNPJ: ${company.cnpj}` : ""}
                        {company.cnpj && company.inscricao_estadual ? " – " : ""}
                        {company.inscricao_estadual ? `INSC. EST. ${company.inscricao_estadual}` : ""}
                      </span>
                    ) : (
                      <span className="font-semibold text-[8.5px]">CNPJ: 11.994.044/0001-09 – INSC. EST. 0000000306735-1</span>
                    )}
                    <span className="text-[8.5px]">
                      {company?.endereco || "Rodovia BR 364, KM 516, Nº 3949 – Ariquemes/ RO – 76877-225"}
                    </span>
                    <span className="font-semibold text-[8.5px]">
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
                  <div className="col-span-3 p-3 flex flex-col justify-center items-center text-center bg-white">
                    <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Relatório Nº</span>
                    <strong className="text-xl font-mono text-[#E30613] font-black tracking-tight mt-0.5">
                      {printPreviewCampoOS.numero_os}
                    </strong>
                  </div>
                </div>

                {/* 2. MAIN REPORT TITLE */}
                <div className="text-center relative py-1">
                  <h2 className="text-lg font-black uppercase text-black tracking-widest border-b border-black pb-0.5 inline-block">
                    RELATÓRIO DE CAMPO
                  </h2>
                  <div className="text-[8px] font-bold text-black absolute left-0 bottom-0">
                    *Obrigatório o preenchimento de todos os campos.
                  </div>
                </div>

                {/* 3. DADOS DO CLIENTE */}
                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1 border-b border-black font-bold uppercase tracking-wide text-[9.5px] text-black">
                    DADOS DO CLIENTE
                  </div>
                  <div className="p-3 space-y-2 text-[10.5px]">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Nome:</span>
                      <span className="border-b border-gray-400 font-bold text-gray-900 px-1 py-0.5 min-h-[20px] min-w-[280px] flex-1">
                        {printPreviewCampoOS.clientes?.razao_social || ""}
                      </span>
                      
                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Responsável:</span>
                      <span className="border-b border-gray-400 font-semibold text-gray-800 px-1 py-0.5 min-h-[20px] min-w-[140px] flex-1">
                        {printPreviewCampoOS.clientes?.nome_contato || ""}
                      </span>

                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Data:</span>
                      <span className="border-b border-gray-400 font-mono text-gray-800 px-1 py-0.5 min-h-[20px] min-w-[80px] text-center">
                        {printPreviewCampoOS.data_atendimento ? new Date(printPreviewCampoOS.data_atendimento).toLocaleDateString("pt-BR") : ""}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Cidade:</span>
                      <span className="border-b border-gray-400 font-semibold text-gray-800 px-1 py-0.5 min-h-[20px] min-w-[180px] flex-1">
                        {printPreviewCampoOS.clientes?.cidade || ""}
                      </span>

                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Estado:</span>
                      <span className="border-b border-gray-400 font-semibold text-gray-800 px-1 py-0.5 min-h-[20px] min-w-[60px] text-center">
                        {printPreviewCampoOS.clientes?.uf || ""}
                      </span>

                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Telefone:</span>
                      <span className="border-b border-gray-400 font-semibold text-gray-800 px-1 py-0.5 min-h-[20px] min-w-[150px] flex-1">
                        {printPreviewCampoOS.clientes?.telefone || ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. DADOS DA MÁQUINA */}
                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1 border-b border-black font-bold uppercase tracking-wide text-[9.5px] text-black">
                    DADOS DA MÁQUINA
                  </div>
                  <div className="p-3 space-y-2 text-[10.5px]">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Modelo:</span>
                      <span className="border-b border-gray-400 font-bold text-gray-900 px-1 py-0.5 min-h-[20px] min-w-[200px] flex-1">
                        {printPreviewCampoOS.implementos?.modelo || ""}
                      </span>

                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Nº de série:</span>
                      <span className="border-b border-gray-400 font-mono text-gray-800 px-1 py-0.5 min-h-[20px] min-w-[200px] flex-1">
                        {printPreviewCampoOS.implementos?.numero_serie || ""}
                      </span>

                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Trabalho:</span>
                      <span className="flex items-center gap-1 min-w-[100px] font-bold">
                        <span className="inline-block w-3.5 h-3.5 border border-black rounded-sm mr-1"></span> Horas ______
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Potência:</span>
                      <span className="border-b border-gray-400 font-semibold text-gray-800 px-1 py-0.5 min-h-[20px] min-w-[120px] flex-1">
                        {printPreviewCampoOS.implementos?.potencia ? `${printPreviewCampoOS.implementos.potencia} CV` : ""}
                      </span>

                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">RPM:</span>
                      <span className="border-b border-gray-400 font-semibold text-gray-800 px-1 py-0.5 min-h-[20px] min-w-[120px] flex-1">
                        {printPreviewCampoOS.implementos?.rpm || ""}
                      </span>

                      <span className="flex items-center gap-1 min-w-[100px] font-bold">
                        <span className="inline-block w-3.5 h-3.5 border border-black rounded-sm mr-1"></span> Hectares ____
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. DADOS DA ASSISTÊNCIA */}
                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1 border-b border-black font-bold uppercase tracking-wide text-[9.5px] text-black">
                    DADOS DA ASSISTÊNCIA
                  </div>
                  <div className="p-3 text-[10.5px]">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Técnico:</span>
                      <span className="border-b border-gray-400 font-bold text-gray-900 px-1 py-0.5 min-h-[20px] min-w-[180px] flex-1">
                        {tecnicos.find(t => t.id === printPreviewCampoOS.tecnico_id)?.apelido || tecnicos.find(t => t.id === printPreviewCampoOS.tecnico_id)?.nome || ""}
                      </span>

                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Auxiliar Técnico:</span>
                      <span className="border-b border-gray-400 font-semibold text-gray-800 px-1 py-0.5 min-h-[20px] min-w-[180px] flex-1">
                        {tecnicos.find(t => t.id === printPreviewCampoOS.auxiliar_id)?.apelido || tecnicos.find(t => t.id === printPreviewCampoOS.auxiliar_id)?.nome || ""}
                      </span>

                      <span className="font-bold uppercase text-[9.5px] text-gray-700 shrink-0">Telefone:</span>
                      <span className="border-b border-gray-400 font-semibold text-gray-800 px-1 py-0.5 min-h-[20px] min-w-[120px]">
                        {tecnicos.find(t => t.id === printPreviewCampoOS.tecnico_id)?.telefone || ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. APONTAMENTO DE SERVIÇO */}
                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1 border-b border-black font-bold uppercase tracking-wide text-[9.5px] text-black">
                    APONTAMENTO DE SERVIÇO
                  </div>
                  <table className="w-full text-center border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-black font-bold text-gray-700 text-[9px] uppercase bg-white">
                        <th className="p-1.5 border-r border-black w-24">Data</th>
                        <th className="p-1.5 border-r border-black w-24">Hora Inicio</th>
                        <th className="p-1.5 border-r border-black w-28">Intervalo Início</th>
                        <th className="p-1.5 border-r border-black w-28">Intervalo Fim</th>
                        <th className="p-1.5 border-r border-black w-24">Hora Final</th>
                        <th className="p-1.5 w-24">Total Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(3)].map((_, i) => (
                        <tr key={i} className="border-b border-black last:border-b-0 h-[28px] bg-white">
                          <td className="p-1 border-r border-black font-mono text-gray-400">___ / ___ / ____</td>
                          <td className="p-1 border-r border-black font-mono text-gray-400">____ : ____</td>
                          <td className="p-1 border-r border-black font-mono text-gray-400">____ : ____</td>
                          <td className="p-1 border-r border-black font-mono text-gray-400">____ : ____</td>
                          <td className="p-1 border-r border-black font-mono text-gray-400">____ : ____</td>
                          <td className="p-1 font-mono text-gray-400">____________</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 7. APONTAMENTO DE DESLOCAMENTO */}
                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1 border-b border-black font-bold uppercase tracking-wide text-[9.5px] text-black">
                    APONTAMENTO DE DESLOCAMENTO
                  </div>
                  <table className="w-full text-center border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-black font-bold text-gray-700 text-[9px] uppercase bg-white">
                        <th className="p-1.5 border-r border-black w-24">Data</th>
                        <th className="p-1.5 border-r border-black w-24">Hora Inicio</th>
                        <th className="p-1.5 border-r border-black w-24">Hora Final</th>
                        <th className="p-1.5 border-r border-black w-28">KM Inicial</th>
                        <th className="p-1.5 border-r border-black w-28">KM Final</th>
                        <th className="p-1.5 w-24">Total KM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(2)].map((_, i) => (
                        <tr key={i} className="border-b border-black last:border-b-0 h-[28px] bg-white">
                          <td className="p-1 border-r border-black font-mono text-gray-400">___ / ___ / ____</td>
                          <td className="p-1 border-r border-black font-mono text-gray-400">____ : ____</td>
                          <td className="p-1 border-r border-black font-mono text-gray-400">____ : ____</td>
                          <td className="p-1 border-r border-black font-mono text-gray-400">________________</td>
                          <td className="p-1 border-r border-black font-mono text-gray-400">________________</td>
                          <td className="p-1 font-mono text-gray-400">____________</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 8. DECLARATIVE CLAUSES & TERMS */}
                <div className="border border-black rounded-lg p-2.5 space-y-2 bg-white text-[9px] leading-snug">
                  <span className="font-bold text-black uppercase block">Os Signatários deste certificado (usuário e revenda) declaram que:</span>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <span className="inline-block w-3 h-3 border border-black rounded-sm shrink-0 mt-0.5"></span>
                      <p className="text-gray-800">
                        A máquina acima especificada foi colocada em serviço segundo as instruções da fábrica e da revenda pelo usuário abaixo identificado.
                      </p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="inline-block w-3 h-3 border border-black rounded-sm shrink-0 mt-0.5"></span>
                      <p className="text-gray-800">
                        O usuário recebeu da revenda todas as instruções relativas à utilização e manutenção da máquina e aos dispositivos de segurança que a equipam, conforme descrito no manual de instruções entregue.
                      </p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="inline-block w-3 h-3 border border-black rounded-sm shrink-0 mt-0.5"></span>
                      <p className="text-gray-800">
                        O usuário foi informado pela revenda das condições de garantia.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-12 pt-1 font-bold text-black">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3.5 h-3.5 border border-black rounded-sm"></span> Assistência com pedido de garantia
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3.5 h-3.5 border border-black rounded-sm"></span> Visita técnica para regulagem/ montagem de peças
                    </div>
                  </div>
                </div>

                {/* 9. NÃO CONFORMIDADE BLOCK */}
                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1 border-b border-black font-bold uppercase tracking-wide text-[9.5px] text-black">
                    NÃO CONFORMIDADE
                  </div>
                  <div className="p-3 space-y-4 bg-white">
                    {[...Array(22)].map((_, i) => (
                      <div key={i} className="border-b border-gray-300 h-2"></div>
                    ))}
                  </div>
                </div>

                {/* 10. DECLARATION CLAUSE AND SIGNATURES */}
                <div className="space-y-4 pt-2">
                  <p className="font-bold italic text-black text-[9.5px]">
                    Declaro que li e estou de acordo com todos os termos acima.
                  </p>

                  <div className="grid grid-cols-2 gap-16 text-center text-[10px] pt-4">
                    <div className="space-y-1">
                      <div className="font-bold text-black">____________________________________________________</div>
                      <div className="font-black text-gray-800 uppercase tracking-wide">Cliente/ Responsável</div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-black">____________________________________________________</div>
                      <div className="font-black text-gray-800 uppercase tracking-wide">Técnico</div>
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
