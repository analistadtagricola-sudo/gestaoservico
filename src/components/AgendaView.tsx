import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  PlusCircle, 
  AlertCircle, 
  Settings, 
  ListOrdered, 
  Wrench,
  CheckCircle2,
  CalendarCheck,
  RefreshCw,
  MessageCircle
} from "lucide-react";
import { OrdemServico, Tecnico } from "../types";
import { initAuth, googleSignIn, syncOrdensToGoogleCalendar, getAccessToken, formatOSNotificationText } from "../lib/googleAuth";

interface AgendaViewProps {
  ordens: OrdemServico[];
  tecnicos: Tecnico[];
  onNavigate: (view: string, targetId?: number) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  ordens,
  tecnicos,
  onNavigate
}) => {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedTechFilter, setSelectedTechFilter] = useState<string>("ALL");
  const [showUnscheduledPanel, setShowUnscheduledPanel] = useState(true);
  const [showFinalizadas, setShowFinalizadas] = useState(true);
  const [agendaConfig, setAgendaConfig] = useState<{ exibirFimDeSemana: boolean; notificarTecnicoWhatsapp: boolean }>({
    exibirFimDeSemana: true,
    notificarTecnicoWhatsapp: true
  });

  useEffect(() => {
    const loadCfg = () => {
      try {
        const stored = localStorage.getItem("gst_agenda_config_v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          setAgendaConfig({
            exibirFimDeSemana: parsed.exibirFimDeSemana ?? true,
            notificarTecnicoWhatsapp: parsed.notificarTecnicoWhatsapp ?? true
          });
        }
      } catch (e) {}
    };
    loadCfg();
    window.addEventListener("agenda_config_updated", loadCfg);
    return () => window.removeEventListener("agenda_config_updated", loadCfg);
  }, []);

  const [needsAuth, setNeedsAuth] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{success?: number, errors?: number} | null>(null);

  useEffect(() => {
    initAuth(
      () => setNeedsAuth(false),
      () => setNeedsAuth(true)
    );
    getAccessToken().then(token => {
      if (!token) setNeedsAuth(true);
    });
  }, []);

  const handleSyncToGoogle = async () => {
    try {
      if (needsAuth) {
        const result = await googleSignIn();
        if (result) {
          setNeedsAuth(false);
        } else {
          // User closed popup or cancelled login
          return;
        }
      }

      setIsSyncing(true);
      setSyncStatus(null);
      const res = await syncOrdensToGoogleCalendar(ordens, tecnicos);
      setSyncStatus(res);
      if (res.success > 0) {
        alert(`Sincronização concluída com sucesso! ${res.success} O.S. enviada(s) para o Google Agenda.`);
      } else if (res.errors > 0) {
        alert(`Não foi possível enviar as O.S. para a agenda compartilha. Motivo: ${res.lastError || "Sem permissão ou calendário não encontrado."}`);
      } else {
        alert("Nenhuma Ordem de Serviço com data válida para sincronizar.");
      }
    } catch (err: any) {
      console.error("Sync error:", err);
      alert("Falha ao sincronizar com Google Agenda: " + (err.message || "Erro desconhecido."));
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper to normalize date string to YYYY-MM-DD
  const normalizeDate = (rawDateStr?: string | null): string => {
    if (!rawDateStr) return "";
    const str = String(rawDateStr).trim();
    
    // Check YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.substring(0, 10);
    }
    
    // Check DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
      const parts = str.split("/");
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }

    return "";
  };

  // Helper to build WhatsApp notification URL for technician
  const buildWhatsappNotificationUrl = (os: OrdemServico, tech?: Tecnico) => {
    const phoneRaw = tech?.telefone || "";
    const phoneClean = phoneRaw.replace(/\D/g, "");
    if (!phoneClean) return null;

    const phoneFull = phoneClean.length <= 11 ? `55${phoneClean}` : phoneClean;
    const msg = formatOSNotificationText(os, tecnicos);

    return `https://api.whatsapp.com/send?phone=${phoneFull}&text=${encodeURIComponent(msg)}`;
  };

  // Generate week dates based on offset and weekend visibility
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    
    // Set to Monday of current week plus offset
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) + (currentWeekOffset * 7);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(startOfWeek);
      nextDate.setDate(startOfWeek.getDate() + i);
      const dayOfWeek = nextDate.getDay();

      if (!agendaConfig.exibirFimDeSemana && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue;
      }
      dates.push(nextDate);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const formatWeekRangeLabel = () => {
    if (weekDates.length === 0) return "";
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return `${start.toLocaleDateString("pt-BR", options)} — ${end.toLocaleDateString("pt-BR", options)} (${start.getFullYear()})`;
  };

  // Find assignments for a specific technician on a specific date
  const getAssignments = (techId: number, date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return ordens.filter(o => {
      if (o.status === "CANCELADA") return false;
      if (!showFinalizadas && o.status === "FINALIZADA") return false;

      const startDate = normalizeDate(o.data_atendimento) || normalizeDate(o.data_abertura);
      if (!startDate) return false;

      let endDate = normalizeDate(o.data_termino) || startDate;
      if (endDate < startDate) endDate = startDate;

      const isAssignedTech = o.tecnico_id === techId || o.auxiliar_id === techId;
      const isDateMatch = startDate <= dateStr && dateStr <= endDate;

      return isAssignedTech && isDateMatch;
    });
  };

  // Filter unscheduled or open OS
  const unscheduledOrdens = ordens.filter(o => {
    if (o.status === "CANCELADA" || o.status === "FINALIZADA") return false;
    const hasAtendimentoDate = !!normalizeDate(o.data_atendimento);
    const hasTech = !!o.tecnico_id;
    return !hasAtendimentoDate || !hasTech;
  });

  // Filter technicians based on selection
  const filteredTecnicos = selectedTechFilter === "ALL" 
    ? tecnicos 
    : tecnicos.filter(t => t.id === Number(selectedTechFilter));

  // Count total assignments in current week
  const totalWeekAssignments = ordens.filter(o => {
    if (o.status === "CANCELADA") return false;
    if (!showFinalizadas && o.status === "FINALIZADA") return false;
    const startDate = normalizeDate(o.data_atendimento) || normalizeDate(o.data_abertura);
    if (!startDate) return false;
    let endDate = normalizeDate(o.data_termino) || startDate;
    if (endDate < startDate) endDate = startDate;

    return weekDates.some(d => {
      const dStr = d.toISOString().split("T")[0];
      return startDate <= dStr && dStr <= endDate;
    });
  }).length;

  return (
    <div className="space-y-6 text-xs animate-fade">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight uppercase text-gray-900 flex items-center gap-2.5">
            <Calendar className="w-8 h-8 text-brand-red" />
            Agenda de Campo Integrada
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Programação integrada semanal de atendimentos e rotas de deslocamento de técnicos.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Navigation Controls */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs font-semibold">
              <button 
                onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Semana Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-800 font-bold tracking-tight">
                {formatWeekRangeLabel()}
              </span>
              <button 
                onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Próxima Semana"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentWeekOffset(0)}
                className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded hover:bg-gray-200 font-bold ml-1"
              >
                Hoje
              </button>
            </div>

            {/* Filter Tech */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={selectedTechFilter}
                onChange={(e) => setSelectedTechFilter(e.target.value)}
                className="text-xs font-bold text-gray-700 bg-transparent outline-none"
              >
                <option value="ALL">Todos os Técnicos</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>{t.apelido || t.nome}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-gray-700 font-bold cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 select-none">
              <input
                type="checkbox"
                checked={showFinalizadas}
                onChange={(e) => setShowFinalizadas(e.target.checked)}
                className="rounded text-brand-red focus:ring-brand-red w-3.5 h-3.5"
              />
              <span>Exibir Finalizadas</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate("config_agenda")}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900 transition-colors shadow-xs"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurar Agenda</span>
            </button>

            <button
              onClick={handleSyncToGoogle}
              disabled={isSyncing}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-colors shadow-xs ${isSyncing ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? "Sincronizando..." : (needsAuth ? "Conectar Google Agenda" : "Sincronizar Google Agenda")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Atendimentos na Semana</p>
            <h3 className="font-display text-xl font-extrabold text-gray-800">{totalWeekAssignments}</h3>
          </div>
          <div className="p-2.5 bg-red-50 text-brand-red rounded-lg">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Técnicos em Atividade</p>
            <h3 className="font-display text-xl font-extrabold text-gray-800">{tecnicos.filter(t => t.ativo).length}</h3>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">O.S. Pendentes de Data</p>
            <h3 className="font-display text-xl font-extrabold text-amber-600">{unscheduledOrdens.length}</h3>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Weekly Calendar Grid */}
        <div className={`${showUnscheduledPanel ? "xl:col-span-9" : "xl:col-span-12"} bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden`}>
          {/* Calendar Header Row */}
          <div className={`grid grid-cols-1 ${weekDates.length === 5 ? "md:grid-cols-6" : "md:grid-cols-8"} border-b border-gray-150 bg-gray-50 text-center font-bold`}>
            <div className="p-3 border-r border-gray-150 text-left text-gray-500 font-extrabold flex items-center gap-2">
              <User className="w-4 h-4 text-brand-red" />
              <span>Técnico</span>
            </div>
            {weekDates.map((date, idx) => {
              const isToday = new Date().toDateString() === date.toDateString();
              const daysLabel = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
              return (
                <div 
                  key={idx} 
                  className={`p-2.5 border-r border-gray-150 last:border-r-0 flex flex-col items-center justify-center ${
                    isToday ? "bg-red-50 text-brand-red ring-1 ring-brand-red/20 font-black" : "text-gray-600"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider">{daysLabel[date.getDay()]}</span>
                  <span className="font-display text-base font-extrabold mt-0.5">{date.getDate()}</span>
                </div>
              );
            })}
          </div>

          {/* Technician Schedule Rows */}
          <div className="divide-y divide-gray-150">
            {filteredTecnicos.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Nenhum técnico disponível para os filtros selecionados.</div>
            ) : (
              filteredTecnicos.map(tech => (
                <div key={tech.id} className={`grid grid-cols-1 ${weekDates.length === 5 ? "md:grid-cols-6" : "md:grid-cols-8"} hover:bg-gray-50/20 transition-colors`}>
                  {/* Tech Info */}
                  <div className="p-3 border-r border-gray-150 bg-gray-50/50 flex flex-col justify-between gap-1">
                    <div>
                      <h3 className="font-bold text-gray-800 text-xs">{tech.apelido || tech.nome}</h3>
                      <p className="text-[9px] text-gray-400 uppercase font-bold mt-0.5">{tech.cargo || "TÉCNICO"}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tech.cor_agenda || "#2563eb" }} />
                      <span className="text-[9px] text-gray-500 font-medium truncate">{tech.telefone || "Sem fone"}</span>
                    </div>
                  </div>

                  {/* Days Columns */}
                  {weekDates.map((date, idx) => {
                    const assignments = getAssignments(tech.id!, date);
                    const isToday = new Date().toDateString() === date.toDateString();
                    
                    return (
                      <div 
                        key={idx} 
                        className={`p-1.5 border-r border-gray-150 last:border-r-0 min-h-[110px] space-y-1.5 flex flex-col justify-start relative ${
                          isToday ? "bg-red-50/10" : ""
                        }`}
                      >
                        {assignments.length === 0 ? (
                          <div className="text-[10px] text-gray-300 italic text-center my-auto">Livre</div>
                        ) : (
                          assignments.map(os => {
                            const statusColors: Record<string, string> = {
                              ABERTA: "border-amber-500 bg-amber-50/70 text-amber-900",
                              "EM ATENDIMENTO": "border-blue-500 bg-blue-50/70 text-blue-900",
                              AGENDADA: "border-orange-500 bg-orange-50/70 text-orange-900",
                              AGUARDANDO: "border-purple-500 bg-purple-50/70 text-purple-900",
                              FINALIZADA: "border-emerald-500 bg-emerald-50/70 text-emerald-900"
                            };

                            return (
                              <div
                                key={os.id}
                                onClick={() => onNavigate("os", os.id)}
                                className={`p-1.5 border-l-[3px] rounded-r-md border-y border-r shadow-xs text-left cursor-pointer hover:-translate-y-0.5 transition-all text-[10px] leading-snug font-semibold ${
                                  statusColors[os.status] || "border-gray-200 bg-white"
                                }`}
                              >
                                <div className="font-bold flex justify-between gap-1 items-center">
                                  <span>{os.numero_os}</span>
                                  <div className="flex items-center gap-1">
                                    {tech.telefone && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const waUrl = buildWhatsappNotificationUrl(os, tech);
                                          if (waUrl) window.open(waUrl, "_blank");
                                        }}
                                        className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded hover:bg-emerald-100 transition-colors"
                                        title="Enviar Notificação WhatsApp ao Técnico"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                      </button>
                                    )}
                                    {os.hora_inicial && (
                                      <span className="text-[8px] font-mono opacity-60 flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5" /> {os.hora_inicial}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-[9px] mt-0.5 truncate uppercase font-bold" title={os.clientes?.razao_social}>
                                  {os.clientes?.razao_social}
                                </div>
                                <div className="text-[8px] opacity-75 truncate" title={os.implementos?.modelo}>
                                  {os.implementos?.modelo || os.tipo_atendimento}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unscheduled / Open OS Panel */}
        {showUnscheduledPanel && (
          <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col h-full max-h-[600px]">
            <div className="p-3.5 border-b border-gray-150 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-gray-800 text-xs uppercase">Pendentes de Agendamento</h3>
              </div>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                {unscheduledOrdens.length}
              </span>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto flex-1 divide-y divide-gray-100">
              {unscheduledOrdens.length === 0 ? (
                <div className="text-center py-8 text-gray-400 italic">
                  Todas as O.S. estão agendadas!
                </div>
              ) : (
                unscheduledOrdens.map(os => (
                  <div
                    key={os.id}
                    onClick={() => onNavigate("os", os.id)}
                    className="pt-2 first:pt-0 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-gray-900 group-hover:text-brand-red transition-colors">
                        {os.numero_os}
                      </span>
                      <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-bold">
                        {os.tipo_atendimento || "GERAL"}
                      </span>
                    </div>

                    <p className="text-[10px] font-bold text-gray-700 truncate mt-0.5 uppercase">
                      {os.clientes?.razao_social || "Cliente N/D"}
                    </p>

                    <p className="text-[9px] text-gray-400 truncate mt-0.5">
                      {os.implementos?.modelo ? `Equip: ${os.implementos.modelo}` : "Sem equipamento vinculado"}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between text-[9px] text-brand-red font-bold">
                      <span>Clique para abrir O.S. &rarr;</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
