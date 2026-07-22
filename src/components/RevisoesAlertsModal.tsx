import React, { useState } from "react";
import { 
  AlertTriangle, 
  Clock, 
  X, 
  Search, 
  Filter, 
  Tractor, 
  PlusCircle, 
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Building2,
  Calendar,
  Layers
} from "lucide-react";
import { RevisionAlert } from "../lib/revisionAlerts";

interface RevisoesAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: RevisionAlert[];
  onNavigate: (view: string, targetId?: number) => void;
}

export const RevisoesAlertsModal: React.FC<RevisoesAlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"TODAS" | "ATRASADA" | "PROXIMA">("TODAS");

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter(item => {
    const matchesFilter = filterType === "TODAS" || item.status === filterType;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      item.implemento.modelo?.toLowerCase().includes(term) ||
      item.implemento.fabricante?.toLowerCase().includes(term) ||
      item.implemento.numero_serie?.toLowerCase().includes(term) ||
      item.clienteName.toLowerCase().includes(term) ||
      item.revisao.descricao?.toLowerCase().includes(term) ||
      `${item.revisao.horas_limite}h`.includes(term);

    return matchesFilter && matchesSearch;
  });

  const totalAtrasadas = alerts.filter(a => a.status === "ATRASADA").length;
  const totalProximas = alerts.filter(a => a.status === "PROXIMA").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 bg-white text-gray-900 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold font-display uppercase tracking-wide flex items-center gap-2 text-gray-900">
                Central de Alertas de Revisão Preventiva
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Monitoramento automático por horímetro acumulado em frotas com plano de manutenção ativo.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Counter Summary Bar */}
        <div className="grid grid-cols-3 divide-x divide-gray-150 border-b border-gray-150 bg-gray-50/80 text-xs">
          <div className="p-3 text-center">
            <span className="text-gray-500 font-bold uppercase text-[10px] block">Total de Alertas</span>
            <span className="font-extrabold font-mono text-base text-gray-800">{alerts.length}</span>
          </div>
          <div className="p-3 text-center bg-rose-50/50">
            <span className="text-rose-700 font-extrabold uppercase text-[10px] block">⚠️ Vencidas / Pendentes</span>
            <span className="font-extrabold font-mono text-base text-rose-600">{totalAtrasadas}</span>
          </div>
          <div className="p-3 text-center bg-amber-50/50">
            <span className="text-amber-800 font-extrabold uppercase text-[10px] block">🔔 Próximas (&lt;50h)</span>
            <span className="font-extrabold font-mono text-base text-amber-600">{totalProximas}</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 bg-white border-b border-gray-150 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por modelo, série, cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setFilterType("TODAS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors ${
                filterType === "TODAS" 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Todas ({alerts.length})
            </button>
            <button
              onClick={() => setFilterType("ATRASADA")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors flex items-center gap-1 ${
                filterType === "ATRASADA" 
                  ? "bg-rose-600 text-white shadow-xs" 
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60"
              }`}
            >
              ⚠️ Pendentes / Vencidas ({totalAtrasadas})
            </button>
            <button
              onClick={() => setFilterType("PROXIMA")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors flex items-center gap-1 ${
                filterType === "PROXIMA" 
                  ? "bg-amber-500 text-white shadow-xs" 
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              🔔 Próximas ({totalProximas})
            </button>
          </div>
        </div>

        {/* Content Body List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {filteredAlerts.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white p-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h3 className="font-extrabold text-sm text-gray-700 uppercase">Nenhum Alerta de Revisão Encontrado</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                Nenhum equipamento da frota possui revisões pendentes ou próximas do limite horímetro para o filtro selecionado.
              </p>
            </div>
          ) : (
            filteredAlerts.map((item) => {
              const isOverdue = item.status === "ATRASADA";
              return (
                <div 
                  key={item.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isOverdue 
                      ? "border-rose-200/80 bg-gradient-to-r from-rose-50/30 to-white hover:border-rose-300" 
                      : "border-amber-200/80 bg-gradient-to-r from-amber-50/20 to-white hover:border-amber-300"
                  }`}
                >
                  {/* Equipment & Client Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                        isOverdue 
                          ? "bg-rose-100 text-rose-800 border-rose-300" 
                          : "bg-amber-100 text-amber-900 border-amber-300"
                      }`}>
                        {isOverdue ? "⚠️ PENDENTE / ATRASADA" : "🔔 PRÓXIMA DO LIMITE"}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase font-mono">
                        Nº Série: {item.implemento.numero_serie || "S/N"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Tractor className="w-4 h-4 text-slate-700 shrink-0" />
                      <h4 className="font-extrabold text-sm text-gray-900 font-display">
                        {item.implemento.fabricante ? `${item.implemento.fabricante} ` : ""}{item.implemento.modelo || "Equipamento"}
                      </h4>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <strong>Cliente:</strong> {item.clienteName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-gray-400" />
                        <strong>Etapa #{item.revisao.revisao_numero}:</strong> {item.revisao.horas_limite}h ({item.revisao.descricao || "Revisão Preventiva"})
                      </span>
                    </div>
                  </div>

                  {/* Horímetro Comparison Box */}
                  <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-lg text-center shrink-0 min-w-[170px]">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase block tracking-wider">Horímetro Atual</span>
                    <span className="font-mono font-black text-gray-800 text-base">{item.currentHorimetro} h</span>
                    <div className={`mt-1 text-[11px] font-extrabold font-mono px-2 py-0.5 rounded ${
                      isOverdue 
                        ? "bg-rose-100 text-rose-800" 
                        : "bg-amber-100 text-amber-900"
                    }`}>
                      {isOverdue 
                        ? `Excedido em ${Math.abs(item.horasFaltantes)}h` 
                        : `Faltam apenas ${item.horasFaltantes}h`
                      }
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 md:flex-col md:items-end">
                    <button
                      onClick={() => {
                        onClose();
                        onNavigate("os", 0);
                      }}
                      className="flex-1 md:flex-none px-3 py-2 bg-brand-red hover:bg-red-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Abrir O.S.
                    </button>
                    
                    <button
                      onClick={() => {
                        onClose();
                        onNavigate("implementos");
                      }}
                      className="flex-1 md:flex-none px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      Ver Frota <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>Mostrando <strong>{filteredAlerts.length}</strong> de <strong>{alerts.length}</strong> alertas registrados</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
