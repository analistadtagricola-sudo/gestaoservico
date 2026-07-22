import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Tractor, 
  LayoutDashboard, 
  ClipboardList, 
  CalendarRange, 
  Users, 
  ShieldAlert, 
  FileBarChart2, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  Database,
  Menu,
  X,
  DollarSign,
  Search,
  Bell,
  Calendar,
  UserCheck,
  ArrowUpRight,
  HelpCircle,
} from "lucide-react";

import { API } from "./lib/api";
import { Cliente, Implemento, Tecnico, OrdemServico } from "./types";
import { useUser } from "./lib/UserContext";

// Import Custom Subviews
import { DashboardView } from "./components/DashboardView";
import { ClientesView } from "./components/ClientesView";
import { ImplementosView } from "./components/ImplementosView";
import { TecnicosView } from "./components/TecnicosView";
import { VeiculosView } from "./components/VeiculosView";
import { TiposAtendimentoView } from "./components/TiposAtendimentoView";
import { OrdensServicoView } from "./components/OrdensServicoView";
import { PlanosView } from "./components/PlanosView";
import { AgendaView } from "./components/AgendaView";
import { RelatoriosView } from "./components/RelatoriosView";
import { ComissoesView } from "./components/ComissoesView";
import { UsuariosView } from "./components/UsuariosView";
import { EmpresaView } from "./components/EmpresaView";
import { LoginView } from "./components/LoginView";
import { LayoutView } from "./components/LayoutView";
import { ComissoesConfigView } from "./components/ComissoesConfigView";
import { ConfigAgendaView } from "./components/ConfigAgendaView";
import { IntegracoesView } from "./components/IntegracoesView";
import { BackupView } from "./components/BackupView";
import { LogsView } from "./components/LogsView";
import { SobreView } from "./components/SobreView";

type ActiveView = "dashboard" | "os" | "agenda" | "clientes" | "implementos" | "tecnicos" | "planos" | "relatorios" | "comissoes" | "usuarios" | "veiculos" | "tipos_atendimento" | "empresa" | "layout" | "config_agenda" | "comissoes_config" | "integracoes" | "backup" | "logs" | "sobre";

interface WorkspaceTab {
  id: string; // unique tab identifier
  label: string;
  view: ActiveView;
  params?: any; // any payload like { osId: 158 }
  closable: boolean;
  status?: string; // Status of OS (e.g. "ABERTA", "EM ATENDIMENTO")
}

export function AppContent() {
  const { currentUser, setCurrentUser } = useUser();

  const [sidebarBgColor, setSidebarBgColor] = useState("#111317");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const savedSidebarColor = localStorage.getItem("gst_sidebar_color");
    if (savedSidebarColor) {
      setSidebarBgColor(savedSidebarColor);
    }
    const handleSidebarColorUpdate = () => {
        const updated = localStorage.getItem("gst_sidebar_color");
        if (updated) setSidebarBgColor(updated);
    }
    window.addEventListener("sidebar_color_updated", handleSidebarColorUpdate);
    return () => window.removeEventListener("sidebar_color_updated", handleSidebarColorUpdate);
  }, []);

  // Global Data State
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [implementos, setImplementos] = useState<Implemento[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    const loadCompany = () => {
      const stored = localStorage.getItem("gst_company_config_v1");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCompanyName(parsed.nome || "Oficina Mecânica");
        } catch (e) {
          setCompanyName("Oficina Mecânica");
        }
      } else {
        setCompanyName("Oficina Mecânica");
      }
    };
    loadCompany();
    window.addEventListener("company_config_updated", loadCompany);
    return () => window.removeEventListener("company_config_updated", loadCompany);
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem("gst_theme_color");
      if (savedTheme) {
        document.documentElement.style.setProperty("--color-brand-red", savedTheme);
        const darkColor = savedTheme === "#367c2b" ? "#1e4d19" 
                          : savedTheme === "#0056b3" ? "#003a80"
                          : savedTheme === "#f1b51c" ? "#b3820a"
                          : savedTheme === "#262626" ? "#0a0a0a"
                          : savedTheme === "#f15a24" ? "#b33c0d"
                          : "#a8040e";
        document.documentElement.style.setProperty("--color-brand-red-dark", darkColor);
      }
    };
    applyTheme();
    window.addEventListener("theme_updated", applyTheme);
    return () => window.removeEventListener("theme_updated", applyTheme);
  }, []);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Tabs Workspace State
  const [tabs, setTabs] = useState<WorkspaceTab[]>([
    { id: "dashboard", label: "Dashboard", view: "dashboard", closable: false }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("dashboard");

  // Format Current Date
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatBrazilianDate = (date: Date) => {
    const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [cList, iList, tList, oList] = await Promise.all([
        API.clientes.listar(),
        API.implementos.listar(),
        API.tecnicos.listar(),
        API.ordensServico.listar()
      ]);
      setClientes(cList);
      setImplementos(iList);
      setTecnicos(tList);
      setOrdens(oList);
    } catch (err) {
      console.error("Erro ao carregar os dados:", err);
      setToastMessage("Erro ao sincronizar com o banco de dados.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Ctrl+K Search Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Safe navigation proxy to handle browser-like tab routing
  const handleNavigateWithTarget = (viewStr: string, targetId?: number) => {
    const view = viewStr as ActiveView;
    let tabId = viewStr;
    let tabLabel = "";

    if (viewStr === "os") {
      if (targetId !== undefined && targetId !== null) {
        if (targetId === 0) {
          tabId = "os_new";
          tabLabel = "Nova O.S.";
        } else {
          tabId = `os_edit_${targetId}`;
          const foundOS = ordens.find(o => o.id === targetId);
          tabLabel = foundOS ? foundOS.numero_os : `OS #${targetId}`;
        }
      } else {
        tabId = "os";
        tabLabel = "Ordens de Serviço";
      }
    } else {
      const menuObj = menuItems.find(m => m.id === viewStr);
      tabLabel = menuObj ? menuObj.label : viewStr;
    }

    // Check if tab already exists
    const existing = tabs.find(t => t.id === tabId);
    if (existing) {
      setActiveTabId(tabId);
    } else {
      const newTab: WorkspaceTab = {
        id: tabId,
        label: tabLabel,
        view,
        params: targetId !== undefined ? { osId: targetId } : undefined,
        closable: true,
        status: viewStr === "os" && targetId ? ordens.find(o => o.id === targetId)?.status : undefined
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(tabId);
    }
    setSidebarOpen(false);
  };

  // Close workspace tab
  const closeTab = (tabIdToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tabIndex = tabs.findIndex(t => t.id === tabIdToClose);
    if (tabIndex === -1) return;

    const filteredTabs = tabs.filter(t => t.id !== tabIdToClose);
    setTabs(filteredTabs);

    if (activeTabId === tabIdToClose) {
      // Find previous tab or dashboard
      const nextActiveTab = filteredTabs[tabIndex - 1] || filteredTabs[0] || tabs[0];
      setActiveTabId(nextActiveTab.id);
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const allMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, category: "OPERAÇÃO", permissionKey: "dashboard" as keyof Permissions },
    { id: "clientes", label: "Clientes", icon: Users, category: "OPERAÇÃO", permissionKey: "clientes" as keyof Permissions },
    { id: "implementos", label: "Implementos", icon: Tractor, category: "OPERAÇÃO", permissionKey: "implementos" as keyof Permissions },
    { id: "os", label: "Ordem de Serviço", icon: ClipboardList, category: "OPERAÇÃO", permissionKey: "os" as keyof Permissions },
    { id: "agenda", label: "Agenda", icon: CalendarRange, category: "OPERAÇÃO", permissionKey: "agenda" as keyof Permissions },
    
    { id: "tecnicos", label: "Técnicos", icon: UserCheck, category: "CADASTROS", permissionKey: "configuracoes" as keyof Permissions },
    { id: "veiculos", label: "Veículos", icon: Tractor, category: "CADASTROS", permissionKey: "configuracoes" as keyof Permissions },
    { id: "tipos_atendimento", label: "Tipos de Atendimento", icon: Settings, category: "CADASTROS", permissionKey: "configuracoes" as keyof Permissions },
    
    { id: "comissoes", label: "Faturamento & Comissões", icon: DollarSign, category: "GESTÃO", permissionKey: "financeiro" as keyof Permissions },
    { id: "relatorios", label: "Relatórios & Indicadores", icon: FileBarChart2, category: "GESTÃO", permissionKey: "financeiro" as keyof Permissions },
    
    { id: "usuarios", label: "Usuários", icon: Users, category: "ADMINISTRAÇÃO", permissionKey: "configuracoes" as keyof Permissions },
    { id: "empresa", label: "Empresa", icon: Settings, category: "ADMINISTRAÇÃO", permissionKey: "configuracoes" as keyof Permissions },
    { id: "layout", label: "Layout", icon: Settings, category: "ADMINISTRAÇÃO", permissionKey: "configuracoes" as keyof Permissions },
    { id: "config_agenda", label: "Agenda (Config)", icon: Calendar, category: "ADMINISTRAÇÃO", permissionKey: "configuracoes" as keyof Permissions },
    { id: "comissoes_config", label: "Comissões (Config)", icon: DollarSign, category: "ADMINISTRAÇÃO", permissionKey: "configuracoes" as keyof Permissions },
    { id: "integracoes", label: "Integrações", icon: Database, category: "ADMINISTRAÇÃO", permissionKey: "configuracoes" as keyof Permissions },
    { id: "backup", label: "Backup", icon: RefreshCw, category: "ADMINISTRAÇÃO", permissionKey: "configuracoes" as keyof Permissions },
    { id: "logs", label: "Logs", icon: Settings, category: "ADMINISTRAÇÃO", permissionKey: "configuracoes" as keyof Permissions },
    { id: "planos", label: "Planos de Manutenção", icon: ClipboardList, category: "CADASTROS", permissionKey: "configuracoes" as keyof Permissions },
    { id: "sobre", label: "Sobre", icon: HelpCircle, category: "ADMINISTRAÇÃO", permissionKey: "dashboard" as keyof Permissions }
  ];

  const menuItems = allMenuItems.filter(item => {
    if (!currentUser) return false;
    const perm = currentUser.permissoes[item.permissionKey];
    return perm && perm.consultar;
  });

  // Group menu items by category
  const categories = ["OPERAÇÃO", "CADASTROS", "GESTÃO", "ADMINISTRAÇÃO"];

  // Search through clients & work orders
  const searchResults = searchQuery.trim() === "" ? [] : [
    ...clientes.filter(c => 
      c.razao_social.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.codigo_sankhya && c.codigo_sankhya.includes(searchQuery))
    ).map(c => ({ type: "CLIENTE", id: c.id, title: c.razao_social, sub: `Cod: ${c.codigo_sankhya || "—"} • ${c.cidade}/${c.uf}`, action: () => { handleNavigateWithTarget("clientes"); setSearchModalOpen(false); } })),
    ...ordens.filter(o => 
      o.numero_os.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.clientes && o.clientes.razao_social.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.implementos && o.implementos.modelo.toLowerCase().includes(searchQuery.toLowerCase()))
    ).map(o => ({ type: "O.S.", id: o.id, title: o.numero_os, sub: `${o.clientes?.razao_social} • ${o.implementos?.modelo || "Equipamento"}`, action: () => { handleNavigateWithTarget("os", o.id); setSearchModalOpen(false); } }))
  ].slice(0, 8);


  if (!currentUser) return <LoginView onLogin={setCurrentUser} />;
  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-brand-ink antialiased">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white font-bold px-6 py-3 rounded-lg shadow-xl text-xs flex items-center gap-2 border border-rose-500/20"
          >
            <ShieldAlert className="w-4 h-4 text-white" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Quick Search Modal (Ctrl+K) */}
      <AnimatePresence>
        {searchModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-[10vh] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar clientes, ordens de serviço, técnicos..."
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-sm outline-hidden text-gray-800 placeholder-gray-400 font-medium"
                />
                <button 
                  onClick={() => setSearchModalOpen(false)}
                  className="p-1 rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2 max-h-[350px] overflow-y-auto">
                {searchQuery.trim() === "" ? (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    <p className="font-bold uppercase tracking-wider mb-1 text-gray-300">Painel de Busca Inteligente</p>
                    <p className="text-[10px]">Digite o nome de um cliente, número da O.S. ou modelo da máquina.</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    <p className="font-bold uppercase tracking-wider text-gray-300">Nenhum resultado encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {searchResults.map((res, idx) => (
                      <button
                        key={idx}
                        onClick={res.action}
                        className="w-full p-3 rounded-lg flex items-center justify-between text-left hover:bg-rose-50/35 transition-colors border border-transparent hover:border-brand-red/10 group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                              res.type === "CLIENTE" 
                                ? "bg-sky-50 text-sky-800 border-sky-100" 
                                : "bg-emerald-50 text-emerald-800 border-emerald-100"
                            }`}>
                              {res.type}
                            </span>
                            <span className="text-xs font-bold text-gray-800 group-hover:text-brand-red">{res.title}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 block font-medium">{res.sub}</span>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-red" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                <span>Atalhos rápidos</span>
                <span>Pressione ESC para fechar</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Responsive Sidebar */}
      <aside 
        style={{ backgroundColor: sidebarBgColor }}
        className={`fixed inset-y-0 left-0 z-40 text-gray-300 flex flex-col transform transition-all duration-300 ease-in-out md:translate-x-0 md:static border-r border-[#1a1c22] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarCollapsed ? "w-20" : "w-64"}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#1c1f26] bg-[#0d0f12]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="bg-brand-red p-2 rounded-lg text-white flex items-center justify-center shadow-lg shadow-brand-red/10 shrink-0">
              <Tractor className="w-4 h-4" />
            </div>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
                <h1 className="font-display font-extrabold text-xs uppercase tracking-wider text-white leading-none">
                  Gestão de Serviços
                </h1>
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mt-0.5">PÓS-VENDA ENTERPRISE</span>
              </motion.div>
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Navigation grouped by Categories */}
        <nav className="flex-1 py-4 space-y-5 overflow-y-auto px-3 scrollbar-none">
          {categories.map((cat) => {
            const items = menuItems.filter(item => item.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="space-y-1">
                {!sidebarCollapsed ? (
                  <p className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{cat}</p>
                ) : (
                  <div className="h-0.5 bg-[#1c1f26] mx-3 my-2" />
                )}
                
                {items.map((item) => {
                  const Icon = item.icon;
                  // Tab matches if activeTab.view is item.id and activeTabId is not detailed view
                  const isActive = activeTab.view === item.id && !activeTabId.startsWith("os_edit_");
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigateWithTarget(item.id)}
                      className={`w-full flex items-center rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-150 py-2.5 px-3 group relative ${
                        sidebarCollapsed ? "justify-center" : "gap-3"
                      } ${
                        isActive 
                          ? "bg-brand-red text-white font-extrabold shadow-md shadow-brand-red/15" 
                          : "text-gray-400 hover:text-white hover:bg-gray-800/40"
                      }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-105 ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`} />
                      {!sidebarCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {isActive && sidebarCollapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-md" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Collapse button bottom */}
        <div className="p-3 border-t border-[#1c1f26] bg-[#0d0f12]/50">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/40 text-[10px] font-bold uppercase tracking-wider gap-2"
          >
            <Menu className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Recolher Menu</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Main top header (Sophisticated Dark Navbar) */}
        <header className="h-16 bg-[#111317] border-b border-[#1c1f26] flex items-center justify-between px-6 z-10 shrink-0 select-none">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-gray-400 hover:bg-gray-800 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Search trigger box (Ctrl+K) */}
            <div 
              onClick={() => setSearchModalOpen(true)}
              className="hidden md:flex items-center gap-2.5 bg-[#181b21] hover:bg-[#1f232b] border border-[#242933] hover:border-gray-700/80 rounded-lg px-3 py-1.5 w-64 text-gray-400 cursor-pointer transition-all shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium grow select-none">Buscar no sistema...</span>
              <span className="text-[9px] font-bold bg-[#282d38] px-1.5 py-0.5 rounded text-gray-400 font-mono tracking-wider">Ctrl+K</span>
            </div>
            
            {/* Real-time date display */}
            <div className="hidden lg:flex items-center gap-2 text-gray-400 text-[11px] font-bold uppercase tracking-wider pl-4 border-l border-[#1c1f26]">
              <Calendar className="w-3.5 h-3.5 text-brand-red" />
              <span>{formatBrazilianDate(currentTime)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Sync manual db button */}
            <button
              onClick={fetchAllData}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#181b21] rounded-lg border border-[#242933] flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
              title="Sincronizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-brand-red ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>


            {/* Administrator Profile Card */}
            <div className="flex items-center gap-3 pl-4 border-l border-[#1c1f26]">
              <div className="hidden sm:block text-right">
                <span className="text-xs font-extrabold text-white block">{currentUser?.nome || "Usuário"}</span>
                <button 
                  onClick={() => { localStorage.removeItem("gst_current_active_user"); setCurrentUser(null); }}
                  className="text-[9px] text-brand-red font-bold uppercase tracking-wide hover:underline"
                >
                  Logout
                </button>
              </div>
              <img 
                src={currentUser?.foto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"} 
                alt="Profile Avatar"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border-2 border-brand-red shadow-md"
              />
            </div>
          </div>
        </header>

        {/* Browser-style Tab Workspace Bar */}
        <div className="bg-white border-b border-gray-200/80 h-11 flex items-center justify-between px-4 z-5 shrink-0 select-none overflow-x-auto scrollbar-none gap-4">
          <div className="flex items-end h-full gap-1 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const isOS = tab.id.startsWith("os_edit_");
              
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`h-9 flex items-center gap-2 px-3.5 rounded-t-lg text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer shrink-0 relative top-[1px] ${
                    isActive 
                      ? "bg-white border-gray-200 border-b-white text-brand-red font-black" 
                      : "bg-gray-100/50 border-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {isOS && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
                  )}
                  <span>{tab.label}</span>
                  {tab.closable && (
                    <button
                      onClick={(e) => closeTab(tab.id, e)}
                      className="p-0.5 rounded-full hover:bg-gray-200 hover:text-gray-700 text-gray-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active View Container */}
        <main className="flex-1 overflow-y-auto p-5 md:p-6 bg-[#f8fafc]">
          {isLoading && ordens.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-8 h-8 text-brand-red animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Carregando dados pós-venda...</span>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTabId}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.12 }}
                  className="h-full"
                >
                  {activeTab.view === "dashboard" && (
                    <DashboardView 
                      ordens={ordens}
                      clientes={clientes}
                      implementos={implementos}
                      tecnicos={tecnicos}
                      onNavigate={handleNavigateWithTarget}
                    />
                  )}

                  {activeTab.view === "os" && (
                    <OrdensServicoView 
                      key={activeTab.id} // separate key for each tab instance!
                      ordens={ordens}
                      clientes={clientes}
                      implementos={implementos}
                      tecnicos={tecnicos}
                      onRefresh={fetchAllData}
                      preSelectedOSId={activeTab.params?.osId !== undefined ? activeTab.params.osId : null}
                      onClearPreSelectedOS={() => {
                        // Safe clear
                      }}
                    />
                  )}

                  {activeTab.view === "agenda" && (
                    <AgendaView 
                      ordens={ordens}
                      tecnicos={tecnicos}
                      onNavigate={handleNavigateWithTarget}
                    />
                  )}

                  {activeTab.view === "clientes" && (
                    <ClientesView 
                      clientes={clientes} 
                      implementos={implementos}
                      ordens={ordens}
                      onRefresh={fetchAllData} 
                    />
                  )}

                  {activeTab.view === "implementos" && (
                    <ImplementosView 
                      implementos={implementos} 
                      clientes={clientes}
                      ordens={ordens}
                      onRefresh={fetchAllData} 
                    />
                  )}

                  {activeTab.view === "tecnicos" && (
                    <TecnicosView 
                      tecnicos={tecnicos} 
                      onRefresh={fetchAllData} 
                    />
                  )}

                  {activeTab.view === "planos" && (
                    <PlanosView onNavigate={handleNavigateWithTarget} />
                  )}
                  {activeTab.view === "veiculos" && <VeiculosView />}
                  {activeTab.view === "tipos_atendimento" && <TiposAtendimentoView />}
                  {activeTab.view === "empresa" && <EmpresaView />}
                  {activeTab.view === "layout" && <LayoutView />}
                  {activeTab.view === "config_agenda" && <ConfigAgendaView />}
                  {activeTab.view === "comissoes_config" && <ComissoesConfigView onNavigate={handleNavigateWithTarget} />}
                  {activeTab.view === "integracoes" && <IntegracoesView onRefresh={fetchAllData} />}
                  {activeTab.view === "backup" && <BackupView />}
                  {activeTab.view === "logs" && <LogsView />}
                  {activeTab.view === "sobre" && <SobreView />}

                  {activeTab.view === "relatorios" && (
                    <RelatoriosView 
                      ordens={ordens}
                      tecnicos={tecnicos}
                      clientes={clientes}
                      implementos={implementos}
                    />
                  )}

                  {activeTab.view === "comissoes" && (
                    <ComissoesView 
                      ordens={ordens}
                      tecnicos={tecnicos}
                      onRefresh={fetchAllData}
                    />
                  )}

                  {activeTab.view === "usuarios" && (
                    <UsuariosView />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Mobile backdrop shadow overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-35 md:hidden"
        />
      )}
    </div>
  );
}
