import React, { useState, useEffect } from "react";
import { Building, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { API } from "../lib/api";

export const EmpresaView: React.FC = () => {
  const [companyNome, setCompanyNome] = useState("");
  const [companySubtitulo, setCompanySubtitulo] = useState("");
  const [companyEndereco, setCompanyEndereco] = useState("");
  const [companyTelefone, setCompanyTelefone] = useState("");
  const [companyCnpj, setCompanyCnpj] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyIE, setCompanyIE] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function loadCompanyData() {
      const parsed = await API.empresa.obter();
      if (parsed) {
        setCompanyNome(parsed.nome || "");
        setCompanySubtitulo(parsed.subtitulo || "");
        setCompanyEndereco(parsed.endereco || "");
        setCompanyTelefone(parsed.telefone || "");
        setCompanyCnpj(parsed.cnpj || "");
        setCompanyEmail(parsed.email || "");
        setCompanyIE(parsed.inscricao_estadual || parsed.ie || "");
        setCompanyLogo(parsed.logo || "");
      }
    }
    loadCompanyData();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const config = {
      id: 1,
      nome: companyNome,
      subtitulo: companySubtitulo,
      endereco: companyEndereco,
      telefone: companyTelefone,
      cnpj: companyCnpj,
      email: companyEmail,
      inscricao_estadual: companyIE,
      logo: companyLogo
    };
    
    try {
      await API.empresa.salvar(config);
      showToast("Configurações da empresa salvas e sincronizadas no Supabase com sucesso!");
    } catch (err) {
      showToast("Salvo localmente. Erro ao sincronizar com Supabase.", "error");
    } finally {
      setSaving(false);
    }
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
            <Building className="text-brand-red w-5 h-5" />
            Cadastro da Empresa
          </h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Insira as informações oficiais da sua empresa para cabeçalhos de relatórios e impressão de Ordens de Serviço.
          </p>
        </div>

        <form onSubmit={handleSaveCompany} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Razão Social / Nome da Empresa</label>
              <input
                type="text"
                required
                value={companyNome}
                onChange={(e) => setCompanyNome(e.target.value)}
                placeholder="Ex: Oficina Mecânica Agrícola S/A"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Slogan / Atividade Principal</label>
              <input
                type="text"
                value={companySubtitulo}
                onChange={(e) => setCompanySubtitulo(e.target.value)}
                placeholder="Ex: Serviços Mecânicos e Peças de Campo"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">CNPJ</label>
              <input
                type="text"
                value={companyCnpj}
                onChange={(e) => setCompanyCnpj(e.target.value)}
                placeholder="Ex: 00.000.000/0001-00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Inscrição Estadual (IE)</label>
              <input
                type="text"
                value={companyIE}
                onChange={(e) => setCompanyIE(e.target.value)}
                placeholder="Ex: 000.000.000-0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Endereço Completo</label>
              <input
                type="text"
                value={companyEndereco}
                onChange={(e) => setCompanyEndereco(e.target.value)}
                placeholder="Ex: Rodovia BR-163, KM 125 - Centro, Sinop - MT"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Telefone de Contato</label>
              <input
                type="text"
                value={companyTelefone}
                onChange={(e) => setCompanyTelefone(e.target.value)}
                placeholder="Ex: (66) 3544-2030"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">E-mail de Contato</label>
              <input
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="Ex: contato@suaoficina.com.br"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
              />
            </div>

            <div className="md:col-span-2 border-t border-gray-150 pt-4 mt-2">
              <label className="text-[10px] font-black text-brand-red uppercase tracking-wider block mb-2">Logomarca da Empresa (Aparece nos Relatórios e O.S.)</label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="w-20 h-20 bg-white rounded-lg border border-gray-300 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                  {companyLogo ? (
                    <>
                      <img src={companyLogo} alt="Logo preview" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setCompanyLogo("")}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold"
                      >
                        Remover
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-bold uppercase text-center p-1 leading-tight">Sem Logo</span>
                  )}
                </div>
                <div className="space-y-2 flex-1 w-full">
                  <div className="flex gap-2">
                    <label className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition inline-flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" />
                      <span>Fazer Upload da Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    {companyLogo && (
                      <button
                        type="button"
                        onClick={() => setCompanyLogo("")}
                        className="border border-red-200 text-brand-red hover:bg-red-50 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Ou cole a URL da imagem da Logo</span>
                    <input
                      type="text"
                      value={companyLogo}
                      onChange={(e) => setCompanyLogo(e.target.value)}
                      placeholder="Ex: https://meusite.com.br/logo.png"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-gray-150">
            <button
              type="submit"
              disabled={saving}
              className="btn bg-brand-red hover:bg-brand-red-dark disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider h-11 px-8 rounded-lg shadow-md flex items-center gap-2 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
