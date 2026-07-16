import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  UserCheck, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  X,
  Camera,
  Save
} from "lucide-react";

export interface Permission {
  consultar: boolean;
  editar: boolean;
  excluir: boolean;
}

export interface Permissions {
  dashboard: Permission;
  clientes: Permission;
  implementos: Permission;
  os: Permission;
  agenda: Permission;
  financeiro: Permission;
  configuracoes: Permission;
}

export interface Usuario {
  id: string;
  nome: string;
  usuario: string;
  email: string;
  perfil: "ADMINISTRADOR" | "GERENTE" | "FATURISTA" | "TECNICO";
  ativo: boolean;
  permissoes: Permissions;
  ultimo_acesso?: string;
  foto?: string;
  senha: string;
}

const DEFAULT_PERMISSIONS: Permissions = {
  dashboard: { consultar: true, editar: false, excluir: false },
  clientes: { consultar: true, editar: true, excluir: false },
  implementos: { consultar: true, editar: true, excluir: false },
  os: { consultar: true, editar: true, excluir: false },
  agenda: { consultar: true, editar: true, excluir: false },
  financeiro: { consultar: true, editar: false, excluir: false },
  configuracoes: { consultar: false, editar: false, excluir: false }
};

export const PRESET_USUARIOS: Usuario[] = [
  {
    id: "usr_1",
    nome: "Administrador (Padrão)",
    usuario: "admin",
    email: "admin@oficina.com.br",
    perfil: "ADMINISTRADOR",
    ativo: true,
    senha: "admin",
    permissoes: {
      dashboard: { consultar: true, editar: true, excluir: true },
      clientes: { consultar: true, editar: true, excluir: true },
      implementos: { consultar: true, editar: true, excluir: true },
      os: { consultar: true, editar: true, excluir: true },
      agenda: { consultar: true, editar: true, excluir: true },
      financeiro: { consultar: true, editar: true, excluir: true },
      configuracoes: { consultar: true, editar: true, excluir: true }
    },
    ultimo_acesso: "Hoje, 10:35"
  },
  {
    id: "usr_2",
    nome: "Amanda Costa",
    usuario: "amanda.faturamento",
    email: "faturamento@oficina.com.br",
    perfil: "FATURISTA",
    ativo: true,
    senha: "123",
    permissoes: {
      ...DEFAULT_PERMISSIONS,
      os: { consultar: true, editar: true, excluir: false },
      financeiro: { consultar: true, editar: true, excluir: false }
    },
    ultimo_acesso: "Ontem, 16:40"
  },
  {
    id: "usr_3",
    nome: "Marcos Souza (Mecânico Líder)",
    usuario: "marcos.mecanico",
    email: "marcos.campo@oficina.com.br",
    perfil: "TECNICO",
    ativo: true,
    senha: "123",
    permissoes: {
      ...DEFAULT_PERMISSIONS,
      os: { consultar: true, editar: true, excluir: false }
    },
    ultimo_acesso: "Hoje, 07:15"
  }
];

export const UsuariosView: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<Usuario["perfil"]>("FATURISTA");
  const [ativo, setAtivo] = useState(true);
  const [permissoes, setPermissoes] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [foto, setFoto] = useState("");
  const [senha, setSenha] = useState("");

  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("gst_usuarios_v1");
    if (stored) {
      try {
        let parsed = JSON.parse(stored);
        
        // Migration: check if first user has 'permissoes' property
        if (parsed.length > 0 && !parsed[0].permissoes) {
          parsed = parsed.map((u: any) => ({
            ...u,
            permissoes: {
              ...DEFAULT_PERMISSIONS,
              os: { consultar: u.perm_criar_os, editar: u.perm_criar_os, excluir: false },
              financeiro: { consultar: u.perm_financeiro, editar: u.perm_financeiro, excluir: false },
              configuracoes: { consultar: u.perm_configuracoes, editar: u.perm_configuracoes, excluir: false }
            }
          }));
          localStorage.setItem("gst_usuarios_v1", JSON.stringify(parsed));
        }
        
        // Guarantee default admin user exists
        const hasAdmin = parsed.some((u: any) => u.usuario === "admin");
        if (!hasAdmin) {
          parsed.unshift(PRESET_USUARIOS[0]);
          localStorage.setItem("gst_usuarios_v1", JSON.stringify(parsed));
        }
        
        setUsuarios(parsed);
      } catch (e) {
        setUsuarios(PRESET_USUARIOS);
      }
    } else {
      setUsuarios(PRESET_USUARIOS);
      localStorage.setItem("gst_usuarios_v1", JSON.stringify(PRESET_USUARIOS));
    }

    // Set active simulation session
    const activeUsr = localStorage.getItem("gst_current_active_user");
    if (activeUsr) {
      try {
        let parsed = JSON.parse(activeUsr);
        if (!parsed.permissoes) {
          parsed = {
            ...parsed,
            permissoes: {
              ...DEFAULT_PERMISSIONS,
              os: { consultar: parsed.perm_criar_os, editar: parsed.perm_criar_os, excluir: false },
              financeiro: { consultar: parsed.perm_financeiro, editar: parsed.perm_financeiro, excluir: false },
              configuracoes: { consultar: parsed.perm_configuracoes, editar: parsed.perm_configuracoes, excluir: false }
            }
          };
          localStorage.setItem("gst_current_active_user", JSON.stringify(parsed));
        }
        setCurrentUser(parsed);
      } catch (e) {
        setCurrentUser(PRESET_USUARIOS[0]);
      }
    } else {
      setCurrentUser(PRESET_USUARIOS[0]);
      localStorage.setItem("gst_current_active_user", JSON.stringify(PRESET_USUARIOS[0]));
    }
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSwitchSession = (usr: Usuario) => {
    setCurrentUser(usr);
    localStorage.setItem("gst_current_active_user", JSON.stringify(usr));
    showToast(`Sessão alterada para: ${usr.nome} (${usr.perfil})`, "success");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !usuario.trim() || !email.trim()) {
      showToast("Por favor, preencha todos os campos obrigatórios.", "error");
      return;
    }

    let updatedList = [...usuarios];

    if (editingId) {
      updatedList = updatedList.map(u => {
        if (u.id === editingId) {
          return {
            ...u,
            nome,
            usuario: usuario.toLowerCase().replace(/\s+/g, ""),
            email,
            perfil,
            ativo,
            permissoes,
            foto,
            senha: senha || u.senha
          };
        }
        return u;
      });
      showToast("Usuário atualizado com sucesso!");
    } else {
      const newUsr: Usuario = {
        id: "usr_" + Date.now(),
        nome,
        usuario: usuario.toLowerCase().replace(/\s+/g, ""),
        email,
        perfil,
        ativo,
        permissoes,
        ultimo_acesso: "Nunca",
        foto,
        senha
      };
      updatedList.push(newUsr);
      showToast("Novo operador cadastrado!");
    }

    setUsuarios(updatedList);
    localStorage.setItem("gst_usuarios_v1", JSON.stringify(updatedList));
    
    if (editingId && currentUser?.id === editingId) {
      const updatedUser = updatedList.find(u => u.id === editingId);
      if (updatedUser) {
        setCurrentUser(updatedUser);
        localStorage.setItem("gst_current_active_user", JSON.stringify(updatedUser));
      }
    }

    closeForm();
  };

  const openForm = (usr?: Usuario) => {
    if (usr) {
      setEditingId(usr.id);
      setNome(usr.nome);
      setUsuario(usr.usuario);
      setEmail(usr.email);
      setPerfil(usr.perfil);
      setAtivo(usr.ativo);
      setPermissoes(usr.permissoes);
      setFoto(usr.foto || "");
      setSenha("");
    } else {
      setEditingId(null);
      setNome("");
      setUsuario("");
      setEmail("");
      setPerfil("FATURISTA");
      setAtivo(true);
      setPermissoes(DEFAULT_PERMISSIONS);
      setFoto("");
      setSenha("");
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      showToast("Você não pode deletar o usuário que está ativo na sua sessão simulada atual.", "error");
      return;
    }
    if (window.confirm("Deseja realmente remover este operador do sistema?")) {
      const filtered = usuarios.filter(u => u.id !== id);
      setUsuarios(filtered);
      localStorage.setItem("gst_usuarios_v1", JSON.stringify(filtered));
      showToast("Operador removido com sucesso!");
    }
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.perfil.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl font-bold text-xs flex items-center gap-2 animate-fade ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">
            Usuários e Operadores
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gerenciamento de operadores e permissões de acesso ao sistema.
          </p>
        </div>
        <button
            onClick={() => openForm()}
            className="btn bg-brand-red hover:bg-brand-red-dark text-white shadow-md flex items-center gap-2 text-xs font-bold self-start md:self-auto animate-fade"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Operador
          </button>
      </div>

      {/* Access Simulator Widget */}
      <div className="bg-brand-ink text-white rounded-xl p-5 border border-gray-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-600/10 text-brand-red rounded-lg border border-brand-red/30">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Simulador de Sessão Ativa</span>
              <span className="bg-rose-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase">Ativo</span>
            </div>
            <h3 className="font-display text-base font-extrabold uppercase mt-0.5">
              Usuário Logado: <span className="text-brand-red">{currentUser?.nome}</span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Nível: <strong className="text-white font-mono">{currentUser?.perfil}</strong> | 
              Faturamento: <strong className={currentUser?.perm_faturar ? "text-emerald-400" : "text-rose-400"}>{currentUser?.perm_faturar ? "SIM" : "NÃO"}</strong> | 
              Emitir O.S.: <strong className={currentUser?.perm_criar_os ? "text-emerald-400" : "text-rose-400"}>{currentUser?.perm_criar_os ? "SIM" : "NÃO"}</strong>
            </p>
          </div>
        </div>

        {/* Quick Switch Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alternar Operador:</span>
          <select
            value={currentUser?.id || ""}
            onChange={(e) => {
              const selected = usuarios.find(u => u.id === e.target.value);
              if (selected) handleSwitchSession(selected);
            }}
            className="bg-gray-800 border border-gray-700 rounded-lg py-1 px-3 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-red"
          >
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nome} ({u.perfil})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: User List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Search header bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar operador ou perfil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-1.5 text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
            />
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Total Cadastrado: <strong className="text-gray-700">{usuarios.length}</strong>
          </span>
        </div>

        {/* User cards list */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUsuarios.map((usr) => {
              const isSimulatedActive = usr.id === currentUser?.id;
              return (
                <div 
                  key={usr.id} 
                  className={`border rounded-xl p-5 space-y-4 transition-all relative ${
                    isSimulatedActive 
                      ? "border-brand-red bg-rose-50/5 shadow-md" 
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  {isSimulatedActive && (
                    <span className="absolute top-4 right-4 bg-rose-600 text-white text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                      <UserCheck className="w-2.5 h-2.5" /> ATIVO AGORA
                    </span>
                  )}

                  {/* Profile info header */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center font-display text-lg text-gray-600 font-black uppercase overflow-hidden shrink-0">
                      {usr.foto ? (
                        <img src={usr.foto} alt={usr.nome} className="w-full h-full object-cover" />
                      ) : (
                        usr.nome.substring(0, 2)
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm leading-tight flex items-center gap-1.5">
                        {usr.nome}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono">@{usr.usuario}</p>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-gray-600 font-medium">
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-bold uppercase text-[9px]">E-mail:</span>
                      <span className="truncate max-w-[150px]" title={usr.email}>{usr.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-bold uppercase text-[9px]">Função:</span>
                      <span className="font-mono text-[10px] font-bold text-brand-red">{usr.perfil}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-bold uppercase text-[9px]">Último Acesso:</span>
                      <span>{usr.ultimo_acesso || "Nunca"}</span>
                    </div>
                  </div>

                  {/* Permissions matrix visual summary */}
                  <div className="bg-gray-50 border border-gray-150 rounded-lg p-3 space-y-1.5">
                    <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block">Permissões</span>
                    <div className="grid grid-cols-2 gap-y-1 text-[10px]">
                      {Object.entries(usr.permissoes as Permissions).map(([module, p]) => (
                        <div key={module} className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${p.consultar ? "bg-emerald-500" : "bg-gray-300"}`} />
                          <span className={p.consultar ? "text-gray-700 font-bold" : "text-gray-400 font-medium"}>
                            {module.charAt(0).toUpperCase() + module.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => openForm(usr)}
                      className="text-xs font-semibold text-gray-600 hover:text-brand-ink px-2 py-1 rounded"
                    >
                      Editar
                    </button>
                    {!isSimulatedActive && (
                      <button
                        type="button"
                        onClick={() => handleDelete(usr.id)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CRUD Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-extrabold uppercase text-gray-800">
                    {editingId ? "Editar Operador" : "Novo Operador"}
                  </h2>
                  <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X /></button>
                </div>
                
                {/* Photo Upload */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 relative group">
                    {foto ? (
                      <img src={foto} className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-gray-400" />
                    )}
                    <input 
                      type="file" accept="image/*" 
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { const reader = new FileReader(); reader.onloadend = () => setFoto(reader.result as string); reader.readAsDataURL(f); }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Alterar Foto</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} className="col-span-2 border rounded-lg p-2 text-sm" />
                  <input type="text" placeholder="Usuário" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="border rounded-lg p-2 text-sm" />
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="border rounded-lg p-2 text-sm" />
                  <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} className="col-span-2 border rounded-lg p-2 text-sm" />
                  <select value={perfil} onChange={(e) => setPerfil(e.target.value as any)} className="col-span-2 border rounded-lg p-2 text-sm">
                    {["ADMINISTRADOR", "GERENTE", "FATURISTA", "TECNICO"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                
                {/* Permissions Matrix */}
                <div className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-bold text-sm text-gray-700">Permissões por Módulo</h3>
                  <div className="grid grid-cols-4 text-[10px] font-bold text-gray-400 uppercase gap-2 mb-2">
                    <div>Módulo</div>
                    <div className="text-center">Consultar</div>
                    <div className="text-center">Editar</div>
                    <div className="text-center">Excluir</div>
                  </div>
                  {(Object.entries(permissoes) as [keyof Permissions, Permission][]).map(([module, p]) => (
                    <div key={module} className="grid grid-cols-4 gap-2 items-center text-xs">
                      <div className="font-bold text-gray-700">{module.charAt(0).toUpperCase() + module.slice(1)}</div>
                      <input type="checkbox" checked={p.consultar} onChange={(e) => setPermissoes({...permissoes, [module]: {...p, consultar: e.target.checked}})} className="mx-auto" />
                      <input type="checkbox" checked={p.editar} onChange={(e) => setPermissoes({...permissoes, [module]: {...p, editar: e.target.checked}})} className="mx-auto" />
                      <input type="checkbox" checked={p.excluir} onChange={(e) => setPermissoes({...permissoes, [module]: {...p, excluir: e.target.checked}})} className="mx-auto" />
                    </div>
                  ))}
                </div>
                
                <button type="submit" className="w-full bg-brand-red text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Salvar Operador
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
