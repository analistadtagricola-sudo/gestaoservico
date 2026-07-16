import React, { useState, useEffect } from "react";
import { Palette, CheckCircle2, AlertCircle } from "lucide-react";

export const LayoutView: React.FC = () => {
  const [selectedThemeColor, setSelectedThemeColor] = useState("#E30613");
  const [selectedSidebarColor, setSelectedSidebarColor] = useState("#111317");
  const [darkModeActive, setDarkModeActive] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("gst_theme_color");
    if (savedTheme) {
      setSelectedThemeColor(savedTheme);
    }
    const savedSidebarColor = localStorage.getItem("gst_sidebar_color");
    if (savedSidebarColor) {
      setSelectedSidebarColor(savedSidebarColor);
    }
    const savedDark = localStorage.getItem("gst_dark_mode");
    if (savedDark === "true") {
      setDarkModeActive(true);
    }
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveTheme = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("gst_theme_color", selectedThemeColor);
    localStorage.setItem("gst_sidebar_color", selectedSidebarColor);
    localStorage.setItem("gst_dark_mode", String(darkModeActive));
    
    // Apply CSS variables dynamically so user gets immediate visual feedback
    document.documentElement.style.setProperty("--color-brand-red", selectedThemeColor);
    const darkColor = selectedThemeColor === "#367c2b" ? "#1e4d19" 
                      : selectedThemeColor === "#0056b3" ? "#003a80"
                      : selectedThemeColor === "#f1b51c" ? "#b3820a"
                      : selectedThemeColor === "#262626" ? "#0a0a0a"
                      : selectedThemeColor === "#f15a24" ? "#b33c0d"
                      : "#a8040e";
    document.documentElement.style.setProperty("--color-brand-red-dark", darkColor);
    
    window.dispatchEvent(new Event("theme_updated"));
    window.dispatchEvent(new Event("sidebar_color_updated"));
    showToast("Configurações de tema salvas com sucesso!");
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
            <Palette className="text-brand-red w-5 h-5" />
            Aparência do Sistema e Cores da Marca
          </h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Personalize a paleta de cores dominante da oficina para alinhar com o fabricante das suas frotas ou identidade visual.
          </p>
        </div>

        <form onSubmit={handleSaveTheme} className="p-6 space-y-8">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-3">Escolha a cor predominante (Frotas e Marcas)</label>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {[
                { id: "massey", name: "Vermelho Massey", color: "#E30613", desc: "Massey Ferguson" },
                { id: "nh", name: "Azul New Holland", color: "#0056b3", desc: "New Holland" },
                { id: "jd", name: "Verde John Deere", color: "#367c2b", desc: "John Deere" },
                { id: "valtra", name: "Amarelo Valtra", color: "#f1b51c", desc: "Valtra" },
                { id: "case", name: "Cinza Case IH", color: "#262626", desc: "Case IH" },
                { id: "agrale", name: "Laranja Agrale", color: "#f15a24", desc: "Agrale & Outros" }
              ].map((item) => {
                const isSelected = selectedThemeColor === item.color;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedThemeColor(item.color)}
                    className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all ${
                      isSelected 
                        ? "border-brand-ink ring-2 ring-offset-2 ring-brand-red shadow-sm" 
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span 
                      className="w-8 h-8 rounded-full mb-2 shadow" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="text-xs font-black text-gray-800 tracking-tight block">{item.name}</span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">Configurações de Layout</h3>
              
              <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={darkModeActive}
                  onChange={(e) => setDarkModeActive(e.target.checked)}
                  className="rounded text-brand-red mt-0.5 focus:ring-brand-red"
                />
                <div>
                  <span className="text-xs font-bold text-gray-700 block">Simular Modo Noturno (Escuro)</span>
                  <span className="text-[10px] text-gray-400 block">Ajusta o contraste do painel lateral e do menu para tons escuros de alta legibilidade de campo.</span>
                </div>
              </label>

              <div className="pt-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">Cor do Painel Lateral</label>
                <input 
                  type="color" 
                  value={selectedSidebarColor}
                  onChange={(e) => setSelectedSidebarColor(e.target.value)}
                  className="w-full h-10 rounded-lg cursor-pointer border-0"
                />
              </div>
              <div className="pt-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Tamanho de Fonte do Painel</label>
                <select
                  className="bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-xs font-bold text-gray-700 w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
                  defaultValue="medium"
                >
                  <option value="small">Compacto (Para telas menores de notebook)</option>
                  <option value="medium">Padrão do Sistema (Altamente Legível)</option>
                  <option value="large">Ampliado (Facilita leitura em tablets de campo)</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-200/80 p-5 space-y-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Visualização em Tempo Real</span>
              <div className="bg-white border border-gray-150 p-4 rounded-lg shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedThemeColor }} />
                  <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">Gestão Pós-Venda Agrícola</span>
                </div>
                <p className="text-[10px] text-gray-400">Exemplo de cabeçalho com a identidade ativa de sua oficina.</p>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    className="text-[10px] font-bold px-3 py-1.5 rounded-md text-white transition-all shadow"
                    style={{ backgroundColor: selectedThemeColor }}
                  >
                    Botão Principal
                  </button>
                  <button 
                    type="button"
                    className="text-[10px] font-bold px-3 py-1.5 rounded-md border text-gray-600 bg-gray-50 border-gray-200"
                  >
                    Botão Secundário
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-gray-150">
            <button
              type="submit"
              className="btn text-white text-xs font-black uppercase tracking-wider h-11 px-8 rounded-lg shadow-md flex items-center gap-2"
              style={{ backgroundColor: selectedThemeColor }}
            >
              Aplicar Tema Selecionado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
