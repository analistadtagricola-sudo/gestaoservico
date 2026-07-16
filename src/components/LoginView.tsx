import React, { useState } from "react";
import { User, Lock, ArrowRight } from "lucide-react";
import { PRESET_USUARIOS } from "./UsuariosView";

interface LoginViewProps {
  onLogin: (user: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let storedUsuarios = localStorage.getItem("gst_usuarios_v1");
    if (!storedUsuarios) {
      localStorage.setItem("gst_usuarios_v1", JSON.stringify(PRESET_USUARIOS));
      storedUsuarios = JSON.stringify(PRESET_USUARIOS);
    }
    
    let usuarios = JSON.parse(storedUsuarios);
    
    // Guarantee default admin exists in the loaded array
    const hasAdmin = usuarios.some((u: any) => u.usuario === "admin");
    if (!hasAdmin) {
      usuarios.unshift(PRESET_USUARIOS[0]);
      localStorage.setItem("gst_usuarios_v1", JSON.stringify(usuarios));
    }

    const user = usuarios.find((u: any) => 
      u.usuario.toLowerCase() === usuario.toLowerCase().trim() && 
      u.senha === senha && 
      u.ativo
    );
    
    if (user) {
      localStorage.setItem("gst_current_active_user", JSON.stringify(user));
      onLogin(user);
    } else {
      setError("Usuário ou senha incorretos ou usuário inativo.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="font-display text-2xl font-black text-brand-red uppercase text-center mb-6">Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" placeholder="Usuário" value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full border rounded-lg pl-10 pr-3 py-2 text-sm font-bold"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="password" placeholder="Senha" value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full border rounded-lg pl-10 pr-3 py-2 text-sm font-bold"
            />
          </div>
          {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
          <button type="submit" className="w-full bg-brand-red text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2">
            Entrar <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
