import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Wrench, 
  Settings, 
  ShieldAlert, 
  Bell, 
  Users, 
  MapPin, 
  RotateCcw
} from "lucide-react";
import { API } from "../lib/api";
import { TipoAtendimento } from "../types";

export interface AgendaConfig {
  horaInicioWork: string;
  horaFimWork: string;
  intervaloAlmocoInicio: string;
  intervaloAlmocoFim: string;
  exibirFimDeSemana: boolean;
  limiteOsPorTecnicoDia: number;
  bloquearSobreposicao: boolean;
  notificarTecnicoWhatsapp: boolean;
  gerarRotaMaps: boolean;
  duracaoAtendimentoPorTipo: Record<string, number>; // em horas
}

const DEFAULT_AGENDA_CONFIG: AgendaConfig = {
  horaInicioWork: "07:30",
  horaFimWork: "18:00",
  intervaloAlmocoInicio: "12:00",
  intervaloAlmocoFim: "13:30",
  exibirFimDeSemana: true,
  limiteOsPorTecnicoDia: 4,
  bloquearSobreposicao: true,
  notificarTecnicoWhatsapp: true,
  gerarRotaMaps: true,
  duracaoAtendimentoPorTipo: {
    "ASSISTÊNCIA TÉCNICA": 4,
    "GARANTIA": 3,
    "REVISÃO PREVENTIVA": 2,
    "ENTREGA TÉCNICA": 3,
    "MONTAGEM": 6,
    "TREINAMENTO": 2,
    "OUTRO": 2
  }
};

export const ConfigAgendaView: React.FC = () => {
  const [config, setConfig] = useState<AgendaConfig>(DEFAULT_AGENDA_CONFIG);
  const [tiposAtendimento, setTiposAtendimento] = useState<TipoAtendimento[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadConfig();
    loadTipos();
  }, []);

  const loadTipos = async () => {
    try {
      const data = await API.tiposAtendimento.listar();
      setTiposAtendimento(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadConfig = async () => {
    try {
      const dbConfig = await API.configuracoesAgenda.obter();
      if (dbConfig) {
        const merged = {
          ...DEFAULT_AGENDA_CONFIG,
          ...dbConfig,
          duracaoAtendimentoPorTipo: {
            ...DEFAULT_AGENDA_CONFIG.duracaoAtendimentoPorTipo,
            ...(dbConfig.duracaoAtendimentoPorTipo || {})
          }
        };
        setConfig(merged);
        localStorage.setItem("gst_agenda_config_v1", JSON.stringify(merged));
        return;
      }
    } catch (e) {
      console.warn("Could not load agenda config from Supabase, checking local storage...", e);
    }

    const stored = localStorage.getItem("gst_agenda_config_v1");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfig({
          ...DEFAULT_AGENDA_CONFIG,
          ...parsed,
          duracaoAtendimentoPorTipo: {
            ...DEFAULT_AGENDA_CONFIG.duracaoAtendimentoPorTipo,
            ...(parsed.duracaoAtendimentoPorTipo || {})
          }
        });
      } catch (e) {
        // fallback
      }
    }
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      localStorage.setItem("gst_agenda_config_v1", JSON.stringify(config));
      await API.configuracoesAgenda.salvar(config);
      window.dispatchEvent(new Event("agenda_config_updated"));
      showToast("Configurações da agenda salvas com sucesso!");
    } catch (err) {
      showToast("Erro ao salvar configurações da agenda.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm("Deseja restaurar as configurações padrão da agenda de campo?")) {
      setConfig(DEFAULT_AGENDA_CONFIG);
      localStorage.setItem("gst_agenda_config_v1", JSON.stringify(DEFAULT_AGENDA_CONFIG));
      await API.configuracoesAgenda.salvar(DEFAULT_AGENDA_CONFIG);
      showToast("Configurações restauradas para os padrões do sistema.");
    }
  };

  const updateDuracaoTipo = (tipoNome: string, horas: number) => {
    setConfig(prev => ({
      ...prev,
      duracaoAtendimentoPorTipo: {
        ...prev.duracaoAtendimentoPorTipo,
        [tipoNome]: horas
      }
    }));
  };

  return (
    <div className="space-y-6 animate-fade">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl font-bold text-xs flex items-center gap-2 ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-gray-900 flex items-center gap-2.5">
            <Calendar className="w-8 h-8 text-brand-red" />
            Configurações da Agenda de Campo
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Defina horários de expediente, tempos padrão de atendimento por tipo de O.S. e parâmetros de agendamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-lg text-xs font-bold hover:bg-brand-red-dark transition-colors shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Salvando..." : "Salvar Configurações"}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Expediente & Jornada */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-150 bg-gray-50/50 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-red" />
            <div>
              <h2 className="font-display text-sm font-extrabold uppercase text-gray-800">Expediente e Turnos de Trabalho</h2>
              <p className="text-[11px] text-gray-400">Horários de início e término das rotas e atendimentos técnicos.</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Início da Jornada</label>
              <input
                type="time"
                value={config.horaInicioWork}
                onChange={(e) => setConfig({ ...config, horaInicioWork: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-brand-red focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Fim da Jornada</label>
              <input
                type="time"
                value={config.horaFimWork}
                onChange={(e) => setConfig({ ...config, horaFimWork: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-brand-red focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Intervalo Almoço (Início)</label>
              <input
                type="time"
                value={config.intervaloAlmocoInicio}
                onChange={(e) => setConfig({ ...config, intervaloAlmocoInicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-brand-red focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Intervalo Almoço (Fim)</label>
              <input
                type="time"
                value={config.intervaloAlmocoFim}
                onChange={(e) => setConfig({ ...config, intervaloAlmocoFim: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-brand-red focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Duração Padrão por Tipo de Atendimento */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-150 bg-gray-50/50 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="font-display text-sm font-extrabold uppercase text-gray-800">Tempo Estimado por Tipo de Atendimento</h2>
              <p className="text-[11px] text-gray-400">Duração média utilizada para alocação de horário no calendário semanal.</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(DEFAULT_AGENDA_CONFIG.duracaoAtendimentoPorTipo).map((tipo) => {
              const currentVal = config.duracaoAtendimentoPorTipo[tipo] ?? 2;
              return (
                <div key={tipo} className="p-3 bg-gray-50 rounded-lg border border-gray-150 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 uppercase truncate max-w-[180px]" title={tipo}>
                    {tipo}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0.5}
                      max={12}
                      step={0.5}
                      value={currentVal}
                      onChange={(e) => updateDuracaoTipo(tipo, parseFloat(e.target.value) || 1)}
                      className="w-16 px-2 py-1 border border-gray-200 rounded text-xs font-bold text-center bg-white"
                    />
                    <span className="text-[10px] font-black text-gray-400">Horas</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Regras de Bloqueio e Notificações */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-150 bg-gray-50/50 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="font-display text-sm font-extrabold uppercase text-gray-800">Regras e Parâmetros de Segurança</h2>
              <p className="text-[11px] text-gray-400">Validações e integrações automáticas durante o agendamento.</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                  Limite Máximo de O.S. por Técnico / Dia
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.limiteOsPorTecnicoDia}
                  onChange={(e) => setConfig({ ...config, limiteOsPorTecnicoDia: parseInt(e.target.value) || 4 })}
                  className="w-full md:w-48 px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-brand-red outline-none"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.exibirFimDeSemana}
                    onChange={(e) => setConfig({ ...config, exibirFimDeSemana: e.target.checked })}
                    className="w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800">Exibir Sábado e Domingo na Agenda</span>
                    <p className="text-[10px] text-gray-400">Mantém colunas de final de semana ativas no calendário</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.bloquearSobreposicao}
                    onChange={(e) => setConfig({ ...config, bloquearSobreposicao: e.target.checked })}
                    className="w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800">Alertar Sobreposição de Horários</span>
                    <p className="text-[10px] text-gray-400">Emite aviso caso um técnico tenha duas O.S. no mesmo horário</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notificarTecnicoWhatsapp}
                    onChange={(e) => setConfig({ ...config, notificarTecnicoWhatsapp: e.target.checked })}
                    className="w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800">Notificação Automática ao Técnico (WhatsApp)</span>
                    <p className="text-[10px] text-gray-400">Envia resumo da O.S. ao técnico quando agendada</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
