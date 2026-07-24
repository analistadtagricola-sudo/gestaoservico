import React, { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Trash2, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  XCircle, 
  Calendar, 
  User, 
  Shield, 
  Database,
  Tag
} from "lucide-react";

export interface AuditLog {
  id: string;
  data: string;
  usuario: string;
  categoria: "Ordens de Serviço" | "Clientes & Implementos" | "Financeiro & Comissões" | "Autenticação & Segurança" | "Sistema";
  nivel: "INFO" | "SUCESSO" | "ALERTA" | "ERRO";
  acao: string;
  detalhes: string;
  ip?: string;
}

const getDefaultLogs = (): AuditLog[] => [
  {
    id: "log-100",
    data: new Date().toLocaleString("pt-BR"),
    usuario: "sistema",
    categoria: "Sistema",
    nivel: "INFO",
    acao: "Inicialização do Sistema",
    detalhes: "Módulos de Gestão de Serviços e conexões de banco de dados ativados."
  }
];

export const LogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("TODAS");
  const [selectedNivel, setSelectedNivel] = useState<string>("TODOS");
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadLogs();

    const handleUpdate = () => {
      loadLogs();
    };
    window.addEventListener("gst_audit_logs_updated", handleUpdate);
    return () => {
      window.removeEventListener("gst_audit_logs_updated", handleUpdate);
    };
  }, []);

  const loadLogs = () => {
    const stored = localStorage.getItem("gst_audit_logs_v3");
    if (stored !== null) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLogs(parsed);
          return;
        }
      } catch (e) {
        // fall back
      }
    }
    // Seed default logs if none stored
    const defaults = getDefaultLogs();
    setLogs(defaults);
    localStorage.setItem("gst_audit_logs_v3", JSON.stringify(defaults));
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleClearLogs = () => {
    if (window.confirm("Deseja realmente limpar todo o histórico de logs de auditoria?")) {
      setLogs([]);
      localStorage.setItem("gst_audit_logs_v3", JSON.stringify([]));
      showToast("Histórico de logs limpo com sucesso!");
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      showToast("Nenhum log disponível para exportação.", "error");
      return;
    }

    const headers = ["ID", "Data/Hora", "Usuário", "Categoria", "Nível", "Ação", "Detalhes"];
    const rows = filteredLogs.map(l => {
      const safeDetails = l.detalhes ? l.detalhes.replace(/"/g, '""') : "";
      return [
        l.id,
        `"${l.data || ""}"`,
        `"${l.usuario || ""}"`,
        `"${l.categoria || ""}"`,
        `"${l.nivel || ""}"`,
        `"${l.acao || ""}"`,
        `"${safeDetails}"`
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `logs_auditoria_gst_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Logs exportados em CSV com sucesso!");
  };

  // Filter logs based on inputs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.detalhes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategoria = selectedCategoria === "TODAS" || log.categoria === selectedCategoria;
    const matchesNivel = selectedNivel === "TODOS" || log.nivel === selectedNivel;

    return matchesSearch && matchesCategoria && matchesNivel;
  });

  const getNivelBadge = (nivel: AuditLog["nivel"]) => {
    switch (nivel) {
      case "SUCESSO":
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> SUCESSO</span>;
      case "ALERTA":
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> ALERTA</span>;
      case "ERRO":
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1"><XCircle className="w-3 h-3" /> ERRO</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1"><Info className="w-3 h-3" /> INFO</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl font-bold text-xs flex items-center gap-2 ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-gray-900 flex items-center gap-2.5">
            <ClipboardList className="w-8 h-8 text-brand-red" />
            Logs de Auditoria & Atividades
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Rastreabilidade e registro histórico de ações, modificações e operações no sistema.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleClearLogs}
            className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Logs</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ação, usuário ou detalhes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-red focus:border-transparent outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filter Categoria */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-bold text-gray-500">Categoria:</span>
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50 focus:outline-none"
            >
              <option value="TODAS">Todas</option>
              <option value="Ordens de Serviço">Ordens de Serviço</option>
              <option value="Clientes & Implementos">Clientes & Implementos</option>
              <option value="Financeiro & Comissões">Financeiro & Comissões</option>
              <option value="Autenticação & Segurança">Autenticação & Segurança</option>
              <option value="Sistema">Sistema</option>
            </select>
          </div>

          {/* Filter Nivel */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-gray-500">Nível:</span>
            <select
              value={selectedNivel}
              onChange={(e) => setSelectedNivel(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50 focus:outline-none"
            >
              <option value="TODOS">Todos</option>
              <option value="INFO">Info</option>
              <option value="SUCESSO">Sucesso</option>
              <option value="ALERTA">Alerta</option>
              <option value="ERRO">Erro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Usuário</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Nível</th>
                <th className="p-3">Ação</th>
                <th className="p-3">Detalhes do Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                    Nenhum registro de log encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-3 whitespace-nowrap font-mono text-gray-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{log.data}</span>
                    </td>
                    <td className="p-3 whitespace-nowrap font-bold text-gray-800">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>{log.usuario}</span>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-gray-600 font-medium">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {log.categoria}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {getNivelBadge(log.nivel)}
                    </td>
                    <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                      {log.acao}
                    </td>
                    <td className="p-3 text-gray-600 max-w-md truncate" title={log.detalhes}>
                      {log.detalhes}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-gray-50 border-t border-gray-150 text-[11px] text-gray-500 flex justify-between items-center">
          <span>Exibindo <strong>{filteredLogs.length}</strong> de <strong>{logs.length}</strong> registros</span>
          <span className="text-gray-400">Registros em memória local e auditoria Supabase</span>
        </div>
      </div>
    </div>
  );
};
