export interface AuditLog {
  id: string;
  data: string;
  usuario: string;
  categoria: "Ordens de Serviço" | "Clientes & Implementos" | "Financeiro & Comissões" | "Autenticação & Segurança" | "Sistema" | "Garantias" | "Planos de Manutenção";
  nivel: "INFO" | "SUCESSO" | "ALERTA" | "ERRO";
  acao: string;
  detalhes: string;
  ip?: string;
}

export const addAuditLog = (
  usuario: string | undefined | null,
  categoria: AuditLog["categoria"],
  nivel: AuditLog["nivel"],
  acao: string,
  detalhes: string
) => {
  try {
    const stored = localStorage.getItem("gst_audit_logs_v3");
    let logs: AuditLog[] = [];
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          logs = parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    
    const userDisplay = usuario || "sistema";
    
    const newLog: AuditLog = {
      id: "log-" + Date.now() + Math.random().toString(36).substring(2, 6),
      data: new Date().toLocaleString("pt-BR"),
      usuario: userDisplay,
      categoria,
      nivel,
      acao,
      detalhes
    };
    
    logs.unshift(newLog); // Put latest first
    // Limit to 500 logs to prevent localStorage bloat
    if (logs.length > 500) {
      logs = logs.slice(0, 500);
    }
    
    localStorage.setItem("gst_audit_logs_v3", JSON.stringify(logs));
    
    // Also dispatch a custom event so if LogsView is currently mounted, it can reload in real-time!
    window.dispatchEvent(new Event("gst_audit_logs_updated"));
  } catch (err) {
    console.error("Failed to add audit log:", err);
  }
};
