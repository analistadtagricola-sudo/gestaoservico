import React, { useState, useEffect } from "react";
import { DollarSign, CheckCircle2, AlertCircle, Plus, Trash2 } from "lucide-react";

interface RegraEntrega {
  tipo: string;
  valor: string;
}

export const ComissoesConfigView: React.FC = () => {
  const [regras, setRegras] = useState<RegraEntrega[]>([]);
  const [novoTipo, setNovoTipo] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const savedConfig = localStorage.getItem("gst_comissoes_config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setRegras(parsed.regrasEntrega || []);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (novoTipo && novoValor) {
      setRegras([...regras, { tipo: novoTipo, valor: novoValor }]);
      setNovoTipo("");
      setNovoValor("");
    }
  };

  const handleRemoveItem = (index: number) => {
    setRegras(regras.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      regrasEntrega: regras
    };
    localStorage.setItem("gst_comissoes_config", JSON.stringify(config));
    
    window.dispatchEvent(new Event("comissoes_config_updated"));
    showToast("Configurações de comissões salvas com sucesso!");
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-150 bg-gray-50/50">
          <h2 className="font-display text-lg font-extrabold uppercase text-gray-800 flex items-center gap-2">
            <DollarSign className="text-brand-red w-5 h-5" />
            Configuração de Comissões
          </h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Defina as regras de comissionamento por tipo de entrega técnica.
          </p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Regras de Entrega Técnica</h3>
            
            <div className="grid grid-cols-12 gap-2">
              <input
                placeholder="Tipo de Entrega (ex: Entrega Técnica Básica)"
                className="col-span-8 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800"
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Valor (R$)"
                className="col-span-3 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value)}
              />
              <button 
                type="button"
                onClick={handleAddItem}
                className="col-span-1 bg-gray-800 text-white rounded-lg flex items-center justify-center hover:bg-gray-900"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase">
                  <tr>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-right">Valor</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {regras.map((regra, index) => (
                    <tr key={index}>
                      <td className="p-2 text-gray-800 font-bold">{regra.tipo}</td>
                      <td className="p-2 text-gray-800 text-right font-bold">R$ {parseFloat(regra.valor).toFixed(2)}</td>
                      <td className="p-2 text-center">
                        <button type="button" onClick={() => handleRemoveItem(index)} className="text-rose-500 hover:text-rose-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
