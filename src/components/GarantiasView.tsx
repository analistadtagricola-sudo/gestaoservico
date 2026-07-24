import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  Clock, 
  Search, 
  PlusCircle, 
  Tractor, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Edit3, 
  FileText, 
  Database,
  ChevronRight,
  X,
  Layers,
  Wrench,
  DollarSign,
  CheckCircle,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { Implemento, OrdemServico, Cliente, PlanoManutencao, PlanoRevisao } from "../types";
import { API } from "../lib/api";

interface GarantiasViewProps {
  onNavigate?: (view: string, targetId?: number) => void;
}

export interface WarrantyItem {
  implemento: Implemento;
  clienteName: string;
  plano?: PlanoManutencao;
  dataEntrega: string | null;
  dataExpiracao: string | null;
  diasRestantes: number | null;
  garantiaMeses: number;
  horimetroAtual: number;
  horimetroLimite: number;
  horasRestantes: number;
  revisoesPendentesCount: number;
  status: "VIGENTE" | "EXPIRANDO" | "EXPIRADA" | "PERDIDA_SEM_REVISAO";
  motivoPerda?: string;
  totalOSGarantiaCount: number;
  totalOSGarantiaValor: number;
}

export interface ChamadoGarantia {
  id: string;
  tipo_objeto?: "EQUIPAMENTO" | "PECA";
  implemento_id?: number;
  codigo_peca?: string;
  descricao_peca?: string;
  nota_fiscal_peca?: string;
  fabricante_peca?: string;
  cliente_id: number;
  data_abertura: string;
  solicitante: string;
  tipo_problema: string; // MECANICO, HIDRAULICO, ELETRICO, ESTRUTURAL, PECA_DEFEITO
  descricao: string;
  horimetro: number;
  status: "ABERTO" | "EM_ANALISE" | "APROVADO_PARA_OS" | "CONVERTIDO_OS" | "REJEITADO";
  parecer_tecnico?: string;
  ordem_servico_id?: number;
}

export const GarantiasView: React.FC<GarantiasViewProps> = ({ onNavigate }) => {
  const [implementos, setImplementos] = useState<Implemento[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs inside GarantiasView
  const [activeTab, setActiveTab] = useState<"frota" | "chamados">("frota");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODAS");
  const [chamadoStatusFilter, setChamadoStatusFilter] = useState<string>("TODOS");

  // Chamados State
  const [chamados, setChamados] = useState<ChamadoGarantia[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gst_chamados_garantia");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [
      {
        id: "CG-1001",
        implemento_id: 1,
        cliente_id: 1,
        data_abertura: "2026-06-15",
        solicitante: "João Fazenda Santa Rita",
        tipo_problema: "HIDRAULICO",
        descricao: "Vazamento no cilindro de levante principal após 120 horas de operação.",
        horimetro: 180,
        status: "APROVADO_PARA_OS",
        parecer_tecnico: "Defeito de fabricação na vedação hidráulica. Aprovado para abertura de O.S. de garantia.",
      },
      {
        id: "CG-1002",
        implemento_id: 2,
        cliente_id: 2,
        data_abertura: "2026-07-02",
        solicitante: "Carlos Operador",
        tipo_problema: "MECANICO",
        descricao: "Folga excessiva no mancal do disco de corte esquerdo.",
        horimetro: 340,
        status: "EM_ANALISE",
        parecer_tecnico: "Aguardando laudo técnico fotográfico do campo.",
      }
    ];
  });



  // Modal State for New Chamado
  const [novoChamadoModalOpen, setNovoChamadoModalOpen] = useState(false);
  const [formTipoObjeto, setFormTipoObjeto] = useState<"EQUIPAMENTO" | "PECA">("EQUIPAMENTO");
  const [formClienteId, setFormClienteId] = useState<number>(0);
  const [formCodigoPeca, setFormCodigoPeca] = useState("");
  const [formDescricaoPeca, setFormDescricaoPeca] = useState("");
  const [formNfPeca, setFormNfPeca] = useState("");
  const [formFabricantePeca, setFormFabricantePeca] = useState("");
  const [formImplId, setFormImplId] = useState<number>(0);
  const [implSearchTerm, setImplSearchTerm] = useState("");
  const [showImplDropdown, setShowImplDropdown] = useState(false);
  const [formSolicitante, setFormSolicitante] = useState("");
  const [formTipoProblema, setFormTipoProblema] = useState("MECANICO");
  const [formDescricao, setFormDescricao] = useState("");
  const [formHorimetroChamado, setFormHorimetroChamado] = useState<number>(0);

  // Modal State for Analisar / Parecer
  const [analiseModalOpen, setAnaliseModalOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<ChamadoGarantia | null>(null);
  const [formParecer, setFormParecer] = useState("");
  const [formNovoStatusChamado, setFormNovoStatusChamado] = useState<any>("EM_ANALISE");

  // Toast notification
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [convertingChamadoId, setConvertingChamadoId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [implList, osList, cliList, planList, chamadosList] = await Promise.all([
        API.implementos.listar(),
        API.ordensServico.listar(),
        API.clientes.listar(),
        API.planos.listar(),
        API.chamadosGarantia.listar()
      ]);

      const rawOS = osList || [];
      const rawChamados = chamadosList || [];

      // Auto-reconcile chamados that already have an associated OS created
      const reconciledChamados = rawChamados.map((chamado: ChamadoGarantia) => {
        if (chamado.status !== "CONVERTIDO_OS") {
          const matchingOS = rawOS.find((os: OrdemServico) => 
            os.id === chamado.ordem_servico_id || 
            (os.reclamacao && (os.reclamacao.includes(`CHAMADO GARANTIA #${chamado.id}`) || os.reclamacao.includes(`#${chamado.id}`))) ||
            (os.observacao && (os.observacao.includes(`CHAMADO GARANTIA #${chamado.id}`) || os.observacao.includes(`#${chamado.id}`)))
          );
          if (matchingOS) {
            const updatedChamado = {
              ...chamado,
              status: "CONVERTIDO_OS" as const,
              ordem_servico_id: matchingOS.id
            };
            API.chamadosGarantia.atualizar(chamado.id, updatedChamado).catch(() => {});
            return updatedChamado;
          }
        }
        return chamado;
      });

      setImplementos(implList || []);
      setOrdens(rawOS);
      setClientes(cliList || []);
      setPlanos(planList || []);
      setChamados(reconciledChamados);
    } catch (err) {
      console.error("Erro ao carregar dados de garantia:", err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Save chamados to localStorage and Supabase
  const saveChamadosToStorage = async (updated: ChamadoGarantia[]) => {
    setChamados(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("gst_chamados_garantia", JSON.stringify(updated));
    }
  };

  const handleCriarChamado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formTipoObjeto === "EQUIPAMENTO") {
      if (!formImplId || !formDescricao) {
        showToast("Selecione o equipamento e informe a descrição do problema.", "error");
        return;
      }
    } else {
      if (!formClienteId || !formDescricaoPeca || !formDescricao) {
        showToast("Selecione o cliente, a descrição da peça e o relato do problema.", "error");
        return;
      }
    }

    let cliId = 1;
    let implId: number | undefined = undefined;
    if (formTipoObjeto === "EQUIPAMENTO") {
      const impl = implementos.find(i => i.id === Number(formImplId));
      if (!impl) return;
      cliId = impl.cliente_id || 1;
      implId = Number(formImplId);
    } else {
      cliId = Number(formClienteId) || 1;
    }

    const newChamado: ChamadoGarantia = {
      id: `CG-${Math.floor(1000 + Math.random() * 9000)}`,
      tipo_objeto: formTipoObjeto,
      implemento_id: implId,
      codigo_peca: formTipoObjeto === "PECA" ? formCodigoPeca : undefined,
      descricao_peca: formTipoObjeto === "PECA" ? formDescricaoPeca : undefined,
      nota_fiscal_peca: formTipoObjeto === "PECA" ? formNfPeca : undefined,
      fabricante_peca: formTipoObjeto === "PECA" ? formFabricantePeca : undefined,
      cliente_id: cliId,
      data_abertura: new Date().toISOString().split("T")[0],
      solicitante: formSolicitante || "Solicitante Interno",
      tipo_problema: formTipoProblema,
      descricao: formDescricao,
      horimetro: formTipoObjeto === "EQUIPAMENTO" ? (formHorimetroChamado || 0) : 0,
      status: "ABERTO",
      parecer_tecnico: "Chamado aberto, aguardando triagem técnica."
    };

    try {
      await API.chamadosGarantia.inserir(newChamado);
      const updatedList = [newChamado, ...chamados];
      saveChamadosToStorage(updatedList);
      showToast(`Chamado de Garantia #${newChamado.id} (${formTipoObjeto === "PECA" ? "Peça" : "Equipamento"}) aberto e salvo no banco com sucesso!`);
    } catch (err) {
      console.error("Erro ao salvar chamado:", err);
      saveChamadosToStorage([newChamado, ...chamados]);
      showToast(`Chamado #${newChamado.id} criado localmente (erro ao sincronizar com banco).`, "error");
    }

    setNovoChamadoModalOpen(false);
    setFormDescricao("");
    setFormSolicitante("");
    setFormCodigoPeca("");
    setFormDescricaoPeca("");
    setFormNfPeca("");
    setFormFabricantePeca("");
  };

  const handleSalvarParecer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChamado) return;

    const updatedChamado = {
      ...selectedChamado,
      status: formNovoStatusChamado,
      parecer_tecnico: formParecer
    };

    try {
      await API.chamadosGarantia.atualizar(selectedChamado.id, updatedChamado);
      const updated = chamados.map(c => c.id === selectedChamado.id ? updatedChamado : c);
      saveChamadosToStorage(updated);
      showToast(`Chamado #${selectedChamado.id} atualizado e sincronizado com sucesso!`);
    } catch (err) {
      console.error("Erro ao atualizar parecer:", err);
      const updated = chamados.map(c => c.id === selectedChamado.id ? updatedChamado : c);
      saveChamadosToStorage(updated);
      showToast(`Chamado #${selectedChamado.id} atualizado localmente.`, "error");
    }

    setAnaliseModalOpen(false);
    setSelectedChamado(null);
  };

  const handleConverterEmOS = async (chamado: ChamadoGarantia) => {
    if (chamado.status === "CONVERTIDO_OS") {
      showToast("Este chamado já foi convertido em Ordem de Serviço.", "error");
      return;
    }

    if (convertingChamadoId) return;

    setConvertingChamadoId(chamado.id);
    try {
      const impl = chamado.implemento_id ? implementos.find(i => i.id === chamado.implemento_id) : undefined;
      
      let validClienteId = chamado.cliente_id;
      if (!clientes.some(c => c.id === validClienteId)) {
        if (impl?.cliente_id && clientes.some(c => c.id === impl.cliente_id)) {
          validClienteId = impl.cliente_id;
        } else if (clientes.length > 0) {
          validClienteId = clientes[0].id!;
        } else {
          validClienteId = 1;
        }
      }

      const newOsData: OrdemServico = {
        numero_os: "",
        cliente_id: validClienteId,
        implemento_id: chamado.implemento_id,
        status: "ABERTA",
        tipo_atendimento: "Garantia",
        reclamacao: `[CHAMADO GARANTIA #${chamado.id}] ${chamado.tipo_objeto === "PECA" ? `PEÇA: ${chamado.descricao_peca} (Cód: ${chamado.codigo_peca || "N/D"}, NF: ${chamado.nota_fiscal_peca || "N/D"}) - ` : ""} (${chamado.tipo_problema}) ${chamado.descricao}`,
        observacao: `Parecer Técnico: ${chamado.parecer_tecnico || "Aprovado para garantia de fábrica."}. Solicitante: ${chamado.solicitante}`,
        horimetro: chamado.horimetro || impl?.horimetro_atual || 0,
        valor_total: 0
      };

      const savedOS = await API.ordensServico.inserir(newOsData);
      const createdId = savedOS?.id || Math.floor(Math.random() * 100000);

      const updatedChamadoObj: ChamadoGarantia = {
        ...chamado,
        status: "CONVERTIDO_OS",
        ordem_servico_id: createdId
      };

      try {
        await API.chamadosGarantia.atualizar(chamado.id, updatedChamadoObj);
      } catch (err) {
        console.warn("Erro ao sincronizar atualização do chamado no backend:", err);
      }

      const updatedList = chamados.map(c => c.id === chamado.id ? updatedChamadoObj : c);
      saveChamadosToStorage(updatedList);
      showToast(`Chamado #${chamado.id} convertido em Ordem de Serviço #${savedOS?.numero_os || newOsData.numero_os} com sucesso!`);
      await loadAllData();
    } catch (err) {
      console.error("Erro ao converter chamado em O.S.:", err);
      showToast("Erro ao gerar Ordem de Serviço a partir do chamado.", "error");
    } finally {
      setConvertingChamadoId(null);
    }
  };

  // Load all revisions from localStorage
  const allRevisoesRaw = typeof window !== "undefined" ? localStorage.getItem("gst_revisoes") : null;
  const allRevisoesList: any[] = allRevisoesRaw ? JSON.parse(allRevisoesRaw) : [];

  const clientesMap = new Map(clientes.map(c => [c.id, c.razao_social || c.nome_fantasia || "Cliente"]));
  const planosMap = new Map<string, any>(planos.map((p: any) => [p.id, p]));

  // Process Warranty Items
  const warrantyItems: WarrantyItem[] = implementos.map((impl) => {
    const clienteName = clientesMap.get(impl.cliente_id!) || "Cliente Não Informado";
    const plano = impl.plano_id ? planosMap.get(impl.plano_id) : undefined;
    const garantiaMeses = plano?.garantia_meses || 12;

    // Delivery date
    const dataEntrega = impl.data_entrega || null;
    let dataExpiracao: string | null = null;
    let diasRestantes: number | null = null;

    if (dataEntrega) {
      const entregaDate = new Date(dataEntrega);
      if (!isNaN(entregaDate.getTime())) {
        const expDate = new Date(entregaDate);
        expDate.setMonth(expDate.getMonth() + garantiaMeses);
        dataExpiracao = expDate.toISOString().split("T")[0];

        const today = new Date();
        const diffMs = expDate.getTime() - today.getTime();
        diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }
    }

    // Horímetro limits
    const relatedOS = ordens.filter(o => o.implemento_id === impl.id);
    const osMaxH = relatedOS.reduce((max, o) => Math.max(max, Number(o.horimetro_final) || Number(o.horimetro) || 0), 0);
    const horimetroAtual = Math.max(Number(impl.horimetro_atual) || 0, osMaxH);

    // Max horimeter limit from plan or default 2000h
    let horimetroLimite = 2000;
    if (plano) {
      const planRevs = allRevisoesList.filter((r: any) => r.id_plano === (plano as any).id);
      if (planRevs.length > 0) {
        horimetroLimite = Math.max(...planRevs.map((r: any) => r.horas_limite));
      }
    }

    const horasRestantes = horimetroLimite - horimetroAtual;

    // Check finished OS for revisions
    const finishedOS = relatedOS.filter(o => o.status === "FINALIZADA");
    let revisoesPendentesCount = 0;

    if (plano) {
      const planRevs = allRevisoesList.filter((r: any) => r.id_plano === (plano as any).id);
      for (const rev of planRevs) {
        if (horimetroAtual >= rev.horas_limite) {
          const finished = finishedOS.some(o => {
            const hFinal = Number(o.horimetro_final) || Number(o.horimetro) || 0;
            const desc = (o.reclamacao || o.observacao || "").toLowerCase();
            return hFinal >= (rev.horas_limite - 50) || desc.includes(`revisão de ${rev.horas_limite}`) || desc.includes(`revisao ${rev.horas_limite}h`);
          });
          if (!finished) {
            revisoesPendentesCount++;
          }
        }
      }
    }

    // Determine status
    let status: WarrantyItem["status"] = "VIGENTE";
    let motivoPerda = "";

    if (revisoesPendentesCount > 0 && horimetroAtual > 1000) {
      status = "PERDIDA_SEM_REVISAO";
      motivoPerda = `Possui ${revisoesPendentesCount} revisão(ões) preventiva(s) obrigatória(s) pendente(s) no horímetro limite.`;
    } else if (diasRestantes !== null && diasRestantes < 0) {
      status = "EXPIRADA";
    } else if (horasRestantes < 0) {
      status = "EXPIRADA";
    } else if ((diasRestantes !== null && diasRestantes <= 30) || horasRestantes <= 100) {
      status = "EXPIRANDO";
    }

    // Warranty OS stats
    const osGarantiaList = relatedOS.filter(o => {
      const tipo = String(o.tipo_atendimento || "");
      const obs = (o.observacao || "").toLowerCase();
      const rec = (o.reclamacao || "").toLowerCase();
      return tipo.includes("garantia") || obs.includes("garantia") || rec.includes("garantia");
    });

    const totalOSGarantiaCount = osGarantiaList.length;
    const totalOSGarantiaValor = osGarantiaList.reduce((acc, cur) => acc + (Number(cur.valor_total) || 0), 0);

    return {
      implemento: impl,
      clienteName,
      plano,
      dataEntrega,
      dataExpiracao,
      diasRestantes,
      garantiaMeses,
      horimetroAtual,
      horimetroLimite,
      horasRestantes,
      revisoesPendentesCount,
      status,
      motivoPerda,
      totalOSGarantiaCount,
      totalOSGarantiaValor
    };
  });

  // Filter items
  const filteredItems = warrantyItems.filter(item => {
    const matchesSearch = 
      item.implemento.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.implemento.numero_serie?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clienteName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "TODAS") return true;
    if (statusFilter === "VIGENTE") return item.status === "VIGENTE";
    if (statusFilter === "EXPIRANDO") return item.status === "EXPIRANDO";
    if (statusFilter === "EXPIRADA") return item.status === "EXPIRADA";
    if (statusFilter === "PERDIDA") return item.status === "PERDIDA_SEM_REVISAO";

    return true;
  });

  // KPI Counts
  const vigentesCount = warrantyItems.filter(i => i.status === "VIGENTE").length;
  const expirandoCount = warrantyItems.filter(i => i.status === "EXPIRANDO").length;
  const expiradasCount = warrantyItems.filter(i => i.status === "EXPIRADA").length;
  const perdidasCount = warrantyItems.filter(i => i.status === "PERDIDA_SEM_REVISAO").length;



  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 text-white ${
          toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black font-display text-gray-900 uppercase tracking-tight">
              Controle de Garantias e Chamados
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Gestão de chamados de garantia, triagem técnica e conversão em Ordens de Serviço (O.S.).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const first = implementos[0];
              setFormImplId(first?.id || 0);
              setFormHorimetroChamado(first?.horimetro_atual || 0);
              setImplSearchTerm(first ? `${first.fabricante} ${first.modelo} (Série: ${first.numero_serie})` : "");
              setFormTipoObjeto("EQUIPAMENTO");
              setNovoChamadoModalOpen(true);
            }}
            className="px-4 py-2.5 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" /> Novo Chamado de Garantia
          </button>
        </div>
      </div>

      {/* 5 Indicator KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Vigentes */}
        <div 
          onClick={() => { setActiveTab("frota"); setStatusFilter("VIGENTE"); }}
          className={`p-4 bg-white border rounded-2xl shadow-2xs hover:shadow-xs cursor-pointer transition-all ${
            statusFilter === "VIGENTE" && activeTab === "frota" ? "ring-2 ring-emerald-500 border-emerald-300" : "border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Vigentes</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-emerald-600 mt-2 block">{vigentesCount}</span>
          <span className="text-[10px] text-gray-400 font-bold mt-0.5 block">Cobertura Ativa</span>
        </div>

        {/* Expirando (<30 dias ou <100h) */}
        <div 
          onClick={() => { setActiveTab("frota"); setStatusFilter("EXPIRANDO"); }}
          className={`p-4 bg-white border rounded-2xl shadow-2xs hover:shadow-xs cursor-pointer transition-all ${
            statusFilter === "EXPIRANDO" && activeTab === "frota" ? "ring-2 ring-amber-500 border-amber-300" : "border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">Expirando Próximas</span>
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-amber-600 mt-2 block">{expirandoCount}</span>
          <span className="text-[10px] text-amber-800 font-bold mt-0.5 block">&lt;30 dias ou &lt;100h</span>
        </div>

        {/* Expiradas / Vencidas */}
        <div 
          onClick={() => { setActiveTab("frota"); setStatusFilter("EXPIRADA"); }}
          className={`p-4 bg-white border rounded-2xl shadow-2xs hover:shadow-xs cursor-pointer transition-all ${
            statusFilter === "EXPIRADA" && activeTab === "frota" ? "ring-2 ring-gray-400 border-gray-400" : "border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider">Expiradas</span>
            <div className="p-1.5 bg-gray-100 text-gray-600 rounded-lg">
              <ShieldX className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-gray-600 mt-2 block">{expiradasCount}</span>
          <span className="text-[10px] text-gray-400 font-bold mt-0.5 block">Prazo ou Horímetro excedidos</span>
        </div>

        {/* Perda de Garantia */}
        <div 
          onClick={() => { setActiveTab("frota"); setStatusFilter("PERDIDA"); }}
          className={`p-4 bg-rose-50/80 border rounded-2xl shadow-2xs hover:shadow-xs cursor-pointer transition-all ${
            statusFilter === "PERDIDA" && activeTab === "frota" ? "ring-2 ring-rose-500 border-rose-300" : "border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-rose-800 tracking-wider">Garantia Anulada</span>
            <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-rose-600 mt-2 block">{perdidasCount}</span>
          <span className="text-[10px] text-rose-700 font-bold mt-0.5 block">Falta de revisão obrigatória</span>
        </div>

        {/* Chamados Abertos */}
        <div 
          onClick={() => setActiveTab("chamados")}
          className={`p-4 bg-white border rounded-2xl shadow-2xs hover:shadow-xs cursor-pointer transition-all ${
            activeTab === "chamados" ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-blue-700 tracking-wider">Chamados Garantia</span>
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-blue-600 mt-2 block">{chamados.length}</span>
          <span className="text-[10px] text-blue-700 font-bold mt-0.5 block">Controle de chamados</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab("frota")}
          className={`pb-3 px-4 text-xs font-extrabold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "frota"
              ? "border-brand-red text-brand-red"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <Tractor className="w-4 h-4" />
          Status da Frota e Vigência ({filteredItems.length})
        </button>

        <button
          onClick={() => setActiveTab("chamados")}
          className={`pb-3 px-4 text-xs font-extrabold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "chamados"
              ? "border-brand-red text-brand-red"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          Controle de Chamados de Garantia ({chamados.length})
        </button>
      </div>

      {/* TAB 1: FROTA E VIGÊNCIA */}
      {activeTab === "frota" && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por modelo, série ou cliente..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {["TODAS", "VIGENTE", "EXPIRANDO", "EXPIRADA", "PERDIDA"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? "bg-slate-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {st === "TODAS" ? "Todas" : st === "PERDIDA" ? "Anuladas" : st}
                </button>
              ))}
            </div>
          </div>

          {/* Equipments Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="font-extrabold text-sm uppercase">Nenhum equipamento encontrado</p>
                <p className="text-xs text-gray-400 mt-1">Tente ajustar os filtros de busca ou cadastrar novos implementos.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-black">
                      <th className="p-4">Equipamento / Série</th>
                      <th className="p-4">Cliente / Fazenda</th>
                      <th className="p-4">Início / Término</th>
                      <th className="p-4">Horímetro Atual / Limite</th>
                      <th className="p-4">Status da Garantia</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredItems.map((item) => {
                      const impl = item.implemento;
                      return (
                        <tr key={impl.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-100 text-slate-700 rounded-xl shrink-0">
                                <Tractor className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-black text-gray-900 block">{impl.fabricante} {impl.modelo}</span>
                                <span className="font-mono text-[10px] text-gray-400 font-bold">Série: {impl.numero_serie || "N/D"}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="font-bold text-gray-800 block">{item.clienteName}</span>
                            <span className="text-[10px] text-gray-400 font-medium">Plano: {item.plano ? `${item.plano.fabricante} ${item.plano.modelo}` : "Padrão 12 Meses"}</span>
                          </td>

                          <td className="p-4 font-mono">
                            <span className="block text-gray-800 font-bold">{item.dataEntrega ? new Date(item.dataEntrega).toLocaleDateString("pt-BR") : "Não informada"}</span>
                            <span className="text-[10px] text-gray-500">Expira: {item.dataExpiracao ? new Date(item.dataExpiracao).toLocaleDateString("pt-BR") : "N/D"}</span>
                          </td>

                          <td className="p-4 font-mono">
                            <span className="block text-gray-800 font-black">{item.horimetroAtual.toLocaleString()} h</span>
                            <span className="text-[10px] text-gray-400">Limite: {item.horimetroLimite} h</span>
                          </td>

                          <td className="p-4">
                            {item.status === "VIGENTE" && (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-black text-[10px] inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> VIGENTE ({item.diasRestantes} dias)
                              </span>
                            )}
                            {item.status === "EXPIRANDO" && (
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-black text-[10px] inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" /> EXPIRANDO BREVE
                              </span>
                            )}
                            {item.status === "EXPIRADA" && (
                              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg font-black text-[10px] inline-flex items-center gap-1">
                                <ShieldX className="w-3 h-3" /> EXPIRADA
                              </span>
                            )}
                            {item.status === "PERDIDA_SEM_REVISAO" && (
                              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-lg font-black text-[10px] inline-flex items-center gap-1" title={item.motivoPerda}>
                                <ShieldAlert className="w-3 h-3" /> ANULADA (REVISÃO PENDENTE)
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setFormImplId(impl.id!);
                                  setFormHorimetroChamado(item.horimetroAtual);
                                  setImplSearchTerm(`${impl.fabricante} ${impl.modelo} (Série: ${impl.numero_serie})`);
                                  setFormTipoObjeto("EQUIPAMENTO");
                                  setNovoChamadoModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[10px] uppercase flex items-center gap-1"
                                title="Abrir Chamado de Garantia para este equipamento"
                              >
                                <PlusCircle className="w-3 h-3" /> Abrir Chamado
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONTROLE DE CHAMADOS DE GARANTIA */}
      {activeTab === "chamados" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 font-display uppercase tracking-wide">
                Controle de Chamados e Solicitações de Garantia
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Abra chamados para triagem técnica antes de convertê-los em Ordem de Serviço (O.S.).
              </p>
            </div>

            <div className="flex items-center gap-2">
              {["TODOS", "ABERTO", "EM_ANALISE", "APROVADO_PARA_OS", "CONVERTIDO_OS", "REJEITADO"].map((st) => (
                <button
                  key={st}
                  onClick={() => setChamadoStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
                    chamadoStatusFilter === st
                      ? "bg-slate-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {st === "TODOS" ? "Todos" : st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {chamados.filter(c => chamadoStatusFilter === "TODOS" || c.status === chamadoStatusFilter).length === 0 ? (
            <div className="p-12 text-center bg-white border border-gray-200 rounded-2xl text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="font-extrabold text-sm uppercase">Nenhum chamado de garantia encontrado</p>
              <p className="text-xs text-gray-400 mt-1">Clique em "Novo Chamado de Garantia" para registrar uma nova solicitação.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {chamados
                .filter(c => chamadoStatusFilter === "TODOS" || c.status === chamadoStatusFilter)
                .map(chamado => {
                  const impl = implementos.find(i => i.id === chamado.implemento_id);
                  const cli = clientes.find(c => c.id === chamado.cliente_id);

                  return (
                    <div 
                      key={chamado.id}
                      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-black rounded-md">
                            {chamado.id}
                          </span>
                          <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md uppercase ${
                            chamado.status === "CONVERTIDO_OS" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                            chamado.status === "APROVADO_PARA_OS" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                            chamado.status === "EM_ANALISE" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                            chamado.status === "REJEITADO" ? "bg-rose-100 text-rose-800 border border-rose-200" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {chamado.status.replace("_", " ")}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-mono text-[10px] font-bold rounded">
                            Tipo: {chamado.tipo_problema}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono">
                            Aberto em: {new Date(chamado.data_abertura).toLocaleDateString("pt-BR")}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-sm text-gray-900">
                            {cli?.razao_social || "Cliente"} — {
                              chamado.tipo_objeto === "PECA" 
                                ? `Peça: ${chamado.descricao_peca} (Cód: ${chamado.codigo_peca || "N/D"} | NF: ${chamado.nota_fiscal_peca || "N/D"})`
                                : `${impl?.fabricante || ""} ${impl?.modelo || "Equipamento"} (Série: ${impl?.numero_serie || "S/N"})`
                            }
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            <strong>Relato do Problema:</strong> {chamado.descricao}
                          </p>
                          {chamado.parecer_tecnico && (
                            <p className="text-xs text-blue-800 bg-blue-50 p-2 rounded-lg mt-2 border border-blue-100">
                              <strong>Parecer Técnico:</strong> {chamado.parecer_tecnico}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase block">{chamado.tipo_objeto === "PECA" ? "Tipo / Objeto" : "Horímetro Registro"}</span>
                          <span className="font-mono font-black text-gray-800 text-xs">
                            {chamado.tipo_objeto === "PECA" ? (chamado.fabricante_peca || "Peça Garantia") : `${Number(chamado.horimetro || 0).toLocaleString()} h`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedChamado(chamado);
                              setFormParecer(chamado.parecer_tecnico || "");
                              setFormNovoStatusChamado(chamado.status);
                              setAnaliseModalOpen(true);
                            }}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Analisar / Parecer
                          </button>

                          {chamado.status === "APROVADO_PARA_OS" && (
                            <button
                              disabled={convertingChamadoId === chamado.id}
                              onClick={() => handleConverterEmOS(chamado)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <Wrench className={`w-3.5 h-3.5 ${convertingChamadoId === chamado.id ? "animate-spin" : ""}`} /> 
                              {convertingChamadoId === chamado.id ? "Convertendo..." : "Converter em O.S."}
                            </button>
                          )}

                          {chamado.status === "CONVERTIDO_OS" && chamado.ordem_servico_id && onNavigate && (
                            <button
                              onClick={() => onNavigate("os", chamado.ordem_servico_id)}
                              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs flex items-center gap-1"
                            >
                              Ver O.S. <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}



      {/* NOVO CHAMADO DE GARANTIA MODAL */}
      {novoChamadoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wrench className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide font-display">
                  Abrir Novo Chamado de Garantia
                </h3>
              </div>
              <button 
                onClick={() => setNovoChamadoModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarChamado} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tipo de Objeto da Garantia
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTipoObjeto("EQUIPAMENTO")}
                    className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                      formTipoObjeto === "EQUIPAMENTO" 
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs" 
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Equipamento / Máquina
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTipoObjeto("PECA")}
                    className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                      formTipoObjeto === "PECA" 
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs" 
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Peça / Componente
                  </button>
                </div>
              </div>

              {formTipoObjeto === "EQUIPAMENTO" ? (
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Buscar Equipamento por Nº de Série, Modelo ou Fabricante *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={implSearchTerm}
                      onChange={(e) => {
                        setImplSearchTerm(e.target.value);
                        setShowImplDropdown(true);
                        if (!e.target.value) setFormImplId(0);
                      }}
                      onFocus={() => setShowImplDropdown(true)}
                      placeholder="Digite o número de série, modelo ou fabricante..."
                      className="w-full p-2.5 pl-9 bg-gray-50 border border-gray-300 rounded-xl font-bold focus:outline-none text-xs"
                      required={formTipoObjeto === "EQUIPAMENTO" && !formImplId}
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>

                  {showImplDropdown && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {implementos.filter(impl => {
                        const term = implSearchTerm.toLowerCase();
                        const serial = (impl.numero_serie || "").toLowerCase();
                        const modelo = (impl.modelo || "").toLowerCase();
                        const fabricante = (impl.fabricante || "").toLowerCase();
                        const cliName = String(clientesMap.get(impl.cliente_id!) || "").toLowerCase();
                        return serial.includes(term) || modelo.includes(term) || fabricante.includes(term) || cliName.includes(term);
                      }).length === 0 ? (
                        <div className="p-3 text-xs text-gray-400 text-center">Nenhum equipamento encontrado com este termo.</div>
                      ) : (
                        implementos.filter(impl => {
                          const term = implSearchTerm.toLowerCase();
                          const serial = (impl.numero_serie || "").toLowerCase();
                          const modelo = (impl.modelo || "").toLowerCase();
                          const fabricante = (impl.fabricante || "").toLowerCase();
                          const cliName = String(clientesMap.get(impl.cliente_id!) || "").toLowerCase();
                          return serial.includes(term) || modelo.includes(term) || fabricante.includes(term) || cliName.includes(term);
                        }).map(impl => {
                          const cliName = clientesMap.get(impl.cliente_id!) || "Cliente";
                          return (
                            <div
                              key={impl.id}
                              onClick={() => {
                                setFormImplId(impl.id!);
                                setFormHorimetroChamado(impl.horimetro_atual || 0);
                                setImplSearchTerm(`${impl.fabricante} ${impl.modelo} (Série: ${impl.numero_serie}) — ${cliName}`);
                                setShowImplDropdown(false);
                              }}
                              className={`p-2.5 hover:bg-slate-100 cursor-pointer text-xs border-b border-gray-100 last:border-b-0 ${
                                formImplId === impl.id ? "bg-slate-50 font-extrabold text-slate-900" : "text-gray-700"
                              }`}
                            >
                              <div className="font-extrabold text-gray-900">{impl.fabricante} {impl.modelo}</div>
                              <div className="text-[11px] text-gray-500 flex items-center justify-between mt-0.5">
                                <span className="font-mono text-slate-700">Série: {impl.numero_serie}</span>
                                <span>{cliName}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Cliente / Fazenda *
                    </label>
                    <select
                      value={formClienteId}
                      onChange={(e) => setFormClienteId(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold focus:outline-none text-xs"
                      required={formTipoObjeto === "PECA"}
                    >
                      <option value="">Selecione o cliente...</option>
                      {clientes.map(cli => (
                        <option key={cli.id} value={cli.id}>
                          {cli.razao_social || cli.nome_fantasia} ({cli.cidade}/{cli.uf})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Código / Part Number
                      </label>
                      <input
                        type="text"
                        value={formCodigoPeca}
                        onChange={(e) => setFormCodigoPeca(e.target.value)}
                        placeholder="Ex: RE508202"
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Fabricante / Marca da Peça
                      </label>
                      <input
                        type="text"
                        value={formFabricantePeca}
                        onChange={(e) => setFormFabricantePeca(e.target.value)}
                        placeholder="Ex: John Deere"
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Descrição da Peça *
                      </label>
                      <input
                        type="text"
                        value={formDescricaoPeca}
                        onChange={(e) => setFormDescricaoPeca(e.target.value)}
                        placeholder="Ex: Filtro de Óleo Hidráulico"
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold text-xs"
                        required={formTipoObjeto === "PECA"}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Nota Fiscal de Compra (NF)
                      </label>
                      <input
                        type="text"
                        value={formNfPeca}
                        onChange={(e) => setFormNfPeca(e.target.value)}
                        placeholder="Ex: NF-45920"
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tipo do Problema
                  </label>
                  <select
                    value={formTipoProblema}
                    onChange={(e) => setFormTipoProblema(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold focus:outline-none"
                  >
                    <option value="MECANICO">Mecânico / Desgaste</option>
                    <option value="HIDRAULICO">Hidráulico</option>
                    <option value="ELETRICO">Elétrico</option>
                    <option value="ESTRUTURAL">Estrutural</option>
                    <option value="PECA_DEFEITO">Peça com Defeito de Fabricação</option>
                  </select>
                </div>

                {formTipoObjeto === "EQUIPAMENTO" ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Horímetro Atual
                    </label>
                    <input
                      type="number"
                      value={formHorimetroChamado}
                      onChange={(e) => setFormHorimetroChamado(Number(e.target.value))}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Garantia / Prazo (Meses)
                    </label>
                    <input
                      type="text"
                      disabled
                      value="6 Meses (Padrão Peças)"
                      className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-500 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Solicitante / Responsável
                </label>
                <input
                  type="text"
                  value={formSolicitante}
                  onChange={(e) => setFormSolicitante(e.target.value)}
                  placeholder="Ex: João (Fazenda Santa Rita) ou Técnico Carlos"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Descrição Detalhada do Defeito / Solicitação
                </label>
                <textarea
                  rows={4}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Descreva o problema apresentado, código da peça ou sintomas relatados..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setNovoChamadoModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs"
                >
                  Registrar Chamado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANALISAR / PARECER TÉCNICO MODAL */}
      {analiseModalOpen && selectedChamado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide font-display">
                  Análise Técnica e Parecer — Chamado {selectedChamado.id}
                </h3>
              </div>
              <button 
                onClick={() => setAnaliseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarParecer} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Relato Original</span>
                <p className="text-xs text-gray-800 font-medium">{selectedChamado.descricao}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Status do Chamado
                </label>
                <select
                  value={formNovoStatusChamado}
                  onChange={(e) => setFormNovoStatusChamado(e.target.value as any)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold focus:outline-none"
                >
                  <option value="ABERTO">Aberto</option>
                  <option value="EM_ANALISE">Em Análise Técnica</option>
                  <option value="APROVADO_PARA_OS">Aprovado para O.S. (Garantia Válida)</option>
                  <option value="REJEITADO">Rejeitado (Fora de Garantia / Mau Uso)</option>
                  <option value="CONVERTIDO_OS">Convertido em O.S.</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Parecer Técnico / Laudo da Análise
                </label>
                <textarea
                  rows={4}
                  value={formParecer}
                  onChange={(e) => setFormParecer(e.target.value)}
                  placeholder="Descreva o laudo técnico da garantia, se foi aprovado ou rejeitado pela fábrica..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setAnaliseModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs"
                >
                  Salvar Parecer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
