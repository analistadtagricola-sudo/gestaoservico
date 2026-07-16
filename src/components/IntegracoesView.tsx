import React, { useState, useEffect } from "react";
import { Cpu, CheckCircle2, AlertCircle } from "lucide-react";

export const IntegracoesView: React.FC = () => {
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [gdriveEnabled, setgdriveEnabled] = useState(false);
  const [gdriveFolder, setgdriveFolder] = useState("");
  const [erpSyncEnabled, seterpSyncEnabled] = useState(false);
  const [erpApiKey, seterpApiKey] = useState("");
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const savedIntegrations = localStorage.getItem("gst_integrations_v1");
    if (savedIntegrations) {
      try {
        const parsed = JSON.parse(savedIntegrations);
        setWhatsappEnabled(!!parsed.whatsappEnabled);
        setWhatsappToken(parsed.whatsappToken || "");
        setWhatsappPhone(parsed.whatsappPhone || "");
        setgdriveEnabled(!!parsed.gdriveEnabled);
        setgdriveFolder(parsed.gdriveFolder || "");
        seterpSyncEnabled(!!parsed.erpSyncEnabled);
        seterpApiKey(parsed.erpApiKey || "");
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveIntegrations = (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      whatsappEnabled,
      whatsappToken,
      whatsappPhone,
      gdriveEnabled,
      gdriveFolder,
      erpSyncEnabled,
      erpApiKey
    };
    localStorage.setItem("gst_integrations_v1", JSON.stringify(config));
    showToast("Configurações de integrações salvas com sucesso!");
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl font-bold text-xs flex items-center gap-2 animate-fade ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade">
        <div className="p-5 border-b border-gray-150 bg-gray-50/50">
          <h2 className="font-display text-lg font-extrabold uppercase text-gray-800 flex items-center gap-2">
            <Cpu className="text-brand-red w-5 h-5" />
            Integrações Externas, WhatsApp e Nuvem
          </h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Conecte o seu sistema a canais de notificação ativa de clientes, backups de laudos de campo e sincronizadores fiscais.
          </p>
        </div>

        <form onSubmit={handleSaveIntegrations} className="p-6 space-y-8">
          <div className="space-y-6">
            
            {/* WhatsApp Integration Block */}
            <div className="border border-gray-150 rounded-xl p-5 space-y-4 hover:border-gray-200 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                    💬
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase text-gray-800">WhatsApp Business API (Mensageria Pós-Venda)</h3>
                    <p className="text-[10px] text-gray-400">Disparo automático de PDFs de Ordens de Serviço abertas ou concluídas.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              
              {whatsappEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Token de Acesso (API)</label>
                    <input type="password" value={whatsappToken} onChange={(e) => setWhatsappToken(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800" placeholder="Token..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Telefone da Conta (DDI+DDD+Nº)</label>
                    <input type="text" value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800" placeholder="55..." />
                  </div>
                </div>
              )}
            </div>

            {/* GDrive Block */}
            <div className="border border-gray-150 rounded-xl p-5 space-y-4 hover:border-gray-200 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                    📁
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase text-gray-800">Google Drive (Backup de Documentos)</h3>
                    <p className="text-[10px] text-gray-400">Salva automaticamente cópias em PDF de todas as Ordens de Serviço.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={gdriveEnabled}
                    onChange={(e) => setgdriveEnabled(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
              {gdriveEnabled && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">ID da Pasta no Drive (RAIZ)</label>
                  <input type="text" value={gdriveFolder} onChange={(e) => setgdriveFolder(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800" placeholder="ID da pasta..." />
                </div>
              )}
            </div>
            
            {/* ERP Sync Block */}
            <div className="border border-gray-150 rounded-xl p-5 space-y-4 hover:border-gray-200 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                    🔄
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase text-gray-800">Sincronização ERP / Fiscal</h3>
                    <p className="text-[10px] text-gray-400">Exportação automática de notas fiscais de serviço e peças.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={erpSyncEnabled}
                    onChange={(e) => seterpSyncEnabled(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
              </div>
              {erpSyncEnabled && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">API Key do seu ERP</label>
                  <input type="password" value={erpApiKey} onChange={(e) => seterpApiKey(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800" placeholder="API Key..." />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-gray-150">
            <button
              type="submit"
              className="btn bg-brand-red hover:bg-brand-red-dark text-white text-xs font-black uppercase tracking-wider h-11 px-8 rounded-lg shadow-md flex items-center gap-2"
            >
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
