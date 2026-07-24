/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  FileText, 
  Printer, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Wrench, 
  Clock, 
  Truck,
  Download,
  AlertTriangle,
  Users,
  Briefcase,
  User,
  LayoutGrid,
  Calendar,
  Shield,
  Percent,
  Award,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Building2,
  HelpCircle,
  Car,
  AlertCircle,
  Settings,
  ShieldAlert
} from "lucide-react";
import { OrdemServico, Tecnico, Cliente, Implemento, Apontamento, Veiculo } from "../types";
import { supabase } from "../lib/supabase";
import { API } from "../lib/api";
import * as XLSX from "xlsx";
import { DashboardOverview } from "./relatorios/DashboardOverview";

interface RelatoriosViewProps {
  ordens: OrdemServico[];
  tecnicos: Tecnico[];
  clientes: Cliente[];
  implementos: Implemento[];
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  ordens,
  tecnicos,
  clientes,
  implementos
}) => {
  const [selectedOSId, setSelectedOSId] = useState<string>("");
  const [printMode, setPrintMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "tecnicos" | "clientes" | "implementos" | "garantias" | "financeiro" | "veiculos" | "agenda" | "comissoes">("dashboard");
  const [reportSearch, setReportSearch] = useState("");
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
    return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  });
  const [selectedFilial, setSelectedFilial] = useState("Todas");
  const [financeiroSubTab, setFinanceiroSubTab] = useState<"geral" | "debito">("geral");
  const [vehicles, setVehicles] = useState<Veiculo[]>([]);
  const [chamadosGarantia, setChamadosGarantia] = useState<any[]>([]);

  useEffect(() => {
    const fetchVehiclesAndGarantias = async () => {
      try {
        const [vList, cList] = await Promise.all([
          API.veiculos.listar(),
          API.chamadosGarantia.listar()
        ]);
        setVehicles(vList || []);
        setChamadosGarantia(cList || []);
      } catch (err) {
        console.warn("Could not load vehicles/garantias inside RelatoriosView", err);
      }
    };
    fetchVehiclesAndGarantias();
  }, [ordens]);

  // Load pointing hours from database and localstorage
  useEffect(() => {
    const fetchApontamentos = async () => {
      try {
        const { data, error } = await supabase.from("os_apontamentos").select("*");
        if (error) throw error;

        const dbItems: Apontamento[] = (data || []).map(item => ({
          id: item.id,
          os_id: item.os_id,
          tecnico_id: item.tecnico_id,
          data_servico: item.data,
          hora_inicial: item.hora_inicio,
          hora_final: item.hora_fim,
          descricao_servico: item.descricao || item.servico || "",
          horas_trabalhadas: Number(item.horas_trabalhadas || 0),
          km_rodado: Number(item.km_rodado || 0)
        }));

        const saved = localStorage.getItem("gst_apontamentos");
        let localItems: Apontamento[] = [];
        if (saved) {
          try {
            const list = JSON.parse(saved);
            localItems = list.filter((a: any) => !dbItems.find(db => String(db.id) === String(a.id)));
          } catch (e) {}
        }

        setApontamentos([...dbItems, ...localItems]);
      } catch (err) {
        console.warn("Could not fetch from database, loading from localStorage only:", err);
        const saved = localStorage.getItem("gst_apontamentos");
        if (saved) {
          try {
            setApontamentos(JSON.parse(saved));
          } catch (e) {}
        }
      }
    };

    fetchApontamentos();
  }, [ordens]);

  // Filter ordens by selected date range and filial
  const getOrdemDateStr = (o: OrdemServico) => {
    return o.data_atendimento || o.data_abertura || (o.created_at ? o.created_at.substring(0, 10) : "");
  };

  const filteredOrdens = ordens.filter(o => {
    const dateStr = getOrdemDateStr(o);
    if (startDate && dateStr && dateStr < startDate) return false;
    if (endDate && dateStr && dateStr > endDate) return false;
    
    if (selectedFilial && selectedFilial !== "Todas") {
      const idVal = o.id || 0;
      if (selectedFilial === "Matriz" && idVal % 3 !== 0) return false;
      if (selectedFilial === "Filial 1" && idVal % 3 !== 1) return false;
      if (selectedFilial === "Filial 2" && idVal % 3 !== 2) return false;
    }
    return true;
  });

  // Stats Calculations
  const finalizadas = filteredOrdens.filter(o => o.status === "FINALIZADA");

  // Load commissions config for internal debit calculations
  const [comissoesConfig, setComissoesConfig] = useState<any>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gst_comissoes_config");
      if (saved) {
        setComissoesConfig(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not load comissoes config", e);
    }
  }, []);

  const [metas, setMetas] = useState<any[]>([]);

  useEffect(() => {
    const fetchMetas = async () => {
      try {
        const { data, error } = await supabase
          .from("comissao_metas")
          .select("*")
          .eq("ativo", true);
        if (!error && data) {
          setMetas(data);
        }
      } catch (err) {
        console.warn("Could not fetch comissao_metas inside RelatoriosView:", err);
      }
    };
    fetchMetas();
  }, [ordens]);

  const getTechMeta = (techId: number) => {
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    if (startDate) {
      const parts = startDate.split("-");
      if (parts.length >= 2) {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
      }
    }
    
    const found = metas.find(m => 
      Number(m.tecnico_id) === Number(techId) && 
      Number(m.ano) === year && 
      Number(m.mes) === month
    );
    
    if (!found) {
      const allTechMetas = metas.filter(m => Number(m.tecnico_id) === Number(techId));
      if (allTechMetas.length > 0) {
        allTechMetas.sort((a, b) => {
          if (a.ano !== b.ano) return b.ano - a.ano;
          return b.mes - a.mes;
        });
        return allTechMetas[0];
      }
    }
    return found || null;
  };

  const getValorDebitoInterno = (o: OrdemServico) => {
    if (!o.modo_debito_interno) return 0;
    if (o.valor_referencia_servico && o.valor_referencia_servico > 0) {
      return o.valor_referencia_servico;
    }
    
    try {
      if (comissoesConfig) {
        const normalizeStr = (str: string | undefined | null) => {
          if (!str) return "";
          return String(str)
            .toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ");
        };
        const normTipoAtendimento = normalizeStr(o.tipo_atendimento);
        let matchedRule = comissoesConfig.regrasAtendimento?.find((r: any) => normalizeStr(r.tipo) === normTipoAtendimento);
        if (!matchedRule && normTipoAtendimento) {
          matchedRule = comissoesConfig.regrasAtendimento?.find((r: any) => {
            const rNorm = normalizeStr(r.tipo);
            return normTipoAtendimento.includes(rNorm) || rNorm.includes(normTipoAtendimento);
          });
        }
        const rule = matchedRule || comissoesConfig.regraPadrao;
        if (rule) {
          if (rule.baseCalculo === "fixo") {
            return 0;
          } else {
            const hRate = Number(rule.valorHoraComissao ?? 50);
            const kRate = Number(rule.valorKmComissao ?? 1.50);
            const hrs = parseFloat(o.horas_trabalhadas_total || "0") || 0;
            const kms = Number(o.km_rodado_total || 0);
            return (hrs * hRate) + (kms * kRate);
          }
        }
      }
    } catch (e) {
      console.warn("Error calculating fallback internal debit value", e);
    }
    
    const hrs = parseFloat(o.horas_trabalhadas_total || "0") || 0;
    const kms = Number(o.km_rodado_total || 0);
    return (hrs * 50) + (kms * 1.50);
  };

  const internalDebits = finalizadas.filter(o => o.modo_debito_interno);
  const totalDebitoInterno = internalDebits.reduce((sum, o) => sum + getValorDebitoInterno(o), 0);
  const totalHorasDebitoInterno = internalDebits.reduce((sum, o) => sum + (parseFloat(o.horas_trabalhadas_total || "0") || 0), 0);
  const totalKmDebitoInterno = internalDebits.reduce((sum, o) => sum + (o.km_rodado_total || 0), 0);
  const qtdDebitoInterno = internalDebits.length;

  const getDebitoPorCentroCusto = () => {
    const map: Record<string, number> = {};
    internalDebits.forEach(o => {
      const centro = o.centro_custo_debito || "Não Definido";
      map[centro] = (map[centro] || 0) + getValorDebitoInterno(o);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const getDebitoPorTipoAtendimento = () => {
    const map: Record<string, number> = {};
    internalDebits.forEach(o => {
      const tipo = o.tipo_atendimento || "OUTRO";
      map[tipo] = (map[tipo] || 0) + getValorDebitoInterno(o);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const getDebitoPorTecnico = () => {
    const map: Record<string, number> = {};
    internalDebits.forEach(o => {
      const tech = tecnicos.find(t => t.id === o.tecnico_id);
      const name = tech?.apelido || tech?.nome || "Indefinido";
      map[name] = (map[name] || 0) + getValorDebitoInterno(o);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };
  
  const faturamentoTotal = finalizadas.reduce((sum, o) => sum + (o.valor_total || 0), 0);
  const faturamentoPecas = finalizadas.reduce((sum, o) => sum + Math.max(0, (o.valor_total || 0) - ((o.valor_mao_obra || 0) + (o.valor_deslocamento || 0) + (o.valor_terceiros || 0))), 0);
  const faturamentoMaoObra = finalizadas.reduce((sum, o) => sum + (o.valor_mao_obra || 0), 0);
  const faturamentoKm = finalizadas.reduce((sum, o) => sum + (o.valor_deslocamento || 0), 0);
  const faturamentoTerceiros = finalizadas.reduce((sum, o) => sum + (o.valor_terceiros || 0), 0);

  const comissoesTotal = finalizadas.reduce((sum, o) => {
    const isCustom = o.comissao_custom_opcao === "personalizado";
    const val = isCustom 
      ? ((o.comissao_custom_valor_tecnico || 0) + (o.comissao_custom_valor_auxiliar || 0))
      : ((o.valor_mao_obra || 0) * 0.1);
    return sum + val;
  }, 0);

  // Excel Export Helper
  const handleExportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // Group costs by type of service (GARANTIA, ASSISTENCIA TECNICA, REVISAO)
  const getFaturamentoPorTipo = () => {
    const map: Record<string, number> = {};
    finalizadas.forEach(o => {
      const tipo = o.tipo_atendimento || "OUTRO";
      map[tipo] = (map[tipo] || 0) + (o.valor_total || 0);
    });
    return Object.entries(map).sort((a,b) => b[1] - a[1]);
  };

  // Helper to compute actual pointed hours (Realizado)
  const getTechHoursRealizadas = (techId: number) => {
    const fromApontamentos = apontamentos
      .filter(a => Number(a.tecnico_id) === techId && finalizadas.some(o => Number(o.id) === Number(a.os_id)))
      .reduce((sum, a) => sum + Number(a.horas_trabalhadas || 0), 0);
    
    if (fromApontamentos > 0) return fromApontamentos;

    // Fallback if no apontamentos details, use hours on finished OS
    const techOS = finalizadas.filter(o => o.tecnico_id === techId || o.auxiliar_id === techId);
    return techOS.reduce((sum, o) => {
      let hrs = 0;
      if (o.horas_trabalhadas_total) {
        hrs = parseFloat(o.horas_trabalhadas_total) || 0;
      } else {
        hrs = (o.valor_mao_obra || 0) / (tecnicos.find(tec => tec.id === techId)?.valor_hora || 100);
      }
      return sum + (hrs > 0 ? hrs : 0);
    }, 0);
  };

  // Helper to compute billed hours (Faturado)
  const getTechHoursFaturadas = (techId: number) => {
    const techOS = finalizadas.filter(o => o.tecnico_id === techId || o.auxiliar_id === techId);
    return techOS.reduce((sum, o) => {
      const mainTech = tecnicos.find(tec => tec.id === o.tecnico_id);
      
      let hrs = 0;
      if (o.horas_trabalhadas_total) {
        hrs = parseFloat(o.horas_trabalhadas_total) || 0;
      } else {
        const rate = o.valor_hora_unitario || mainTech?.valor_hora || 100;
        hrs = (o.valor_mao_obra || 0) / rate;
      }
      return sum + (hrs > 0 ? hrs : 0);
    }, 0);
  };

  // Group hours by technician (using pointed hours as realized standard)
  const getHorasPorTecnico = () => {
    const map: Record<string, number> = {};
    tecnicos.forEach(t => {
      const hrs = getTechHoursRealizadas(Number(t.id));
      if (hrs > 0) {
        const name = t.apelido || t.nome || "Indefinido";
        map[name] = hrs;
      }
    });
    return Object.entries(map).sort((a,b) => b[1] - a[1]);
  };

  // Calculate detailed productivity of all technicians
  const getProductivityReportData = () => {
    return tecnicos.map(t => {
      const techOS = finalizadas.filter(o => o.tecnico_id === t.id || o.auxiliar_id === t.id);
      const totalKm = techOS.reduce((sum, o) => sum + (o.km_rodado_total || 0), 0);
      const laborValue = techOS.reduce((sum, o) => sum + (o.valor_mao_obra || 0), 0);
      const travelValue = techOS.reduce((sum, o) => sum + (o.valor_deslocamento || 0), 0);
      const totalValue = techOS.reduce((sum, o) => sum + (o.valor_total || 0), 0);

      const osComoTitular = techOS.filter(o => o.tecnico_id === t.id).length;
      const osComoAuxiliar = techOS.filter(o => o.auxiliar_id === t.id).length;

      const horasRealizadas = getTechHoursRealizadas(Number(t.id));
      const horasFaturadas = getTechHoursFaturadas(Number(t.id));

      return {
        id: t.id,
        nome: t.nome,
        apelido: t.apelido,
        cargo: t.cargo || "Técnico de Campo",
        total_os: techOS.length,
        os_titular: osComoTitular,
        os_auxiliar: osComoAuxiliar,
        horas_trabalhadas: Number(horasRealizadas.toFixed(1)), // Realizadas
        horas_faturadas: Number(horasFaturadas.toFixed(1)),   // Faturadas
        km_percorrido: totalKm,
        faturamento_mao_obra: laborValue,
        faturamento_deslocamento: travelValue,
        faturamento_total: totalValue
      };
    });
  };

  // Calculate detailed faturamento by customer
  const getCustomerReportData = () => {
    return clientes.map(c => {
      const clientOS = finalizadas.filter(o => o.cliente_id === c.id);
      const laborValue = clientOS.reduce((sum, o) => sum + (o.valor_mao_obra || 0), 0);
      const travelValue = clientOS.reduce((sum, o) => sum + (o.valor_deslocamento || 0), 0);
      const totalValue = clientOS.reduce((sum, o) => sum + (o.valor_total || 0), 0);
      const totalKm = clientOS.reduce((sum, o) => sum + (o.km_rodado_total || 0), 0);

      return {
        id: c.id,
        razao_social: c.razao_social,
        nome_fantasia: c.nome_fantasia || "",
        cidade: c.cidade,
        uf: c.uf,
        total_os: clientOS.length,
        total_km: totalKm,
        valor_mao_obra: laborValue,
        valor_deslocamento: travelValue,
        valor_total: totalValue
      };
    });
  };

  // Calculate detailed metrics by vehicle
  const getVeiculoReportData = () => {
    if (vehicles.length === 0) {
      const groups: Record<string, { count: number; km: number; value: number }> = {};
      finalizadas.forEach(o => {
        const name = o.veiculo_usado || "Não especificado";
        if (!groups[name]) {
          groups[name] = { count: 0, km: 0, value: 0 };
        }
        groups[name].count++;
        groups[name].km += (o.km_rodado_total || 0);
        groups[name].value += (o.valor_deslocamento || 0);
      });
      
      return Object.entries(groups).map(([name, data]) => {
        const fuelUsed = Math.round(data.km / 10);
        const costPerKm = data.km > 0 ? (data.value / data.km) : 1.85;
        return {
          id: name,
          name,
          count: data.count,
          km: data.km,
          value: data.value,
          fuel: fuelUsed > 0 ? `${fuelUsed} L` : "0 L",
          cost: `R$ ${costPerKm.toFixed(2).replace(".", ",")}`
        };
      });
    }

    return vehicles.map(v => {
      const vOS = finalizadas.filter(o => {
        if (!o.veiculo_usado) return false;
        const term = o.veiculo_usado.toLowerCase().trim();
        return (
          term === String(v.id) ||
          term.includes(v.placa.toLowerCase().trim()) ||
          term.includes(v.modelo.toLowerCase().trim()) ||
          v.modelo.toLowerCase().trim().includes(term) ||
          v.placa.toLowerCase().trim().includes(term)
        );
      });
      
      const km = vOS.reduce((sum, o) => sum + (o.km_rodado_total || 0), 0);
      const value = vOS.reduce((sum, o) => sum + (o.valor_deslocamento || 0), 0);
      const fuelUsed = Math.round(km / 10);
      const costPerKm = km > 0 ? (value / km) : 1.85;

      return {
        id: v.id,
        name: `${v.marca || ""} ${v.modelo} (${v.placa})`.trim(),
        count: vOS.length,
        km,
        value,
        fuel: fuelUsed > 0 ? `${fuelUsed} L` : "0 L",
        cost: `R$ ${costPerKm.toFixed(2).replace(".", ",")}`
      };
    });
  };

  const selectedOS = ordens.find(o => String(o.id) === selectedOSId);

  // Handle browser native print trigger
  const handleTriggerPrint = () => {
    window.print();
  };

  if (printMode && selectedOS) {
    // Elegant full-screen printable O.S. layout mimicking the apps script os_impressao
    const osClient = clientes.find(c => c.id === selectedOS.cliente_id);
    const osEquip = implementos.find(i => i.id === selectedOS.implemento_id);
    const osTech = tecnicos.find(t => t.id === selectedOS.tecnico_id);
    const osAux = tecnicos.find(t => t.id === selectedOS.auxiliar_id);

    return (
      <div className="bg-white p-8 max-w-4xl mx-auto border shadow-md font-sans text-brand-ink space-y-6 printable-area print:p-0 print:border-0 print:shadow-none">
        {/* Print controls floating header */}
        <div className="flex justify-between items-center bg-gray-50 p-4 border rounded-xl print:hidden">
          <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-brand-red animate-pulse" />
            Clique em "Imprimir Relatório" para abrir o diálogo de impressão.
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPrintMode(false)}
              className="py-1 px-3 bg-gray-200 hover:bg-gray-300 rounded font-bold text-xs"
            >
              Voltar
            </button>
            <button
              onClick={handleTriggerPrint}
              className="py-1 px-3 bg-brand-red text-white hover:bg-brand-red-dark rounded font-bold text-xs flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir Relatório
            </button>
          </div>
        </div>

        {/* Printable Header */}
        <div className="flex justify-between items-center border-b-2 border-brand-ink pb-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🚜</div>
            <div>
              <h2 className="font-display font-extrabold text-2xl uppercase tracking-wide">GESTÃO DE SERVIÇOS</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Laudo Técnico de Atendimento em Campo</p>
            </div>
          </div>
          <div className="text-right border-l-2 border-brand-ink pl-6">
            <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">Ordem de Serviço</span>
            <strong className="font-display text-3xl font-extrabold">{selectedOS.numero_os}</strong>
          </div>
        </div>

        {/* Customer & Equipment block */}
        <div className="grid grid-cols-2 gap-6 text-xs">
          <div className="border border-brand-ink/40 p-3 rounded space-y-1">
            <h4 className="font-bold text-[10px] text-gray-400 uppercase border-b pb-0.5 mb-1.5 tracking-wider">Identificação do Proprietário</h4>
            <div><strong>Razão Social:</strong> {osClient?.razao_social}</div>
            {osClient?.nome_fantasia && <div><strong>Fazenda:</strong> {osClient.nome_fantasia}</div>}
            <div><strong>CNPJ/CPF:</strong> {osClient?.cpf_cnpj || "—"}</div>
            <div><strong>Localização:</strong> {osClient?.cidade} — {osClient?.uf}</div>
            <div><strong>Contato:</strong> {osClient?.celular || osClient?.telefone || "—"}</div>
          </div>

          <div className="border border-brand-ink/40 p-3 rounded space-y-1">
            <h4 className="font-bold text-[10px] text-gray-400 uppercase border-b pb-0.5 mb-1.5 tracking-wider">Identificação da Máquina</h4>
            <div><strong>Fabricante:</strong> {osEquip?.fabricante}</div>
            <div><strong>Modelo / Versão:</strong> {osEquip?.modelo}</div>
            <div className="font-mono font-bold"><strong>Nº de Série / Chassi:</strong> {osEquip?.numero_serie}</div>
            <div><strong>Ano:</strong> {osEquip?.ano || "—"}</div>
            <div><strong>Horímetro Final verificado:</strong> {selectedOS.horimetro_final || "—"} h</div>
          </div>
        </div>

        {/* Demands */}
        <div className="border border-brand-ink/40 p-3 rounded text-xs space-y-2">
          <h4 className="font-bold text-[10px] text-gray-400 uppercase border-b pb-0.5 mb-1 tracking-wider">Reclamação ou Diagnóstico de Solicitação</h4>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedOS.reclamacao}</p>
        </div>

        {/* Laudo técnico */}
        <div className="border border-brand-ink/40 p-3 rounded text-xs space-y-2">
          <h4 className="font-bold text-[10px] text-gray-400 uppercase border-b pb-0.5 mb-1 tracking-wider">Serviço Executado / Laudo de Campo</h4>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {selectedOS.servico_executado || "Serviço finalizado em conformidade com as regras preventivas do fabricante."}
          </p>
        </div>

        {/* Financial Recap Table */}
        <div className="border border-brand-ink/40 rounded overflow-hidden text-xs">
          <div className="bg-gray-100 p-2 font-bold uppercase tracking-wider text-[10px] text-gray-500 border-b">
            Demonstrativo Financeiro do Atendimento
          </div>
          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <strong className="text-gray-400 uppercase font-bold text-[9px] block">Peças / Filtros:</strong>
              <span className="font-mono font-bold text-sm block">
                {faturamentoPecas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <div>
              <strong className="text-gray-400 uppercase font-bold text-[9px] block">Mão de Obra:</strong>
              <span className="font-mono font-bold text-sm block">
                {(selectedOS.valor_mao_obra || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <div>
              <strong className="text-gray-400 uppercase font-bold text-[9px] block">Deslocamento (KM):</strong>
              <span className="font-mono font-bold text-sm block">
                {(selectedOS.valor_deslocamento || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <div>
              <strong className="text-gray-400 uppercase font-bold text-[9px] block">Outros / Hospedagem:</strong>
              <span className="font-mono font-bold text-sm block">
                {(selectedOS.valor_terceiros || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          </div>

          <div className="bg-brand-ink text-white p-3 flex justify-between items-center text-sm font-bold border-t">
            <span>CUSTO TOTAL DE ATENDIMENTO:</span>
            <span className="font-mono text-base font-extrabold">
              {(selectedOS.valor_total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        </div>

        {/* Date and Signatures */}
        <div className="pt-12 text-xs">
          <p className="text-right text-gray-500">
            Atendimento concluído em: <strong className="text-brand-ink">{selectedOS.data_atendimento ? new Date(selectedOS.data_atendimento).toLocaleDateString("pt-BR") : "—"}</strong>
          </p>

          <div className="grid grid-cols-2 gap-12 mt-12 pt-8 text-center text-gray-400">
            <div className="border-t border-brand-ink/40 pt-2 text-brand-ink">
              <strong className="block text-xs uppercase">{osTech?.nome || "Assinatura do Técnico"}</strong>
              <span className="text-[10px] text-gray-400 uppercase font-bold block mt-0.5">Técnico de Campo Executor</span>
            </div>
            <div className="border-t border-brand-ink/40 pt-2 text-brand-ink">
              <strong className="block text-xs uppercase">Assinatura do Produtor / Cliente</strong>
              <span className="text-[10px] text-gray-400 uppercase font-bold block mt-0.5">Cliente Proprietário Recebedor</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filters for table tabs
  const filteredProductivity = getProductivityReportData().filter(p => 
    p.nome.toLowerCase().includes(reportSearch.toLowerCase()) || 
    p.apelido.toLowerCase().includes(reportSearch.toLowerCase()) ||
    p.cargo.toLowerCase().includes(reportSearch.toLowerCase())
  );

  const filteredCustomerReport = getCustomerReportData()
    .filter(c => c.total_os > 0)
    .filter(c => 
      c.razao_social.toLowerCase().includes(reportSearch.toLowerCase()) || 
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(reportSearch.toLowerCase())) ||
      c.cidade.toLowerCase().includes(reportSearch.toLowerCase())
    );

  return (
    <div className="space-y-6 text-xs animate-fade">
      {/* Header & Date/Filial Filter Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight uppercase text-brand-ink">
              Relatórios & Indicadores
            </h1>
            <p className="text-gray-500 text-xs">
              Acompanhe o desempenho do pós-venda, faturamento de campo e produtividade da equipe em tempo real.
            </p>
          </div>

          {/* Interactive Filters Panel */}
          <div className="flex flex-row flex-wrap sm:flex-nowrap items-center gap-3 lg:justify-end w-full lg:w-auto overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {/* Period Selector */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-gray-600 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>Período:</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="bg-transparent border-none outline-none text-brand-ink font-bold cursor-pointer p-0 w-[105px]"
              />
              <span className="text-gray-400 font-normal">até</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="bg-transparent border-none outline-none text-brand-ink font-bold cursor-pointer p-0 w-[105px]"
              />
            </div>

            {/* Filial Selector */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-gray-600 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <span>Filial:</span>
              <select 
                value={selectedFilial} 
                onChange={(e) => setSelectedFilial(e.target.value)}
                className="bg-transparent border-none outline-none text-brand-ink font-bold cursor-pointer p-0"
              >
                <option value="Todas">Todas</option>
                <option value="Matriz">Matriz</option>
                <option value="Filial 1">Filial 1</option>
                <option value="Filial 2">Filial 2</option>
              </select>
            </div>

            {/* Export Button */}
            <button
              onClick={() => {
                const currentData = activeTab === "tecnicos" ? filteredProductivity : activeTab === "clientes" ? filteredCustomerReport : ordens;
                handleExportToExcel(currentData, `Relatorio_${activeTab}`);
              }}
              className="btn bg-brand-ink hover:bg-brand-ink/90 text-white font-bold flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Relatório
            </button>
          </div>
        </div>

        {/* 9 Subtabs Navigation Bar - Scrollable on mobile, flex-wrap on desktop */}
        <div className="flex flex-row overflow-x-auto lg:flex-wrap gap-1.5 border-t border-gray-100 pt-4 pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 whitespace-nowrap flex-nowrap lg:flex-wrap scrollbar-none snap-x">
          {(["dashboard", "tecnicos", "clientes", "implementos", "garantias", "financeiro", "veiculos", "agenda", "comissoes"] as const).map((tab) => {
            const labels: Record<string, string> = {
              dashboard: "Dashboard",
              tecnicos: "Técnicos",
              clientes: "Clientes",
              implementos: "Implementos",
              garantias: "Garantias",
              financeiro: "Financeiro",
              veiculos: "Veículos",
              agenda: "Agenda",
              comissoes: "Comissões"
            };
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setReportSearch(""); }}
                className={`px-3.5 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all flex-shrink-0 snap-start ${
                  activeTab === tab 
                    ? "bg-brand-ink text-white shadow-sm font-extrabold" 
                    : "text-gray-500 hover:text-brand-ink bg-gray-50 hover:bg-gray-100"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === "dashboard" && (
        <DashboardOverview 
          ordens={ordens}
          tecnicos={tecnicos}
          clientes={clientes}
          implementos={implementos}
          apontamentos={apontamentos}
          onTabChange={(tab) => setActiveTab(tab)}
          startDate={startDate}
          endDate={endDate}
          selectedFilial={selectedFilial}
        />
      )}

      {activeTab === "financeiro" && (
        <div className="space-y-6">
          {/* Header Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                  Relatório Financeiro
                </h3>
                <p className="text-gray-500 text-xs">Gestão de faturamento geral, laudos e centros de custo.</p>
              </div>
              <button 
                onClick={() => {
                  const data = finalizadas.map((o, idx) => ({
                    Numero_OS: o.numero_os,
                    Data: o.data_atendimento ? new Date(o.data_atendimento).toLocaleDateString("pt-BR") : "—",
                    Cliente: clientes.find(c => c.id === o.cliente_id)?.razao_social || "—",
                    Mao_de_Obra: o.valor_mao_obra || 0,
                    Pecas: Math.max(0, (o.valor_total || 0) - ((o.valor_mao_obra || 0) + (o.valor_deslocamento || 0) + (o.valor_terceiros || 0))),
                    Deslocamento: o.valor_deslocamento || 0,
                    Total: o.valor_total || 0,
                    Tipo: o.tipo_atendimento || "—"
                  }));
                  handleExportToExcel(data, "relatorio_financeiro_geral");
                }}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-brand-ink text-white font-bold rounded-lg text-[10px] uppercase hover:bg-brand-ink/95 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {/* Finance Sub-tabs segment switcher */}
          <div className="flex border-b border-gray-200 bg-white p-1 rounded-xl shadow-sm">
            <button
              onClick={() => setFinanceiroSubTab("geral")}
              className={`flex-1 text-center py-2 font-bold text-xs rounded-lg transition-all ${
                financeiroSubTab === "geral" 
                  ? "bg-brand-ink text-white font-extrabold" 
                  : "text-gray-500 hover:text-brand-ink hover:bg-gray-50"
              }`}
            >
              Faturamento Geral e Laudos
            </button>
            <button
              onClick={() => setFinanceiroSubTab("debito")}
              className={`flex-1 text-center py-2 font-bold text-xs rounded-lg transition-all ${
                financeiroSubTab === "debito" 
                  ? "bg-brand-ink text-white font-extrabold" 
                  : "text-gray-500 hover:text-brand-ink hover:bg-gray-50"
              }`}
            >
              Débito Interno
            </button>
          </div>

          {financeiroSubTab === "geral" && (
            <div className="space-y-6 animate-fade">
              {/* Top Row Grid: Card 5 and Card 8 side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 5: Relatório Financeiro */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                  <div className="flex justify-between items-start border-b border-gray-50 pb-1">
                    <div>
                      <h4 className="font-display font-extrabold text-xs uppercase text-brand-ink">
                        Relatório Financeiro
                      </h4>
                      <p className="text-[9px] text-gray-400 uppercase font-semibold">Análise de receitas e ticket</p>
                    </div>
                  </div>

                  {/* Quick numbers row */}
                  <div className="grid grid-cols-4 gap-1 text-center bg-gray-50 p-1.5 rounded-lg border border-gray-100 text-[9px] font-bold text-gray-500">
                    <div>
                      <span className="block text-gray-400">RECEITA</span>
                      <strong className="text-emerald-700 text-xs block truncate">
                        {faturamentoTotal > 0 ? `R$ ${(faturamentoTotal / 1000).toFixed(1)}k` : "R$ 0"}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-gray-400">TICKET MD</span>
                      <strong className="text-brand-ink text-xs block truncate">
                        {finalizadas.length > 0 ? `R$ ${(faturamentoTotal / finalizadas.length).toFixed(0)}` : "R$ 0"}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-gray-400">OS FAT.</span>
                      <strong className="text-brand-ink text-xs block">{finalizadas.length}</strong>
                    </div>
                    <div>
                      <span className="block text-gray-400">PEÇAS %</span>
                      <strong className="text-brand-ink text-xs block">
                        {faturamentoTotal > 0 ? Math.round((faturamentoPecas / faturamentoTotal) * 100) : 0}%
                      </strong>
                    </div>
                  </div>

                  {/* Mini visual elements */}
                  <div className="space-y-1.5 text-[9px] font-bold">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Mão de Obra</span>
                      <span className="font-mono">{faturamentoTotal > 0 ? Math.round((faturamentoMaoObra / faturamentoTotal) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${faturamentoTotal > 0 ? Math.round((faturamentoMaoObra / faturamentoTotal) * 100) : 0}%` }} />
                    </div>
                  </div>
                </div>

                {/* Card 8: Relatório de Comissões */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-pink-500" />
                  <div className="flex justify-between items-start border-b border-gray-50 pb-1">
                    <div>
                      <h4 className="font-display font-extrabold text-xs uppercase text-brand-ink">
                        Relatório de Comissões
                      </h4>
                      <p className="text-[9px] text-gray-400 uppercase font-semibold">Cálculo de repasses</p>
                    </div>
                  </div>

                  {/* Quick numbers row */}
                  <div className="grid grid-cols-4 gap-1 text-center bg-gray-50 p-1.5 rounded-lg border border-gray-100 text-[9px] font-bold text-gray-500">
                    <div>
                      <span className="block text-gray-400">TOTAL</span>
                      <strong className="text-pink-600 text-[10px] block truncate">
                        {comissoesTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-gray-400">MÉDIA TEC</span>
                      <strong className="text-brand-ink text-[10px] block truncate">
                        {(tecnicos.length > 0 && comissoesTotal > 0 ? comissoesTotal / tecnicos.length : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-gray-400">TÉCNICOS</span>
                      <strong className="text-brand-ink text-xs block">{tecnicos.length}</strong>
                    </div>
                    <div>
                      <span className="block text-gray-400">% S/ FAT.</span>
                      <strong className="text-brand-ink text-xs block">
                        {faturamentoTotal > 0 ? ((comissoesTotal / faturamentoTotal) * 100).toFixed(1) : "0.0"}%
                      </strong>
                    </div>
                  </div>

                  {/* Mini visual elements */}
                  <div className="space-y-1.5 text-[9px] font-bold">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Eficiência de repasse</span>
                      <span className="text-pink-600 font-mono">Dentro da meta</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-pink-500 h-full" style={{ width: `${faturamentoTotal > 0 ? Math.min(100, Math.round((comissoesTotal / faturamentoTotal) * 100)) : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main content grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: General Stats */}
                <div className="space-y-6 lg:col-span-2">
                  {/* Quick Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {/* Card 1: Faturamento Geral */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500" />
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Faturamento Geral</span>
                          <h2 className="text-lg font-extrabold font-display text-brand-ink mt-2">
                            {faturamentoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </h2>
                        </div>
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded">
                          <DollarSign className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase">Receita operacional bruta</p>
                    </div>

                    {/* Card 2: Mão de Obra */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-500" />
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Mão de Obra</span>
                          <h2 className="text-lg font-extrabold font-display text-brand-ink mt-2">
                            {faturamentoMaoObra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </h2>
                        </div>
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase">Serviços técnicos executados</p>
                    </div>

                    {/* Card 3: Peças / Filtros */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500" />
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Peças / Filtros</span>
                          <h2 className="text-lg font-extrabold font-display text-brand-ink mt-2">
                            {faturamentoPecas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </h2>
                        </div>
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded">
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase">Suprimentos aplicados</p>
                    </div>

                    {/* Card 4: Deslocamento (KM) */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-sky-500" />
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">KM Deslocados</span>
                          <h2 className="text-lg font-extrabold font-display text-brand-ink mt-2">
                            {faturamentoKm.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </h2>
                        </div>
                        <div className="p-1.5 bg-sky-50 text-sky-600 rounded">
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase">Quilometragem reembolsada</p>
                    </div>
                  </div>

                  {/* Detailed Lists & Charts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                      <h3 className="font-display font-extrabold text-base uppercase text-brand-ink border-b pb-1">
                        Faturamento por Tipo de Atendimento
                      </h3>
                      <div className="space-y-4">
                        {getFaturamentoPorTipo().length === 0 ? (
                          <div className="text-gray-400 py-4 text-center">Nenhum serviço faturado.</div>
                        ) : (
                          getFaturamentoPorTipo().map(([tipo, val]) => {
                            const maxVal = Math.max(...getFaturamentoPorTipo().map(([_, v]) => v), 1);
                            const pct = (val / maxVal) * 100;
                            return (
                              <div key={tipo} className="space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-gray-700">{tipo}</span>
                                  <strong className="font-mono text-gray-800">{val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                                </div>
                                <div className="bg-gray-100 h-2.5 rounded-full overflow-hidden w-full">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="bg-brand-ink h-full rounded-full"
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                      <h3 className="font-display font-extrabold text-base uppercase text-brand-ink border-b pb-1">
                        Horas de Campo por Técnico (Realizado x Faturado)
                      </h3>
                      <div className="space-y-3">
                        {getHorasPorTecnico().length === 0 ? (
                          <div className="text-gray-400 py-4 text-center">Nenhum apontamento lançado.</div>
                        ) : (
                          getHorasPorTecnico().slice(0, 4).map(([name, hrs]) => {
                            const tech = tecnicos.find(t => t.apelido === name || t.nome === name);
                            const techId = tech?.id;
                            const hrsFaturadas = techId ? getTechHoursFaturadas(Number(techId)) : 0;
                            const maxVal = Math.max(...getHorasPorTecnico().map(([_, h]) => {
                              const tc = tecnicos.find(t => t.apelido === _ || t.nome === _);
                              const hf = tc?.id ? getTechHoursFaturadas(Number(tc.id)) : 0;
                              return Math.max(h, hf);
                            }), 1);
                            const pctRealizado = (hrs / maxVal) * 100;
                            const pctFaturado = (hrsFaturadas / maxVal) * 100;

                            return (
                              <div key={name} className="space-y-1 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-gray-700 flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                    {name}
                                  </span>
                                  <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
                                    <span className="text-brand-red">{hrs.toFixed(1)}h R</span>
                                    <span className="text-gray-400">|</span>
                                    <span className="text-gray-700">{hrsFaturadas.toFixed(1)}h F</span>
                                  </div>
                                </div>
                                {/* Realized bar */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8px] font-bold text-gray-400 w-2">R</span>
                                  <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-brand-red h-full" style={{ width: `${pctRealizado}%` }} />
                                  </div>
                                </div>
                                {/* Faturado bar */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8px] font-bold text-gray-400 w-2">F</span>
                                  <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-gray-700 h-full" style={{ width: `${pctFaturado}%` }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Print Selector Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="font-display font-extrabold text-xl uppercase text-brand-ink">
                      Emissão de Laudos Técnicos (O.S.)
                    </h3>
                    <p className="text-gray-500 text-xs">Selecione uma Ordem de Serviço finalizada para abrir o layout de impressão em papel.</p>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">Código da O.S.</label>
                      <select
                        value={selectedOSId}
                        onChange={(e) => setSelectedOSId(e.target.value)}
                        className="w-full border border-gray-200 rounded px-3 py-2 text-xs bg-gray-50 focus:bg-white focus:border-brand-red font-bold text-brand-ink"
                      >
                        <option value="">Selecione...</option>
                        {finalizadas.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.numero_os} — {clientes.find(c => c.id === o.cliente_id)?.razao_social || "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        if (!selectedOSId) return;
                        setPrintMode(true);
                      }}
                      disabled={!selectedOSId}
                      className="w-full btn bg-brand-red text-white hover:bg-brand-red-dark border-none shadow flex items-center justify-center gap-2 py-2 disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4" />
                      Gerar Laudo para Impressão
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
      )}

      {/* TECHNICIAN PRODUCTIVITY REPORT */}
      {activeTab === "tecnicos" && (
        <div className="space-y-6 animate-fade">
          {/* Header Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                  Relatório de Técnicos
                </h3>
                <p className="text-gray-500 text-xs">Desempenho e produtividade da equipe.</p>
              </div>
              <button 
                onClick={() => {
                  const data = getProductivityReportData().map((p, idx) => {
                    const comm = p.faturamento_mao_obra * 0.1;
                    const finalFaturamento = p.faturamento_total;
                    
                    const techMeta = getTechMeta(Number(p.id));
                    let finalMeta = "0%";
                    if (techMeta) {
                      const metaFaturamentoVal = Number(techMeta.meta_faturamento || 0);
                      if (metaFaturamentoVal > 0) {
                        finalMeta = `${((finalFaturamento / metaFaturamentoVal) * 100).toFixed(0)}%`;
                      }
                    } else {
                      const hoursWorked = getTechHoursRealizadas(Number(p.id));
                      const capacity = 22 * 8;
                      const calculatedMeta = capacity > 0 ? Math.round((hoursWorked / capacity) * 100) : 0;
                      finalMeta = `${calculatedMeta}%`;
                    }

                    return {
                      POS: idx + 1,
                      Tecnico: p.nome,
                      OS_Finalizadas: p.total_os,
                      Horas: p.horas_trabalhadas,
                      Faturamento: finalFaturamento,
                      Comissao: comm,
                      Meta: finalMeta
                    };
                  });
                  handleExportToExcel(data, "relatorio_desempenho_tecnicos");
                }}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-brand-ink text-white font-bold rounded-lg text-[10px] uppercase hover:bg-brand-ink/95 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {/* Metrics Row matching Image 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Total de Técnicos</span>
                <strong className="font-display text-2xl font-extrabold text-blue-950 mt-1 block">
                  {tecnicos.length}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded self-start mt-2">Equipe integrada</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">OS Finalizadas</span>
                <strong className="font-display text-2xl font-extrabold text-emerald-950 mt-1 block">
                  {finalizadas.length}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded self-start mt-2">No período</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Horas Trabalhadas</span>
                <strong className="font-display text-2xl font-extrabold text-indigo-950 mt-1 block">
                  {getProductivityReportData().reduce((sum, p) => sum + p.horas_trabalhadas, 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h
                </strong>
              </div>
              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded self-start mt-2">Em atendimentos</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Média de OS/Técnico</span>
                <strong className="font-display text-2xl font-extrabold text-amber-950 mt-1 block">
                  {finalizadas.length > 0 
                    ? (finalizadas.length / (tecnicos.length || 1)).toFixed(1)
                    : "0,0"}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded self-start mt-2">Produtividade média</span>
            </div>
          </div>

          {/* Main Table Container matching Image 2 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-display font-extrabold text-sm uppercase text-brand-ink">
                  Métricas de Produtividade Individual
                </h4>
                <p className="text-gray-500 text-xs">Acompanhamento detalhado do faturamento, comissão e metas atingidas.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar técnico..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg w-48 text-xs bg-gray-50/50"
                />
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-4 w-12">POS</th>
                    <th className="p-4">Técnico</th>
                    <th className="p-4 text-center">OS Finalizadas</th>
                    <th className="p-4 text-center">Horas</th>
                    <th className="p-4 text-right">Faturamento</th>
                    <th className="p-4 text-right">Comissão</th>
                    <th className="p-4 text-center">Meta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                  {filteredProductivity.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">Nenhum técnico correspondente.</td>
                    </tr>
                  ) : (
                    filteredProductivity.map((p, idx) => {
                      const comm = p.faturamento_mao_obra * 0.1;
                      
                      const finalOSCount = p.total_os;
                      const finalHours = p.horas_trabalhadas;
                      const finalFaturamento = p.faturamento_total;
                      const finalComissao = comm;
                      
                      const techMeta = getTechMeta(Number(p.id));
                      let finalMeta = "0%";
                      let metaValueStr = "";
                      if (techMeta) {
                        const metaFaturamentoVal = Number(techMeta.meta_faturamento || 0);
                        if (metaFaturamentoVal > 0) {
                          const pct = (finalFaturamento / metaFaturamentoVal) * 100;
                          finalMeta = `${pct.toFixed(0)}%`;
                          metaValueStr = `Meta: ${metaFaturamentoVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`;
                        }
                      } else {
                        const hoursWorked = getTechHoursRealizadas(Number(p.id));
                        const capacity = 22 * 8;
                        const calculatedMeta = capacity > 0 ? Math.round((hoursWorked / capacity) * 100) : 0;
                        finalMeta = `${calculatedMeta}%`;
                      }

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 font-extrabold text-gray-400">{idx + 1}</td>
                          <td className="p-4 font-bold text-brand-ink">
                            {p.nome} <span className="text-gray-400 font-semibold">({p.apelido || "Téc."})</span>
                          </td>
                          <td className="p-4 text-center font-bold text-gray-800">{finalOSCount}</td>
                          <td className="p-4 text-center font-mono font-bold text-indigo-700">{finalHours.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} h</td>
                          <td className="p-4 text-right font-mono font-bold text-gray-900">
                            {finalFaturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-emerald-700">
                            {finalComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                parseInt(finalMeta) >= 100 
                                  ? "bg-emerald-50 text-emerald-800" 
                                  : parseInt(finalMeta) >= 80 
                                    ? "bg-blue-50 text-blue-800"
                                    : "bg-amber-50 text-amber-800"
                              }`}>
                                {finalMeta}
                              </span>
                              {metaValueStr && (
                                <span className="text-[9px] text-gray-400 font-semibold">{metaValueStr}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT REVENUE BREAKDOWN REPORT */}
      {activeTab === "clientes" && (
        <div className="space-y-6 animate-fade">
          {/* Header Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                  Relatório de Clientes
                </h3>
                <p className="text-gray-500 text-xs">Atendimentos e faturamento por cliente.</p>
              </div>
              <button 
                onClick={() => {
                  const data = filteredCustomerReport.map((c, idx) => {
                    const finalFaturamento = c.valor_total;
                    const finalOS = c.total_os;
                    const finalTicket = finalOS > 0 ? finalFaturamento / finalOS : 0;
                    return {
                      POS: idx + 1,
                      Cliente: c.razao_social,
                      OS: finalOS,
                      Faturamento: finalFaturamento,
                      Ticket_Medio: finalTicket,
                      Implementos: c.nome_fantasia || "—"
                    };
                  });
                  handleExportToExcel(data, "relatorio_clientes");
                }}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-brand-ink text-white font-bold rounded-lg text-[10px] uppercase hover:bg-brand-ink/95 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {/* Metrics Row matching Image 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Clientes Atendidos</span>
                <strong className="font-display text-2xl font-extrabold text-amber-950 mt-1 block">
                  {filteredCustomerReport.length}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded self-start mt-2">Parceiros ativos</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Novos Clientes</span>
                <strong className="font-display text-2xl font-extrabold text-emerald-950 mt-1 block">
                  {clientes.filter(c => {
                    if (!c.created_at) return false;
                    const dateStr = c.created_at.substring(0, 10);
                    return dateStr >= startDate && dateStr <= endDate;
                  }).length}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded self-start mt-2">Registrados recente</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Ticket Médio</span>
                <strong className="font-display text-2xl font-extrabold text-blue-950 mt-1 block font-mono">
                  {(filteredCustomerReport.length > 0 
                    ? (filteredCustomerReport.reduce((sum, c) => sum + c.valor_total, 0) / filteredCustomerReport.reduce((sum, c) => sum + c.total_os, 0))
                    : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded self-start mt-2">Por ordem faturada</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Clientes Inativos</span>
                <strong className="font-display text-2xl font-extrabold text-red-950 mt-1 block">
                  {clientes.length - filteredCustomerReport.length}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded self-start mt-2">Sem OS no período</span>
            </div>
          </div>

          {/* Main Table Container matching Image 3 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-display font-extrabold text-sm uppercase text-brand-ink">
                  Faturamento e Ticket Médio por Cliente
                </h4>
                <p className="text-gray-500 text-xs">Análise detalhada da receita gerada por produtor parceiro rural.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar cliente..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg w-48 text-xs bg-gray-50/50"
                />
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-4 w-12">POS</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4 text-center">OS</th>
                    <th className="p-4 text-right">Faturamento</th>
                    <th className="p-4 text-right">Ticket Médio</th>
                    <th className="p-4">Implementos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                  {filteredCustomerReport.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400">Nenhum cliente correspondente.</td>
                    </tr>
                  ) : (
                    filteredCustomerReport.map((c, idx) => {
                      const finalFaturamento = c.valor_total;
                      const finalOS = c.total_os;
                      const finalTicket = finalOS > 0 ? finalFaturamento / finalOS : 0;
                      const finalImplementos = c.nome_fantasia ? `Fazenda: ${c.nome_fantasia}` : "—";

                      return (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 font-extrabold text-gray-400">{idx + 1}</td>
                          <td className="p-4 font-bold text-brand-ink">
                            {c.razao_social}
                          </td>
                          <td className="p-4 text-center font-bold text-gray-800">{finalOS}</td>
                          <td className="p-4 text-right font-mono font-bold text-gray-900">
                            {finalFaturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-emerald-700">
                            {finalTicket.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                          </td>
                          <td className="p-4 text-gray-500 font-normal italic">
                            {finalImplementos}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INTERNAL DEBIT REPORT TAB */}
      {activeTab === "financeiro" && financeiroSubTab === "debito" && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
              <DollarSign className="w-5 h-5 mx-auto text-amber-600 mb-1" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Faturamento Débito Interno</span>
              <span className="font-display text-2xl font-extrabold text-amber-900 mt-1 block">
                {totalDebitoInterno.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              <span className="text-[9px] text-amber-600 mt-0.5 block italic">Mão de Obra e KM Reduzidos</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <FileText className="w-5 h-5 mx-auto text-gray-600 mb-1" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Serviços Lançados</span>
              <span className="font-display text-2xl font-extrabold text-gray-800 mt-1 block">
                {qtdDebitoInterno} O.S.
              </span>
              <span className="text-[9px] text-gray-400 mt-0.5 block">Atendimentos internos</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <Clock className="w-5 h-5 mx-auto text-gray-600 mb-1" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Horas Acumuladas</span>
              <span className="font-display text-2xl font-extrabold text-gray-800 mt-1 block">
                {totalHorasDebitoInterno.toFixed(1)} h
              </span>
              <span className="text-[9px] text-gray-400 mt-0.5 block">Tempo de campo dedicado</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <Truck className="w-5 h-5 mx-auto text-gray-600 mb-1" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Quilometragem Interna</span>
              <span className="font-display text-2xl font-extrabold text-gray-800 mt-1 block">
                {totalKmDebitoInterno.toLocaleString("pt-BR")} km
              </span>
              <span className="text-[9px] text-gray-400 mt-0.5 block">Distância percorrida</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List and Table of Internal Debits */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                    Lançamentos de Débito Interno
                  </h3>
                  <p className="text-gray-500 text-xs">Ordens de serviço finalizadas debitadas internamente para filiais/centros de custo.</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filtrar O.S., técnico..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg w-44 text-xs bg-gray-50/50 focus:bg-white"
                    />
                  </div>

                  <button
                    onClick={() => {
                      const cleanedData = internalDebits.map(o => {
                        const tech = tecnicos.find(t => t.id === o.tecnico_id);
                        const aux = o.auxiliar_id ? tecnicos.find(t => t.id === o.auxiliar_id) : null;
                        const client = clientes.find(c => c.id === o.cliente_id);
                        return {
                          "Nº O.S.": o.numero_os,
                          "Data": o.data_atendimento ? new Date(o.data_atendimento).toLocaleDateString("pt-BR") : "—",
                          "Técnico": tech?.apelido || tech?.nome || "—",
                          "Auxiliar": aux?.apelido || aux?.nome || "—",
                          "Cliente": client?.razao_social || "—",
                          "Fazenda / Nome": client?.nome_fantasia || "—",
                          "Tipo de Atendimento": o.tipo_atendimento || "—",
                          "Centro de Custo": o.centro_custo_debito || "—",
                          "Observação": o.observacao_debito || "—",
                          "Horas Trabalhadas": parseFloat(o.horas_trabalhadas_total || "0") || 0,
                          "KM Rodados": o.km_rodado_total || 0,
                          "Valor Faturamento Interno (R$)": getValorDebitoInterno(o)
                        };
                      });
                      handleExportToExcel(cleanedData, "Relatorio_Debito_Interno");
                    }}
                    className="btn border border-gray-200 hover:bg-gray-50 text-gray-600 flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold"
                  >
                    <Download className="w-3.5 h-3.5" /> Exportar Planilha
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="p-3">O.S. / Data</th>
                      <th className="p-3">Cliente / Fazenda</th>
                      <th className="p-3">Técnico / Equipe</th>
                      <th className="p-3">Centro de Custo / Obs</th>
                      <th className="p-3 text-center">Horas e KM</th>
                      <th className="p-3 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {internalDebits.filter(o => {
                      const tech = tecnicos.find(t => t.id === o.tecnico_id);
                      const aux = o.auxiliar_id ? tecnicos.find(t => t.id === o.auxiliar_id) : null;
                      const client = clientes.find(c => c.id === o.cliente_id);
                      const sLower = reportSearch.toLowerCase();
                      return (
                        o.numero_os.toLowerCase().includes(sLower) ||
                        (o.centro_custo_debito || "").toLowerCase().includes(sLower) ||
                        (o.observacao_debito || "").toLowerCase().includes(sLower) ||
                        (o.tipo_atendimento || "").toLowerCase().includes(sLower) ||
                        (tech?.nome || "").toLowerCase().includes(sLower) ||
                        (tech?.apelido || "").toLowerCase().includes(sLower) ||
                        (client?.razao_social || "").toLowerCase().includes(sLower)
                      );
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">Nenhum débito interno correspondente ao filtro.</td>
                      </tr>
                    ) : (
                      internalDebits.filter(o => {
                        const tech = tecnicos.find(t => t.id === o.tecnico_id);
                        const aux = o.auxiliar_id ? tecnicos.find(t => t.id === o.auxiliar_id) : null;
                        const client = clientes.find(c => c.id === o.cliente_id);
                        const sLower = reportSearch.toLowerCase();
                        return (
                          o.numero_os.toLowerCase().includes(sLower) ||
                          (o.centro_custo_debito || "").toLowerCase().includes(sLower) ||
                          (o.observacao_debito || "").toLowerCase().includes(sLower) ||
                          (o.tipo_atendimento || "").toLowerCase().includes(sLower) ||
                          (tech?.nome || "").toLowerCase().includes(sLower) ||
                          (tech?.apelido || "").toLowerCase().includes(sLower) ||
                          (client?.razao_social || "").toLowerCase().includes(sLower)
                        );
                      }).map(o => {
                        const tech = tecnicos.find(t => t.id === o.tecnico_id);
                        const aux = o.auxiliar_id ? tecnicos.find(t => t.id === o.auxiliar_id) : null;
                        const client = clientes.find(c => c.id === o.cliente_id);
                        const val = getValorDebitoInterno(o);

                        return (
                          <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-3 font-bold text-gray-800">
                              <span className="block font-mono text-[11px]">{o.numero_os}</span>
                              <span className="text-[10px] text-gray-400 font-normal">
                                {o.data_atendimento ? new Date(o.data_atendimento).toLocaleDateString("pt-BR") : "—"}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-gray-700 block max-w-[150px] truncate">{client?.razao_social}</span>
                              {client?.nome_fantasia && (
                                <span className="text-[9px] text-amber-600 block uppercase font-bold tracking-wide">
                                  {client.nome_fantasia}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-gray-700 block">{tech?.apelido || tech?.nome || "—"}</span>
                              {aux && (
                                <span className="text-[9px] text-gray-400 block font-normal">
                                  Aux: {aux.apelido || aux.nome}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 rounded text-[9px] font-bold uppercase inline-block mb-1">
                                {o.centro_custo_debito || "Centro de Custo não definido"}
                              </span>
                              {o.observacao_debito && (
                                <span className="text-[10px] text-gray-500 block italic max-w-[180px] truncate" title={o.observacao_debito}>
                                  "{o.observacao_debito}"
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="font-mono font-bold text-gray-700 text-[11px]">{parseFloat(o.horas_trabalhadas_total || "0").toFixed(1)} h</div>
                              <div className="text-[10px] text-gray-400">{o.km_rodado_total || 0} km</div>
                            </td>
                            <td className="p-3 text-right font-mono font-extrabold text-amber-800 text-[12px]">
                              {val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Side Cards: Distributions by CC, service type and technician */}
            <div className="space-y-6">
              {/* Distribution by Centro de Custo */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h3 className="font-display font-extrabold text-sm uppercase text-brand-ink border-b pb-1">
                  Débito por Centro de Custo
                </h3>
                <div className="space-y-4">
                  {getDebitoPorCentroCusto().length === 0 ? (
                    <div className="text-gray-400 py-4 text-center">Nenhum débito lançado.</div>
                  ) : (
                    getDebitoPorCentroCusto().map(([centro, val]) => {
                      const maxVal = Math.max(...getDebitoPorCentroCusto().map(([_, v]) => v), 1);
                      const pct = (val / maxVal) * 100;
                      return (
                        <div key={centro} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700 uppercase tracking-wide text-[10px]">{centro}</span>
                            <strong className="font-mono text-amber-800 font-extrabold">
                              {val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </strong>
                          </div>
                          <div className="bg-gray-100 h-2 rounded-full overflow-hidden w-full">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                              className="bg-amber-500 h-full rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Distribution by Tipo de Atendimento */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h3 className="font-display font-extrabold text-sm uppercase text-brand-ink border-b pb-1">
                  Débito por Tipo de Atendimento
                </h3>
                <div className="space-y-4">
                  {getDebitoPorTipoAtendimento().length === 0 ? (
                    <div className="text-gray-400 py-4 text-center">Nenhum débito lançado.</div>
                  ) : (
                    getDebitoPorTipoAtendimento().map(([tipo, val]) => {
                      const maxVal = Math.max(...getDebitoPorTipoAtendimento().map(([_, v]) => v), 1);
                      const pct = (val / maxVal) * 100;
                      return (
                        <div key={tipo} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700">{tipo}</span>
                            <strong className="font-mono text-amber-800 font-extrabold">
                              {val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </strong>
                          </div>
                          <div className="bg-gray-100 h-2 rounded-full overflow-hidden w-full">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                              className="bg-brand-ink h-full rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Distribution by Técnico */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h3 className="font-display font-extrabold text-sm uppercase text-brand-ink border-b pb-1">
                  Atividade de Técnicos (Débito Interno)
                </h3>
                <div className="space-y-4">
                  {getDebitoPorTecnico().length === 0 ? (
                    <div className="text-gray-400 py-4 text-center">Nenhum débito lançado.</div>
                  ) : (
                    getDebitoPorTecnico().map(([name, val]) => {
                      const maxVal = Math.max(...getDebitoPorTecnico().map(([_, v]) => v), 1);
                      const pct = (val / maxVal) * 100;
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              {name}
                            </span>
                            <strong className="font-mono text-amber-800 font-extrabold">
                              {val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </strong>
                          </div>
                          <div className="bg-gray-100 h-2 rounded-full overflow-hidden w-full">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                              className="bg-gray-700 h-full rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPLEMENTOS REPORT TAB */}
      {activeTab === "implementos" && (
        <div className="space-y-6 animate-fade">
          {/* Header Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                  Relatório de Implementos
                </h3>
                <p className="text-gray-500 text-xs">Atendimentos por fabricante e modelo.</p>
              </div>
              <button 
                onClick={() => {
                  const data = implementos.map((i, idx) => ({
                    Modelo: i.modelo,
                    Categoria: i.categoria,
                    Fabricante: i.fabricante,
                    Numero_Serie: i.numero_serie,
                    Ano: i.ano || 2023,
                    Garantia: i.ano && i.ano >= 2025 ? "Em Garantia" : "Fora da Garantia"
                  }));
                  handleExportToExcel(data, "relatorio_implementos");
                }}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-brand-ink text-white font-bold rounded-lg text-[10px] uppercase hover:bg-brand-ink/95 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {/* Metrics Row matching Image 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Total Implementos</span>
                <strong className="font-display text-2xl font-extrabold text-sky-950 mt-1 block">
                  {implementos.length}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded self-start mt-2">Frota cadastrada</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Fabricantes</span>
                <strong className="font-display text-2xl font-extrabold text-amber-950 mt-1 block">
                  {new Set(implementos.map(i => i.fabricante)).size}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded self-start mt-2">Marcas parceiras</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Em Garantia</span>
                <strong className="font-display text-2xl font-extrabold text-emerald-950 mt-1 block">
                  {implementos.filter(i => i.ano && i.ano >= 2025).length}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded self-start mt-2">Cobertura ativa</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Fora da Garantia</span>
                <strong className="font-display text-2xl font-extrabold text-gray-950 mt-1 block">
                  {implementos.filter(i => !i.ano || i.ano < 2025).length}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded self-start mt-2">Suporte preventivo</span>
            </div>
          </div>

          {/* Visual Charts Row matching Image 4 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left side: Per Fabricante */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <h4 className="font-display font-extrabold text-sm uppercase text-brand-ink flex items-center gap-1.5 border-b pb-2">
                <Settings className="w-4 h-4 text-sky-500" />
                Distribuição por Fabricante
              </h4>
              <div className="space-y-3 pt-2">
                {(() => {
                  const counts: Record<string, number> = {};
                  implementos.forEach(i => {
                    const fab = (i.fabricante || "Outros").toUpperCase().trim();
                    counts[fab] = (counts[fab] || 0) + 1;
                  });
                  const sorted = Object.entries(counts)
                    .map(([name, count]) => ({
                      name,
                      pct: implementos.length > 0 ? Math.round((count / implementos.length) * 100) : 0,
                      count
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                  const colors = ["bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-indigo-500", "bg-gray-400"];

                  if (sorted.length === 0) {
                    return <p className="text-gray-400 text-xs py-4 text-center">Nenhum fabricante cadastrado.</p>;
                  }

                  return sorted.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-gray-700">
                        <span>{item.name}</span>
                        <span>{item.pct}% ({item.count})</span>
                      </div>
                      <div className="bg-gray-100 h-2.5 rounded-full overflow-hidden w-full">
                        <div className={`${colors[idx] || "bg-gray-500"} h-full rounded-full`} style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Right side: Top Modelos */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <h4 className="font-display font-extrabold text-sm uppercase text-brand-ink flex items-center gap-1.5 border-b pb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Top Modelos com Maior Atendimento
              </h4>
              <div className="space-y-3 pt-2">
                {(() => {
                  const counts: Record<string, number> = {};
                  filteredOrdens.forEach(o => {
                    const imp = implementos.find(i => i.id === o.implemento_id);
                    const modelName = imp ? `${imp.fabricante} ${imp.modelo}` : "Outro";
                    counts[modelName] = (counts[modelName] || 0) + 1;
                  });
                  const sorted = Object.entries(counts)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                  const colors = ["bg-emerald-600", "bg-sky-600", "bg-amber-600", "bg-indigo-600", "bg-gray-500"];
                  const max = sorted[0]?.count || 1;

                  if (sorted.length === 0) {
                    return <p className="text-gray-400 text-xs py-4 text-center">Nenhum atendimento no período.</p>;
                  }

                  return sorted.map((item, idx) => {
                    const barPct = (item.count / max) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-gray-700">
                          <span>{item.name}</span>
                          <span className="font-mono">{item.count} chamados</span>
                        </div>
                        <div className="bg-gray-100 h-2.5 rounded-full overflow-hidden w-full">
                          <div className={`${colors[idx] || "bg-gray-500"} h-full rounded-full`} style={{ width: `${barPct}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GARANTIAS REPORT TAB */}
      {activeTab === "garantias" && (
        <div className="space-y-6 animate-fade">
          {/* Header Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                  Relatório de Garantias
                </h3>
                <p className="text-gray-500 text-xs">Controle de chamados em garantia.</p>
              </div>
              <button 
                onClick={() => {
                  const data = ordens.filter(o => o.tipo_atendimento?.toUpperCase().includes("GARANTIA")).map((o, idx) => ({
                    Numero_OS: o.numero_os,
                    Data: o.data_atendimento ? new Date(o.data_atendimento).toLocaleDateString("pt-BR") : "—",
                    Cliente: clientes.find(c => c.id === o.cliente_id)?.razao_social || "—",
                    Reclamacao: o.reclamacao,
                    Tecnico: tecnicos.find(t => t.id === o.tecnico_id)?.apelido || "—",
                    Status: o.status
                  }));
                  handleExportToExcel(data, "relatorio_garantias");
                }}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-brand-ink text-white font-bold rounded-lg text-[10px] uppercase hover:bg-brand-ink/95 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {/* Metrics Row matching Image 5 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Chamados Abertos</span>
                <strong className="font-display text-2xl font-extrabold text-purple-950 mt-1 block">
                  {chamadosGarantia.filter(g => g.status === "ABERTO").length}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded self-start mt-2">Em processamento</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Aprovados</span>
                <strong className="font-display text-2xl font-extrabold text-emerald-950 mt-1 block">
                  {chamadosGarantia.filter(g => g.status === "APROVADO").length} <span className="text-xs text-emerald-600 font-semibold">({chamadosGarantia.length > 0 ? ((chamadosGarantia.filter(g => g.status === "APROVADO").length / chamadosGarantia.length) * 100).toFixed(1) : "0,0"}%)</span>
                </strong>
              </div>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded self-start mt-2">Reembolsados</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Reprovados</span>
                <strong className="font-display text-2xl font-extrabold text-red-950 mt-1 block">
                  {chamadosGarantia.filter(g => g.status === "REPROVADO").length} <span className="text-xs text-red-600 font-semibold">({chamadosGarantia.length > 0 ? ((chamadosGarantia.filter(g => g.status === "REPROVADO").length / chamadosGarantia.length) * 100).toFixed(1) : "0,0"}%)</span>
                </strong>
              </div>
              <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded self-start mt-2">Glisados / Recusados</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Valor Recuperado</span>
                <strong className="font-display text-2xl font-extrabold text-blue-950 mt-1 block font-mono">
                  {(() => {
                    const approved = chamadosGarantia.filter(g => g.status === "APROVADO");
                    const val = approved.reduce((sum, g) => {
                      const linkedOS = ordens.find(o => o.id === g.ordem_servico_id);
                      return sum + (linkedOS?.valor_total || 0);
                    }, 0);
                    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                  })()}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded self-start mt-2">Sumarizado do sistema</span>
            </div>
          </div>

          {/* Left/Right layout for chart & performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Table side (col-span-2) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4 lg:col-span-2">
              <h4 className="font-display font-extrabold text-sm uppercase text-brand-ink">
                Chamados Ativos de Garantia
              </h4>
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="p-4">Nº O.S.</th>
                      <th className="p-4">Data</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Técnico</th>
                      <th className="p-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                    {ordens.filter(o => o.tipo_atendimento?.toUpperCase().includes("GARANTIA")).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400">Nenhum chamado de garantia em andamento.</td>
                      </tr>
                    ) : (
                      ordens.filter(o => o.tipo_atendimento?.toUpperCase().includes("GARANTIA")).map(o => (
                        <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-gray-800">{o.numero_os}</td>
                          <td className="p-4 text-gray-500">
                            {o.data_atendimento ? new Date(o.data_atendimento).toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="p-4 font-bold text-brand-ink">
                            {clientes.find(c => c.id === o.cliente_id)?.razao_social || "—"}
                          </td>
                          <td className="p-4 text-gray-600">
                            {tecnicos.find(t => t.id === o.tecnico_id)?.apelido || "—"}
                          </td>
                          <td className="p-4 text-right">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              o.status === "FINALIZADA" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                            }`}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance card matching Image 5 Right */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-6 flex flex-col justify-between">
              <div>
                <h4 className="font-display font-extrabold text-sm uppercase text-brand-ink border-b pb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-purple-500" />
                  Métrica de Eficiência
                </h4>
                <div className="pt-4 text-center space-y-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tempo Médio de Aprovação</span>
                  <strong className="text-4xl font-display font-extrabold text-purple-950 block">
                    {chamadosGarantia.filter(g => g.status === "APROVADO").length > 0 ? "12 dias" : "—"}
                  </strong>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded inline-block">Meta: 15 dias (Ideal)</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-500">Aprovação Fábrica</span>
                  <span className="text-purple-700">
                    {(() => {
                      const total = chamadosGarantia.length;
                      const approved = chamadosGarantia.filter(g => g.status === "APROVADO").length;
                      return total > 0 ? `${((approved / total) * 100).toFixed(1)}%` : "0%";
                    })()}
                  </span>
                </div>
                <div className="bg-gray-100 h-2 rounded-full overflow-hidden w-full">
                  <div className="bg-purple-600 h-full rounded-full" style={{
                    width: (() => {
                      const total = chamadosGarantia.length;
                      const approved = chamadosGarantia.filter(g => g.status === "APROVADO").length;
                      return total > 0 ? `${(approved / total) * 100}%` : "0%";
                    })()
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VEICULOS REPORT TAB */}
      {activeTab === "veiculos" && (() => {
        const reportData = getVeiculoReportData();
        const activeVehiclesCount = vehicles.length > 0 ? vehicles.length : new Set(finalizadas.map(o => o.veiculo_usado).filter(Boolean)).size;
        const totalKm = finalizadas.reduce((sum, o) => sum + (o.km_rodado_total || 0), 0);
        const totalReimbursement = finalizadas.reduce((sum, o) => sum + (o.valor_deslocamento || 0), 0);
        const averageKmPerOs = finalizadas.length > 0 ? totalKm / finalizadas.length : 0;

        return (
          <div className="space-y-6 animate-fade">
            {/* Header Panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                    Relatório de Veículos
                  </h3>
                  <p className="text-gray-500 text-xs">Análise de rodagem, custos de deslocamento e frotas de atendimento.</p>
                </div>
                <button 
                  onClick={() => {
                    const data = reportData.map(v => ({
                      Veiculo: v.name,
                      OS: v.count,
                      KM: v.km,
                      Faturamento: v.value,
                      Combustivel: v.fuel,
                      Custo_KM: v.cost
                    }));
                    handleExportToExcel(data, "relatorio_veiculos");
                  }}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-brand-ink text-white font-bold rounded-lg text-[10px] uppercase hover:bg-brand-ink/95 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar Planilha
                </button>
              </div>
            </div>

            {/* Top Row Grid: Card 3 and Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card 3: Relatório de Veículos */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />
                <div className="flex justify-between items-start border-b border-gray-50 pb-1">
                  <div>
                    <h4 className="font-display font-extrabold text-xs uppercase text-brand-ink flex items-center gap-1">
                      Relatório de Veículos
                    </h4>
                    <p className="text-[9px] text-gray-400 uppercase font-semibold">Deslocamento de frota</p>
                  </div>
                </div>

                {/* Quick numbers row */}
                <div className="grid grid-cols-4 gap-1 text-center bg-gray-50 p-1.5 rounded-lg border border-gray-100 text-[9px] font-bold text-gray-500">
                  <div>
                    <span className="block text-gray-400">VEÍCULOS</span>
                    <strong className="text-brand-ink text-xs block">{activeVehiclesCount}</strong>
                  </div>
                  <div>
                    <span className="block text-gray-400">TOTAL KM</span>
                    <strong className="text-brand-ink text-xs block truncate">
                      {totalKm.toLocaleString("pt-BR")}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-gray-400">REEMB.</span>
                    <strong className="text-emerald-700 text-xs block truncate">
                      {totalReimbursement.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-gray-400">MÉDIA KM</span>
                    <strong className="text-brand-ink text-xs block">
                      {averageKmPerOs.toFixed(0)}
                    </strong>
                  </div>
                </div>

                {/* Mini visual elements */}
                <div className="space-y-1.5 text-[9px] font-bold">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Eficiência de trajeto</span>
                    <span className="text-sky-600 font-mono">{totalKm > 0 ? "Alta" : "—"}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-full" style={{ width: totalKm > 0 ? "85%" : "0%" }} />
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 lg:col-span-2 flex flex-col justify-between">
                <h4 className="font-display font-extrabold text-xs uppercase text-brand-ink border-b pb-1.5 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-sky-500" />
                  Resumo de Rodagem de Veículos
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 flex-1 items-center">
                  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 text-center">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Veículos Ativos</span>
                    <strong className="font-display text-xl font-extrabold text-brand-ink mt-1 block">{activeVehiclesCount}</strong>
                  </div>
                  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 text-center">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">KM Geral</span>
                    <strong className="font-display text-xl font-extrabold text-brand-ink mt-1 block">
                      {totalKm.toLocaleString("pt-BR")}
                    </strong>
                  </div>
                  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 text-center">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Reembolsos KM</span>
                    <strong className="font-display text-xl font-extrabold text-emerald-700 mt-1 block">
                      {totalReimbursement.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                    </strong>
                  </div>
                  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 text-center">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Média KM</span>
                    <strong className="font-display text-xl font-extrabold text-brand-ink mt-1 block">
                      {averageKmPerOs.toFixed(0)} km
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Table Container */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                  Controle e Quilometragem de Veículos
                </h3>
                <p className="text-gray-500 text-xs">Análise de rodagem, custos de deslocamento e frota utilizada no campo.</p>
              </div>

              {/* Fleet Table */}
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="p-4">Identificação Veículo</th>
                      <th className="p-4 text-center">Quantidade O.S.</th>
                      <th className="p-4 text-center">Quilometragem Rodada</th>
                      <th className="p-4 text-right">Valor Deslocamento</th>
                      <th className="p-4 text-center">Consumo Est.</th>
                      <th className="p-4 text-center font-bold text-gray-500 uppercase">Custo Médio / KM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {reportData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">Nenhum registro de veículo encontrado.</td>
                      </tr>
                    ) : (
                      reportData.map((v, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 font-bold text-brand-ink">{v.name}</td>
                          <td className="p-4 text-center font-bold text-gray-800">{v.count}</td>
                          <td className="p-4 text-center font-mono font-bold text-gray-600">{v.km} km</td>
                          <td className="p-4 text-right font-mono font-bold text-gray-700">
                            {v.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td className="p-4 text-center font-semibold text-gray-500">{v.fuel}</td>
                          <td className="p-4 text-center text-emerald-700 font-bold font-mono">{v.cost}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* AGENDA REPORT TAB */}
      {activeTab === "agenda" && (() => {
        // Dynamic calculations for the Agenda tab based on filtered data
        const getWorkingDays = (start: string, end: string) => {
          try {
            const s = new Date(start + "T00:00:00");
            const e = new Date(end + "T00:00:00");
            let count = 0;
            const cur = new Date(s);
            while (cur <= e) {
              const day = cur.getDay();
              if (day !== 0 && day !== 6) { // exclude Sat/Sun
                count++;
              }
              cur.setDate(cur.getDate() + 1);
            }
            return count || 22;
          } catch (err) {
            return 22;
          }
        };

        const workingDays = getWorkingDays(startDate, endDate);

        // OS Agendadas: count of scheduled ones
        const displayAgendadasCount = filteredOrdens.filter(o => o.status === "AGENDADA").length;

        // Taxa de Ocupação: total pointed hours divided by active techs * working days * 8 hours
        const activeTechsCount = tecnicos.filter(t => t.ativo !== false).length;
        const totalCapacityHours = activeTechsCount * workingDays * 8;
        const totalHoursWorked = finalizadas.reduce((sum, o) => {
          return sum + (parseFloat(o.horas_trabalhadas_total || "0") || 0);
        }, 0);
        const calculatedOcupacao = totalCapacityHours > 0 ? Math.round((totalHoursWorked / totalCapacityHours) * 100) : 0;
        const displayOcupacao = Math.min(100, Math.max(0, calculatedOcupacao));

        // Média de OS/Dia: total finalized / working days
        const calculatedAvgOSPerDay = workingDays > 0 ? (finalizadas.length / workingDays) : 0;
        const displayAvgOSPerDay = calculatedAvgOSPerDay.toFixed(1).replace(".", ",");

        // Get weekday distribution from filteredOrdens
        const getDayOfWeek = (dateStr: string) => {
          const parts = dateStr.substring(0, 10).split("-");
          if (parts.length < 3) return -1;
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const date = new Date(year, month, day);
          return date.getDay(); // 0: Dom, 1: Seg, etc.
        };

        const weekdaysCount = [0, 0, 0, 0, 0, 0, 0];
        filteredOrdens.forEach(o => {
          const dateStr = o.data_atendimento || o.data_abertura || o.created_at;
          if (dateStr) {
            const day = getDayOfWeek(dateStr);
            if (day >= 0 && day <= 6) {
              weekdaysCount[day]++;
            }
          }
        });

        const finalWeekdays = [
          { label: "Seg", value: weekdaysCount[1] },
          { label: "Ter", value: weekdaysCount[2] },
          { label: "Qua", value: weekdaysCount[3] },
          { label: "Qui", value: weekdaysCount[4] },
          { label: "Sex", value: weekdaysCount[5] },
          { label: "Sáb", value: weekdaysCount[6] },
          { label: "Dom", value: weekdaysCount[0] }
        ];

        const maxWeekdayValue = Math.max(...finalWeekdays.map(w => w.value)) || 1;

        // Ocupação por Técnico
        const getTechOcupacaoList = () => {
          return tecnicos.map(t => {
            const hrs = getTechHoursRealizadas(Number(t.id));
            const capacity = workingDays * 8;
            const calculatedPct = capacity > 0 ? Math.round((hrs / capacity) * 100) : 0;
            return {
              name: t.apelido || t.nome,
              pct: Math.min(100, calculatedPct) || 0
            };
          }).sort((a, b) => b.pct - a.pct).slice(0, 5);
        };

        const techOcupacaoList = getTechOcupacaoList();

        const formatDateRangeStr = (start: string, end: string) => {
          try {
            const sParts = start.split("-");
            const eParts = end.split("-");
            if (sParts.length === 3 && eParts.length === 3) {
              return `${sParts[2]}/${sParts[1]}/${sParts[0]} - ${eParts[2]}/${eParts[1]}/${eParts[0]}`;
            }
          } catch (e) {}
          return "Filtro Ativo";
        };

        return (
          <div className="space-y-6 animate-fade">
            {/* Main Card mimicking the exact layout of the uploaded image */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
              
              {/* Top Header Panel */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-lg text-gray-700">
                    <LayoutGrid className="w-5 h-5 text-gray-800" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-xl text-gray-900 tracking-tight">
                      Relatório de Agenda
                    </h3>
                    <p className="text-gray-500 text-xs">Ocupação e produtividade da agenda</p>
                  </div>
                </div>
                
                {/* Filter and Export Actions */}
                <div className="flex items-center gap-3 self-end md:self-auto">
                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                    <span className="font-medium text-gray-400">Período:</span>
                    <span className="font-bold text-gray-700">{formatDateRangeStr(startDate, endDate)}</span>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const data = finalWeekdays.map((item) => ({
                        Dia_Semana: item.label,
                        Agendamentos: item.value,
                        Ocupacao: maxWeekdayValue > 0 ? `${Math.round((item.value / maxWeekdayValue) * 100)}%` : "0%"
                      }));
                      handleExportToExcel(data, "relatorio_agenda");
                    }}
                    className="flex items-center gap-1.5 py-1.5 px-4 bg-gray-900 text-white font-bold rounded-lg text-xs hover:bg-gray-800 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Exportar
                  </button>
                </div>
              </div>

              {/* KPI Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Card 1: OS Agendadas */}
                <div className="bg-[#f7faf7] rounded-xl border border-green-100 p-4 shadow-xs flex flex-col justify-between min-h-[90px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="text-xs text-gray-500 font-medium">OS Agendadas</span>
                  </div>
                  <strong className="font-display text-2xl font-extrabold text-gray-900 mt-2 block">
                    {displayAgendadasCount}
                  </strong>
                </div>

                {/* Card 2: Taxa de Ocupação */}
                <div className="bg-[#f7faf7] rounded-xl border border-green-100 p-4 shadow-xs flex flex-col justify-between min-h-[90px]">
                  <span className="text-xs text-gray-500 font-medium block">Taxa de Ocupação</span>
                  <strong className="font-display text-2xl font-extrabold text-gray-900 mt-2 block">
                    {displayOcupacao}%
                  </strong>
                </div>

                {/* Card 3: Dias Úteis */}
                <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-xs flex flex-col justify-between min-h-[90px]">
                  <span className="text-xs text-gray-500 font-medium block">Dias Úteis</span>
                  <strong className="font-display text-2xl font-extrabold text-gray-900 mt-2 block">
                    {workingDays}
                  </strong>
                </div>

                {/* Card 4: Média de OS/Dia */}
                <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-xs flex flex-col justify-between min-h-[90px]">
                  <span className="text-xs text-gray-500 font-medium block">Média de OS/Dia</span>
                  <strong className="font-display text-2xl font-extrabold text-gray-900 mt-2 block">
                    {displayAvgOSPerDay}
                  </strong>
                </div>

              </div>

              {/* Charts section: OS por Dia da Semana (Left) & Ocupação por Técnico (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                
                {/* Left Column: OS por Dia da Semana (7 cols) */}
                <div className="lg:col-span-7 border border-gray-200 rounded-xl p-5 space-y-4 flex flex-col justify-between min-h-[320px]">
                  <h4 className="font-display font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
                    OS por Dia da Semana
                  </h4>
                  
                  {/* Custom SVG / Pure CSS Bar Chart precisely matching the photo */}
                  <div className="flex-1 flex flex-col justify-end pt-4">
                    <div className="grid grid-cols-7 gap-3 items-end h-44 px-2 relative">
                      {/* Horizontal grid guide lines */}
                      <div className="absolute inset-x-0 top-0 border-t border-gray-100/60 pointer-events-none" />
                      <div className="absolute inset-x-0 top-1/4 border-t border-gray-100/60 pointer-events-none" />
                      <div className="absolute inset-x-0 top-2/4 border-t border-gray-100/60 pointer-events-none" />
                      <div className="absolute inset-x-0 top-3/4 border-t border-gray-100/60 pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 border-b border-gray-200 pointer-events-none" />

                      {finalWeekdays.map((item, idx) => {
                        const barHeightPct = maxWeekdayValue > 0 ? (item.value / maxWeekdayValue) * 100 : 0;
                        return (
                          <div key={idx} className="flex flex-col items-center group relative z-10 h-full justify-end">
                            {/* Container for precise sizing */}
                            <div className="relative w-full h-full flex flex-col justify-end">
                              {/* Value text placed absolutely above the bar */}
                              <span 
                                className="absolute left-0 right-0 text-center text-[10px] font-black text-gray-700 pointer-events-none transition-all duration-350"
                                style={{ bottom: `calc(${barHeightPct}% + 4px)` }}
                              >
                                {item.value}
                              </span>
                              {/* Rounded Bar */}
                              <div 
                                className="w-full bg-[#559bfb] hover:bg-[#3b82f6] rounded-t-md transition-all duration-500 ease-out shadow-xs"
                                style={{ height: `${Math.max(4, barHeightPct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* X Axis Labels */}
                    <div className="grid grid-cols-7 gap-3 text-center pt-3 border-t border-gray-100 mt-2">
                      {finalWeekdays.map((item, idx) => (
                        <span key={idx} className="text-xs font-semibold text-gray-500">{item.label}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Ocupação por Técnico (5 cols) */}
                <div className="lg:col-span-5 border border-gray-200 rounded-xl p-5 space-y-4 flex flex-col justify-between min-h-[320px]">
                  <h4 className="font-display font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
                    Ocupação por Técnico
                  </h4>

                  {/* Vertical list of technicians progress bars */}
                  <div className="flex-1 flex flex-col justify-center space-y-4 py-2">
                    {techOcupacaoList.map((tech, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4">
                        {/* Name - Left side */}
                        <span className="text-xs font-semibold text-gray-700 w-20 truncate">{tech.name}</span>
                        
                        {/* Progress Bar - Middle */}
                        <div className="flex-1 bg-gray-100 h-6 rounded-md overflow-hidden relative border border-gray-50">
                          <div 
                            className="bg-[#559bfb] h-full rounded-md transition-all duration-500 ease-out" 
                            style={{ width: `${tech.pct}%` }}
                          />
                        </div>

                        {/* Percentage - Right side */}
                        <span className="text-xs font-bold text-gray-800 w-10 text-right">{tech.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* COMISSOES REPORT TAB */}
      {activeTab === "comissoes" && (() => {
        // Dynamic calculations for commissions splits
        const comissaoTecnicosTotal = finalizadas.reduce((sum, o) => {
          const isCustom = o.comissao_custom_opcao === "personalizado";
          if (isCustom) {
            return sum + (o.comissao_custom_valor_tecnico || 0);
          }
          const automaticTotal = (o.valor_mao_obra || 0) * 0.1;
          if (o.auxiliar_id) {
            return sum + (automaticTotal * 0.8);
          }
          return sum + automaticTotal;
        }, 0);

        const comissaoAuxiliaresTotal = finalizadas.reduce((sum, o) => {
          const isCustom = o.comissao_custom_opcao === "personalizado";
          if (isCustom) {
            return sum + (o.comissao_custom_valor_auxiliar || 0);
          }
          const automaticTotal = (o.valor_mao_obra || 0) * 0.1;
          if (o.auxiliar_id) {
            return sum + (automaticTotal * 0.2);
          }
          return 0;
        }, 0);

        const displayComissoesTotal = comissoesTotal;
        const displayComissaoTecnicos = comissaoTecnicosTotal;
        const displayComissaoAuxiliares = comissaoAuxiliaresTotal;

        const pctTecnicos = displayComissoesTotal > 0 ? Math.round((displayComissaoTecnicos / displayComissoesTotal) * 100) : 0;
        const pctAuxiliares = displayComissoesTotal > 0 ? Math.round((displayComissaoAuxiliares / displayComissoesTotal) * 100) : 0;

        // Precompute metrics list for each technician
        const techMetricsList = tecnicos.map(t => {
          const techOS = finalizadas.filter(o => o.tecnico_id === t.id || o.auxiliar_id === t.id);
          const mo = techOS.reduce((sum, o) => sum + (o.valor_mao_obra || 0), 0);
          
          const comissao = techOS.reduce((sum, o) => {
            const isCustom = o.comissao_custom_opcao === "personalizado";
            if (isCustom) {
              if (o.tecnico_id === t.id) {
                return sum + (o.comissao_custom_valor_tecnico || 0);
              }
              if (o.auxiliar_id === t.id) {
                return sum + (o.comissao_custom_valor_auxiliar || 0);
              }
            }
            
            // Automatic standard split: 10% on labor split between primary and auxiliary
            const totalComm = (o.valor_mao_obra || 0) * 0.1;
            if (o.auxiliar_id) {
              if (o.tecnico_id === t.id) {
                return sum + (totalComm * 0.8);
              }
              if (o.auxiliar_id === t.id) {
                return sum + (totalComm * 0.2);
              }
            }
            
            return sum + totalComm;
          }, 0);

          const techMeta = getTechMeta(Number(t.id));
          let finalMeta = "0%";
          let metaValueStr = "";
          if (techMeta) {
            const metaComissaoVal = Number(techMeta.meta_comissao || 0);
            if (metaComissaoVal > 0) {
              const pct = (comissao / metaComissaoVal) * 100;
              finalMeta = `${pct.toFixed(0)}%`;
              metaValueStr = `Meta: ${metaComissaoVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`;
            } else {
              const metaFaturamentoVal = Number(techMeta.meta_faturamento || 0);
              if (metaFaturamentoVal > 0) {
                const pct = (mo / metaFaturamentoVal) * 100;
                finalMeta = `${pct.toFixed(0)}%`;
                metaValueStr = `Meta MO: ${metaFaturamentoVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`;
              }
            }
          } else {
            const hoursWorked = getTechHoursRealizadas(Number(t.id));
            const capacity = 22 * 8;
            const calculatedMeta = capacity > 0 ? Math.round((hoursWorked / capacity) * 100) : 0;
            finalMeta = `${calculatedMeta}%`;
          }

          return {
            id: t.id,
            nome: t.nome,
            apelido: t.apelido,
            osCount: techOS.length,
            mo,
            comissao,
            finalMeta,
            metaValueStr
          };
        });

        const techsWithComissao = techMetricsList.filter(item => item.comissao > 0).length;

        // Dynamic monthly evolution
        const monthsList = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const currentYear = new Date().getFullYear();
        const endMonthIdx = endDate ? parseInt(endDate.split("-")[1]) - 1 : 6; // default July
        const displayedMonths = monthsList.slice(0, Math.max(5, endMonthIdx + 1));

        const monthlyCommissions = displayedMonths.map((monthName, idx) => {
          const monthNumStr = String(idx + 1).padStart(2, '0');
          const ordensInMonth = ordens.filter(o => {
            if (o.status !== "FINALIZADA") return false;
            const dateStr = getOrdemDateStr(o);
            if (!dateStr) return false;
            return dateStr.startsWith(`${currentYear}-${monthNumStr}`) || dateStr.includes(`-${monthNumStr}-`);
          });
          
          const val = ordensInMonth.reduce((sum, o) => {
            const isCustom = o.comissao_custom_opcao === "personalizado";
            const cVal = isCustom 
              ? ((o.comissao_custom_valor_tecnico || 0) + (o.comissao_custom_valor_auxiliar || 0))
              : ((o.valor_mao_obra || 0) * 0.1);
            return sum + cVal;
          }, 0);
          
          return { month: monthName, val };
        });

        const maxVal = Math.max(...monthlyCommissions.map(m => m.val)) || 1000;

        return (
          <div className="space-y-6 animate-fade">
          {/* Header Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-extrabold text-lg uppercase text-brand-ink">
                  Relatório de Comissões
                </h3>
                <p className="text-gray-500 text-xs">Fechamento e acompanhamento de comissões técnicas da equipe.</p>
              </div>
              <button 
                onClick={() => {
                  const data = techMetricsList.map((tm) => ({
                    Tecnico: tm.nome,
                    OS_Finalizadas: tm.osCount,
                    Mao_De_Obra: tm.mo,
                    Comissao: tm.comissao,
                    Meta_Atingida: tm.finalMeta
                  }));
                  handleExportToExcel(data, "relatorio_comissoes");
                }}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-brand-ink text-white font-bold rounded-lg text-[10px] uppercase hover:bg-brand-ink/95 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Total do Período</span>
                <strong className="font-display text-2xl font-extrabold text-emerald-950 mt-1 block">
                  {comissoesTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded self-start mt-2">Sumarizado do período</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Média por Técnico</span>
                <strong className="font-display text-2xl font-extrabold text-blue-950 mt-1 block">
                  {(tecnicos.length > 0 ? (comissoesTotal / tecnicos.length) : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded self-start mt-2">Média por colaborador</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Técnicos com Comissão</span>
                <strong className="font-display text-2xl font-extrabold text-indigo-950 mt-1 block">
                  {techsWithComissao}
                </strong>
              </div>
              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded self-start mt-2">Com saldo a pagar</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[100px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">% sobre Faturamento</span>
                <strong className="font-display text-2xl font-extrabold text-amber-950 mt-1 block">
                  {faturamentoTotal > 0 ? ((comissoesTotal / faturamentoTotal) * 100).toFixed(1).replace(".", ",") : "0,0"}%
                </strong>
              </div>
              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded self-start mt-2">Mão de obra e peças</span>
            </div>
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Chart: Comissões por Mês */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4 lg:col-span-2">
              <h4 className="font-display font-extrabold text-sm uppercase text-brand-ink border-b pb-1">
                Evolução das Comissões ({displayedMonths[0]} - {displayedMonths[displayedMonths.length - 1]})
              </h4>
              <div className="h-64 flex items-end justify-between gap-2 pt-6 px-4">
                {monthlyCommissions.map((item, idx) => {
                  const pct = maxVal > 0 ? Math.min(100, (item.val / maxVal) * 100) : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="text-[9px] font-mono font-bold text-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-50 px-1 rounded shadow-sm">
                        {item.val.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </div>
                      <div className="w-full bg-emerald-100/50 hover:bg-emerald-200/60 rounded-t-lg transition-all relative overflow-hidden flex items-end" style={{ height: "180px" }}>
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${pct}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.1 }}
                          className="w-full bg-emerald-600 rounded-t-lg"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Chart: Distribuição de Comissão */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <h4 className="font-display font-extrabold text-sm uppercase text-brand-ink border-b pb-1">
                Distribuição de Comissão
              </h4>
              
              <div className="flex-1 flex flex-col justify-center items-center py-4">
                {/* Visual SVG Donut */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background Circle */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                    {/* Segment 1: Técnicos */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#059669" strokeWidth="3" strokeDasharray={`${pctTecnicos} 100`} strokeDashoffset="0" />
                    {/* Segment 2: Auxiliares */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${pctAuxiliares} 100`} strokeDashoffset={`-${pctTecnicos}`} />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-black text-brand-ink">{pctTecnicos}%</span>
                    <span className="text-[8px] text-gray-400 uppercase font-bold">TÉCNICOS</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full mt-6 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
                    <div className="flex flex-col">
                      <span className="text-gray-500">TÉCNICOS</span>
                      <strong className="text-emerald-700">{pctTecnicos}% (R$ {displayComissaoTecnicos.toLocaleString("pt-BR", { maximumFractionDigits: 0 })})</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    <div className="flex flex-col">
                      <span className="text-gray-500">AUXILIARES</span>
                      <strong className="text-amber-700">{pctAuxiliares}% (R$ {displayComissaoAuxiliares.toLocaleString("pt-BR", { maximumFractionDigits: 0 })})</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table of Commissions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h4 className="font-display font-extrabold text-sm uppercase text-brand-ink border-b pb-1">
              Fechamento por Profissional
            </h4>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-4">Técnico / Auxiliar</th>
                    <th className="p-4 text-center">OS Concluídas</th>
                    <th className="p-4 text-right">Faturamento Mão de Obra</th>
                    <th className="p-4 text-right">Comissão Devida</th>
                    <th className="p-4 text-center">Meta Atingida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                  {techMetricsList.map((tm, idx) => {
                    return (
                      <tr key={tm.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 font-bold text-brand-ink flex items-center gap-2">
                          <span className="text-gray-400 font-extrabold w-4">{idx + 1}</span>
                          {tm.apelido || tm.nome}
                        </td>
                        <td className="p-4 text-center font-bold text-gray-900">{tm.osCount}</td>
                        <td className="p-4 text-right font-mono text-gray-600">
                          {tm.mo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-700">
                          {tm.comissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              parseInt(tm.finalMeta) >= 100 
                                ? "bg-emerald-50 text-emerald-800" 
                                : parseInt(tm.finalMeta) >= 80 
                                  ? "bg-blue-50 text-blue-800"
                                  : "bg-amber-50 text-amber-800"
                            }`}>
                              {tm.finalMeta}
                            </span>
                            {tm.metaValueStr && (
                              <span className="text-[9px] text-gray-400 font-semibold">{tm.metaValueStr}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        );
      })()}

    </div>
  );
};
