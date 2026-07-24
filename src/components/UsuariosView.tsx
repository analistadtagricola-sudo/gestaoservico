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
import { API } from "../lib/api";

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
  tecnicos: Permission;
  tipos_atendimento: Permission;
  comissoes: Permission;
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
  limite_telas?: number;
}

const DEFAULT_PERMISSIONS: Permissions = {
  dashboard: { consultar: true, editar: false, excluir: false },
  clientes: { consultar: true, editar: true, excluir: false },
  implementos: { consultar: true, editar: true, excluir: false },
  os: { consultar: true, editar: true, excluir: false },
  agenda: { consultar: true, editar: true, excluir: false },
  financeiro: { consultar: true, editar: false, excluir: false },
  configuracoes: { consultar: false, editar: false, excluir: false },
  tecnicos: { consultar: true, editar: true, excluir: false },
  tipos_atendimento: { consultar: true, editar: true, excluir: false },
  comissoes: { consultar: true, editar: true, excluir: false }
};

export const PRESET_USUARIOS: Usuario[] = [
  {
    id: "usr_1",
    nome: "Administrador (Padrão)",
    usuario: "admin",
    email: "admin@oficina.com.br",
    perfil: "ADMINISTRADOR",
    ativo: true,
    senha: "142536",
    permissoes: {
      dashboard: { consultar: true, editar: true, excluir: true },
      clientes: { consultar: true, editar: true, excluir: true },
      implementos: { consultar: true, editar: true, excluir: true },
      os: { consultar: true, editar: true, excluir: true },
      agenda: { consultar: true, editar: true, excluir: true },
      financeiro: { consultar: true, editar: true, excluir: true },
      configuracoes: { consultar: true, editar: true, excluir: true },
      tecnicos: { consultar: true, editar: true, excluir: true },
      tipos_atendimento: { consultar: true, editar: true, excluir: true },
      comissoes: { consultar: true, editar: true, excluir: true }
    },
    ultimo_acesso: "Hoje, 10:35"
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
  const [limiteTelas, setLimiteTelas] = useState<number>(0);

  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadUsuarios = async () => {
    try {
      const data = await API.usuarios.listar();
      const migrated = data.map(u => ({
        ...u,
        permissoes: {
          ...DEFAULT_PERMISSIONS,
          ...(u.permissoes || {})
        }
      }));
      setUsuarios(migrated);
      
      const activeUsr = localStorage.getItem("gst_current_active_user");
      if (activeUsr) {
        try {
          const parsed = JSON.parse(activeUsr);
          const current = data.find(u => u.id === parsed.id) || parsed;
          setCurrentUser(current);
        } catch (e) {
          if (data.length > 0) setCurrentUser(data[0]);
        }
      } else if (data.length > 0) {
        setCurrentUser(data[0]);
        localStorage.setItem("gst_current_active_user", JSON.stringify(data[0]));
      }
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  useEffect(() => {
    loadUsuarios();
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !usuario.trim() || !email.trim()) {
      showToast("Por favor, preencha todos os campos obrigatórios.", "error");
      return;
    }

    try {
      if (editingId) {
        const existing = usuarios.find(u => u.id === editingId);
        const updatedUser: Usuario = {
          id: editingId,
          nome,
          usuario: usuario.toLowerCase().replace(/\s+/g, ""),
          email,
          perfil,
          ativo,
          permissoes,
          ultimo_acesso: existing?.ultimo_acesso && existing.ultimo_acesso !== "Nunca" ? existing.ultimo_acesso : "Hoje, 10:30",
          foto,
          senha: senha || (existing ? existing.senha : ""),
          limite_telas: limiteTelas
        };
        await API.usuarios.atualizar(editingId, updatedUser);
        showToast("Usuário atualizado com sucesso!");
        
        if (currentUser?.id === editingId) {
          setCurrentUser(updatedUser);
          localStorage.setItem("gst_current_active_user", JSON.stringify(updatedUser));
        }
      } else {
        const newUsr: Usuario = {
          id: "usr_" + Date.now(),
          nome,
          usuario: usuario.toLowerCase().replace(/\s+/g, ""),
          email,
          perfil,
          ativo,
          permissoes,
          ultimo_acesso: "Hoje, 10:45",
          foto,
          senha,
          limite_telas: limiteTelas
        };
        await API.usuarios.inserir(newUsr);
        showToast("Novo operador cadastrado!");
      }
      await loadUsuarios();
      closeForm();
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar operador", "error");
    }
  };

  const openForm = (usr?: Usuario) => {
    if (usr) {
      setEditingId(usr.id);
      setNome(usr.nome);
      setUsuario(usr.usuario);
      setEmail(usr.email);
      setPerfil(usr.perfil);
      setAtivo(usr.ativo);
      setPermissoes({
        ...DEFAULT_PERMISSIONS,
        ...(usr.permissoes || {}),
        tecnicos: (usr.permissoes && usr.permissoes.tecnicos) ? usr.permissoes.tecnicos : DEFAULT_PERMISSIONS.tecnicos,
        tipos_atendimento: (usr.permissoes && usr.permissoes.tipos_atendimento) ? usr.permissoes.tipos_atendimento : DEFAULT_PERMISSIONS.tipos_atendimento,
        comissoes: (usr.permissoes && usr.permissoes.comissoes) ? usr.permissoes.comissoes : DEFAULT_PERMISSIONS.comissoes,
      });
      setFoto(usr.foto || "");
      setSenha("");
      setLimiteTelas(usr.limite_telas ?? 0);
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
      setLimiteTelas(0);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      showToast("Você não pode deletar o usuário que está ativo na sua sessão simulada atual.", "error");
      return;
    }
    if (window.confirm("Deseja realmente remover este operador do sistema?")) {
      try {
        await API.usuarios.excluir(id);
        showToast("Operador removido com sucesso!");
        await loadUsuarios();
      } catch (err) {
        console.error(err);
        showToast("Erro ao remover operador", "error");
      }
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
            Total Cadastrado: <strong className="text-gray-700">{usuarios.filter((u, idx, self) => self.findIndex(t => t.id === u.id) === idx).length}</strong>
          </span>
        </div>

        {/* User Table Layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-200 text-[10px] font-black uppercase text-gray-400 tracking-wider select-none">
                <th className="px-6 py-4">Operador</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">E-mail</th>
                <th className="px-6 py-4">Função / Perfil</th>
                <th className="px-6 py-4 text-center">Lmt. Telas</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Último Acesso</th>
                <th className="px-6 py-4">Permissões (Módulos)</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(() => {
                const uniqueFilteredUsuarios = filteredUsuarios.filter((u, idx, self) => self.findIndex(t => t.id === u.id) === idx);
                if (uniqueFilteredUsuarios.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-xs font-semibold uppercase">
                        Nenhum operador encontrado
                      </td>
                    </tr>
                  );
                }
                return uniqueFilteredUsuarios.map((usr) => {
                  const isSimulatedActive = usr.id === currentUser?.id;
                  return (
                    <tr 
                      key={usr.id} 
                      className={`hover:bg-gray-50/50 transition-colors text-xs text-gray-700 font-medium ${
                        isSimulatedActive ? "bg-rose-50/20" : ""
                      }`}
                    >
                      {/* Name & Photo */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center font-display text-sm text-gray-600 font-black uppercase overflow-hidden shrink-0 border border-gray-200">
                            {usr.foto ? (
                              <img src={usr.foto} alt={usr.nome} className="w-full h-full object-cover" />
                            ) : (
                              usr.nome.substring(0, 2)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-1.5">
                              {usr.nome}
                              {isSimulatedActive && (
                                <span className="bg-rose-600 text-white text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5 shrink-0">
                                  <UserCheck className="w-2 h-2" /> ATIVO
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono font-bold uppercase">ID: {usr.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="px-6 py-4 font-mono text-gray-500 font-bold">
                        @{usr.usuario}
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-gray-600">
                        {usr.email}
                      </td>

                      {/* Profile Badge */}
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-[10px] font-extrabold font-mono tracking-wide bg-gray-100 text-gray-800">
                          {usr.perfil}
                        </span>
                      </td>

                      {/* Limit of screens */}
                      <td className="px-6 py-4 text-center font-bold">
                        {usr.limite_telas && usr.limite_telas > 0 ? (
                          <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md text-[10px] font-mono border border-amber-200">
                            {usr.limite_telas} telas
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px] font-mono">Ilimitado</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${
                          usr.ativo 
                            ? "bg-emerald-100 text-emerald-800" 
                            : "bg-gray-150 text-gray-500"
                        }`}>
                          {usr.ativo ? "ATIVO" : "INATIVO"}
                        </span>
                      </td>

                      {/* Last Access */}
                      <td className="px-6 py-4 text-gray-500">
                        {usr.ultimo_acesso || "Nunca"}
                      </td>

                      {/* Compact Permissions Dots */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {Object.entries(usr.permissoes || {}).map(([module, p]: [string, any]) => {
                            const initials = module.substring(0, 2).toUpperCase();
                            const hasAccess = p && p.consultar;
                            return (
                              <span 
                                key={module} 
                                title={`${module.toUpperCase()}: ${hasAccess ? 'Liberado' : 'Bloqueado'}`}
                                className={`text-[9px] font-black tracking-wider px-1 py-0.5 rounded-md ${
                                  hasAccess 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                    : "bg-gray-50 text-gray-400 border border-gray-100"
                                }`}
                              >
                                {initials}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openForm(usr)}
                            className="text-xs font-bold text-gray-600 hover:text-brand-ink hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                          >
                            Editar
                          </button>
                          {!isSimulatedActive && (
                            <button
                              type="button"
                              onClick={() => handleDelete(usr.id)}
                              className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
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
                  <div className="col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block">
                      Limite de Telas Abertas (0 para Ilimitado)
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="Ex: 5"
                      value={limiteTelas === 0 ? "" : limiteTelas} 
                      onChange={(e) => setLimiteTelas(Math.max(0, parseInt(e.target.value) || 0))} 
                      className="w-full border rounded-lg p-2 text-sm" 
                    />
                  </div>
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
                      <input type="checkbox" checked={p.consultar} onChange={(e) => setPermissoes(prev => ({...prev, [module]: {...prev[module], consultar: e.target.checked}}))} className="mx-auto" />
                      <input type="checkbox" checked={p.editar} onChange={(e) => setPermissoes(prev => ({...prev, [module]: {...prev[module], editar: e.target.checked}}))} className="mx-auto" />
                      <input type="checkbox" checked={p.excluir} onChange={(e) => setPermissoes(prev => ({...prev, [module]: {...prev[module], excluir: e.target.checked}}))} className="mx-auto" />
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
