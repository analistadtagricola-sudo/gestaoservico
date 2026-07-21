/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from "./supabase";
import { Cliente, Implemento, Tecnico, OrdemServico, Apontamento, PlanoManutencao, PlanoRevisao, Veiculo, TipoAtendimento, Usuario, Permissions } from "../types";

// Helper to handle API responses and fallbacks
const handleResponse = async <T>(promise: Promise<{ data: T | null; error: any }>, fallback: T): Promise<T> => {
  try {
    const { data, error } = await promise;
    if (error) {
      console.warn("Supabase API Warning:", error);
      return fallback;
    }
    return data ?? fallback;
  } catch (err) {
    console.error("Supabase Connection Error:", err);
    return fallback;
  }
};

const DEFAULT_PERMISSIONS_LOCAL: Permissions = {
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

const INITIAL_USUARIOS: Usuario[] = [
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
      ...DEFAULT_PERMISSIONS_LOCAL,
      os: { consultar: true, editar: true, excluir: false },
      financeiro: { consultar: true, editar: true, excluir: false },
      tecnicos: { consultar: true, editar: true, excluir: false },
      tipos_atendimento: { consultar: true, editar: true, excluir: false },
      comissoes: { consultar: true, editar: true, excluir: false }
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
      ...DEFAULT_PERMISSIONS_LOCAL,
      os: { consultar: true, editar: true, excluir: false },
      tecnicos: { consultar: true, editar: true, excluir: false },
      tipos_atendimento: { consultar: true, editar: true, excluir: false },
      comissoes: { consultar: true, editar: true, excluir: false }
    },
    ultimo_acesso: "Hoje, 07:15"
  }
];

// Initial local storage items for Veiculos and TiposAtendimento
const INITIAL_VEICULOS: Veiculo[] = [];

const INITIAL_TIPOS_ATENDIMENTO: TipoAtendimento[] = [
  { id: 1, nome: "ASSISTÊNCIA TÉCNICA", descricao: "Atendimento corretivo padrão em campo", ativo: true },
  { id: 2, nome: "GARANTIA", descricao: "Reparo sem custo sob cobertura de fábrica", ativo: true },
  { id: 3, nome: "REVISÃO PREVENTIVA", descricao: "Manutenção periódica preventiva programada", ativo: true },
  { id: 4, nome: "ENTREGA TÉCNICA", descricao: "Primeira montagem e instrução técnica ao cliente", ativo: true },
  { id: 5, nome: "MONTAGEM", descricao: "Montagem estrutural do implemento agrícola", ativo: true },
  { id: 6, nome: "TREINAMENTO", descricao: "Treinamento operacional para operadores do cliente", ativo: true },
  { id: 7, nome: "OUTRO", descricao: "Atendimentos diversos não categorizados", ativo: true }
];

// Initial local storage items for Planos and Revisões
const INITIAL_PLANOS: PlanoManutencao[] = [
  { id: "PM000001", fabricante: "JOHN DEERE", modelo: "8370R", garantia_meses: 24, horimetro_base: 50, ativo: true, observacao: "Plano padrão para tratores de grande porte", grupo: "TRATORES" },
  { id: "PM000002", fabricante: "CASE IH", modelo: "MAGNUM 340", garantia_meses: 12, horimetro_base: 100, ativo: true, observacao: "Plano básico de manutenção preventiva", grupo: "TRATORES" },
  { id: "PM000003", fabricante: "VALTRA", modelo: "BH 194", garantia_meses: 18, horimetro_base: 50, ativo: true, observacao: "Manutenções severas em lavoura", grupo: "TRATORES" }
];

const INITIAL_REVISOES: PlanoRevisao[] = [
  { id_revisao: "PR000001", id_plano: "PM000001", revisao_numero: 1, horas_limite: 50, meses_limite: 6, descricao: "Revisão de entrega técnica e lubrificação básica" },
  { id_revisao: "PR000002", id_plano: "PM000001", revisao_numero: 2, horas_limite: 250, meses_limite: 12, descricao: "Revisão geral, troca de filtros de óleo" },
  { id_revisao: "PR000003", id_plano: "PM000001", revisao_numero: 3, horas_limite: 500, meses_limite: 18, descricao: "Revisão do sistema hidráulico e transmissão" },
  { id_revisao: "PR000004", id_plano: "PM000002", revisao_numero: 1, horas_limite: 100, meses_limite: 6, descricao: "Primeira troca de óleos e verificação de torques" },
  { id_revisao: "PR000005", id_plano: "PM000002", revisao_numero: 2, horas_limite: 500, meses_limite: 12, descricao: "Revisão completa de filtros e bicos injetores" }
];

export const API = {
  clientes: {
    async listar(): Promise<Cliente[]> {
      try {
        const { data, error } = await supabase
          .from("clientes")
          .select("*")
          .order("razao_social");
        if (error) throw error;
        
        const saved = localStorage.getItem("gst_clientes");
        if (saved) {
          const localList: Cliente[] = JSON.parse(saved);
          const supabaseIds = new Set((data || []).map(c => c.id));
          const localOnly = localList.filter(c => !supabaseIds.has(c.id));
          const merged = [...(data || []), ...localOnly];
          localStorage.setItem("gst_clientes", JSON.stringify(merged));
          return merged.sort((a, b) => (a.razao_social || "").localeCompare(b.razao_social || ""));
        }
        localStorage.setItem("gst_clientes", JSON.stringify(data || []));
        return data || [];
      } catch (err) {
        console.warn("Falling back to simulated clients...");
        const saved = localStorage.getItem("gst_clientes");
        if (saved) return JSON.parse(saved);
        return [];
      }
    },

    async buscar(id: number): Promise<Cliente | null> {
      try {
        const { data, error } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        const list = await this.listar();
        return list.find(c => c.id === id) || null;
      }
    },

    async inserir(cliente: Cliente): Promise<Cliente> {
      try {
        const { data, error } = await supabase
          .from("clientes")
          .insert(cliente)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        const list = await this.listar();
        const nextId = list.reduce((max, c) => Math.max(max, c.id || 0), 0) + 1;
        const newCliente = { ...cliente, id: nextId, created_at: new Date().toISOString() };
        localStorage.setItem("gst_clientes", JSON.stringify([...list, newCliente]));
        return newCliente;
      }
    },

    async atualizar(id: number, cliente: Cliente): Promise<Cliente> {
      try {
        const { data, error } = await supabase
          .from("clientes")
          .update(cliente)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        const list = await this.listar();
        const updated = list.map(c => c.id === id ? { ...c, ...cliente, id } : c);
        localStorage.setItem("gst_clientes", JSON.stringify(updated));
        return { ...cliente, id };
      }
    },

    async excluir(id: number): Promise<boolean> {
      try {
        const { error } = await supabase
          .from("clientes")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return true;
      } catch (err) {
        const list = await this.listar();
        const filtered = list.filter(c => c.id !== id);
        localStorage.setItem("gst_clientes", JSON.stringify(filtered));
        return true;
      }
    },

    async buscarCodigo(codigo: string): Promise<Cliente | null> {
      try {
        const { data, error } = await supabase
          .from("clientes")
          .select("*")
          .eq("codigo_sankhya", codigo)
          .maybeSingle();
        if (error) throw error;
        return data;
      } catch (err) {
        const list = await this.listar();
        return list.find(c => c.codigo_sankhya === codigo) || null;
      }
    }
  },

  implementos: {
    async listar(): Promise<Implemento[]> {
      try {
        let rawData: any[] = [];
        let relationError = false;

        // Try to fetch with relation join first
        let query = supabase
          .from("implementos")
          .select(`
            *,
            clientes (
              id,
              razao_social,
              cidade,
              uf
            )
          `);
        
        // Use a safer ordering
        try {
          query = query.order("id", { ascending: false });
        } catch (e) {
          console.warn("Could not order by id, continuing...");
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === "PGRST200" || error.message?.includes("relationship") || error.message?.includes("foreign key")) {
            relationError = true;
          } else {
            throw error;
          }
        } else {
          rawData = data || [];
        }

        if (relationError) {
          // Fetch implementos separately
          const { data: impls, error: implsErr } = await supabase
            .from("implementos")
            .select("*")
            .order("id", { ascending: false });
          if (implsErr) throw implsErr;

          // Fetch all clients to map in-memory
          const { data: clis, error: clisErr } = await supabase
            .from("clientes")
            .select("id, razao_social, cidade, uf");
          
          const clisMap = new Map<number, any>();
          if (!clisErr && clis) {
            clis.forEach(c => clisMap.set(c.id, c));
          }

          rawData = (impls || []).map((impl: any) => ({
            ...impl,
            clientes: impl.cliente_id ? clisMap.get(impl.cliente_id) : undefined
          }));
        }

        // Merge plano_id from local mapping if it exists in case DB is missing the column
        const plansMapping = localStorage.getItem("gst_implemento_planos");
        const mapping = plansMapping ? JSON.parse(plansMapping) : {};
        const mergedWithPlans = rawData.map((impl: any) => ({
          ...impl,
          plano_id: impl.plano_id || mapping[impl.id] || ""
        }));

        const saved = localStorage.getItem("gst_implementos");
        if (saved) {
          const localList: Implemento[] = JSON.parse(saved);
          const supabaseIds = new Set(mergedWithPlans.map(i => i.id));
          const localOnly = localList.filter(i => !supabaseIds.has(i.id));
          const merged = [...mergedWithPlans, ...localOnly];
          localStorage.setItem("gst_implementos", JSON.stringify(merged));
          return merged;
        }
        localStorage.setItem("gst_implementos", JSON.stringify(mergedWithPlans));
        return mergedWithPlans;
      } catch (err) {
        console.warn("Falling back to simulated implementos...", err);
        const saved = localStorage.getItem("gst_implementos");
        if (saved) return JSON.parse(saved);
        return [];
      }
    },

    async buscar(id: number): Promise<Implemento | null> {
      try {
        let rawData: any = null;
        let relationError = false;

        const { data, error } = await supabase
          .from("implementos")
          .select(`
            *,
            clientes (
              id,
              razao_social,
              cidade,
              uf
            )
          `)
          .eq("id", id)
          .single();

        if (error) {
          if (error.code === "PGRST200" || error.message?.includes("relationship") || error.message?.includes("foreign key")) {
            relationError = true;
          } else {
            throw error;
          }
        } else {
          rawData = data;
        }

        if (relationError) {
          const { data: impl, error: implErr } = await supabase
            .from("implementos")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (implErr) throw implErr;
          if (!impl) return null;

          let clientData = undefined;
          if (impl.cliente_id) {
            const { data: cli } = await supabase
              .from("clientes")
              .select("id, razao_social, cidade, uf")
              .eq("id", impl.cliente_id)
              .maybeSingle();
            if (cli) {
              clientData = cli;
            }
          }

          rawData = {
            ...impl,
            clientes: clientData
          };
        }

        if (!rawData) return null;

        const plansMapping = localStorage.getItem("gst_implemento_planos");
        const mapping = plansMapping ? JSON.parse(plansMapping) : {};
        return {
          ...rawData,
          plano_id: rawData.plano_id || mapping[id] || ""
        };
      } catch (err) {
        const list = await this.listar();
        return list.find(i => i.id === id) || null;
      }
    },

    async inserir(implemento: Implemento): Promise<Implemento> {
      try {
        const { clientes, id, ...cleanPayload } = implemento;
        // Try inserting with the clean payload first
        const { data, error } = await supabase
          .from("implementos")
          .insert(cleanPayload)
          .select()
          .single();
        
        if (error) {
          // If database is missing the plano_id column, retry without it and save to local mapping
          if (error.message?.includes("plano_id") || error.code === "42703") {
            const { plano_id, ...dbPayload } = cleanPayload;
            const retryResult = await supabase
              .from("implementos")
              .insert(dbPayload)
              .select()
              .single();
            
            if (retryResult.error) throw retryResult.error;
            
            if (plano_id) {
              const plansMapping = localStorage.getItem("gst_implemento_planos");
              const mapping = plansMapping ? JSON.parse(plansMapping) : {};
              mapping[retryResult.data.id] = plano_id;
              localStorage.setItem("gst_implemento_planos", JSON.stringify(mapping));
            }
            return { ...retryResult.data, plano_id };
          }
          throw error;
        }

        // Also save to local mapping for consistency
        if (implemento.plano_id) {
          const plansMapping = localStorage.getItem("gst_implemento_planos");
          const mapping = plansMapping ? JSON.parse(plansMapping) : {};
          mapping[data.id] = implemento.plano_id;
          localStorage.setItem("gst_implemento_planos", JSON.stringify(mapping));
        }

        return data;
      } catch (err) {
        const list = await this.listar();
        const nextId = list.reduce((max, i) => Math.max(max, i.id || 0), 0) + 1;
        // Embed the client details
        const clients = await API.clientes.listar();
        const foundClient = clients.find(c => c.id === Number(implemento.cliente_id));
        const newImplemento: Implemento = { 
          ...implemento, 
          id: nextId,
          clientes: foundClient ? {
            id: foundClient.id!,
            razao_social: foundClient.razao_social,
            cidade: foundClient.cidade,
            uf: foundClient.uf
          } : undefined
        };
        localStorage.setItem("gst_implementos", JSON.stringify([...list, newImplemento]));
        
        if (implemento.plano_id) {
          const plansMapping = localStorage.getItem("gst_implemento_planos");
          const mapping = plansMapping ? JSON.parse(plansMapping) : {};
          mapping[nextId] = implemento.plano_id;
          localStorage.setItem("gst_implemento_planos", JSON.stringify(mapping));
        }

        return newImplemento;
      }
    },

    async atualizar(id: number, implemento: Implemento): Promise<Implemento> {
      try {
        const { clientes, id: _, ...cleanPayload } = implemento;
        const { data, error } = await supabase
          .from("implementos")
          .update(cleanPayload)
          .eq("id", id)
          .select()
          .single();
        
        if (error) {
          // If database is missing the plano_id column, retry without it and save to local mapping
          if (error.message?.includes("plano_id") || error.code === "42703") {
            const { plano_id, ...dbPayload } = cleanPayload;
            const retryResult = await supabase
              .from("implementos")
              .update(dbPayload)
              .eq("id", id)
              .select()
              .single();
            
            if (retryResult.error) throw retryResult.error;
            
            const plansMapping = localStorage.getItem("gst_implemento_planos");
            const mapping = plansMapping ? JSON.parse(plansMapping) : {};
            if (plano_id) {
              mapping[id] = plano_id;
            } else {
              delete mapping[id];
            }
            localStorage.setItem("gst_implemento_planos", JSON.stringify(mapping));
            
            return { ...retryResult.data, plano_id };
          }
          throw error;
        }

        const plansMapping = localStorage.getItem("gst_implemento_planos");
        const mapping = plansMapping ? JSON.parse(plansMapping) : {};
        if (implemento.plano_id) {
          mapping[id] = implemento.plano_id;
        } else {
          delete mapping[id];
        }
        localStorage.setItem("gst_implemento_planos", JSON.stringify(mapping));

        return data;
      } catch (err) {
        const list = await this.listar();
        const clients = await API.clientes.listar();
        const foundClient = clients.find(c => c.id === Number(implemento.cliente_id));
        const updated = list.map(i => i.id === id ? { 
          ...i, 
          ...implemento, 
          id,
          clientes: foundClient ? {
            id: foundClient.id!,
            razao_social: foundClient.razao_social,
            cidade: foundClient.cidade,
            uf: foundClient.uf
          } : i.clientes
        } : i);
        localStorage.setItem("gst_implementos", JSON.stringify(updated));
        
        const plansMapping = localStorage.getItem("gst_implemento_planos");
        const mapping = plansMapping ? JSON.parse(plansMapping) : {};
        if (implemento.plano_id) {
          mapping[id] = implemento.plano_id;
        } else {
          delete mapping[id];
        }
        localStorage.setItem("gst_implemento_planos", JSON.stringify(mapping));

        return { ...implemento, id };
      }
    },

    async excluir(id: number): Promise<boolean> {
      try {
        // 1. Fetch any related ordens_servico first
        const { data: relatedOS, error: fetchOSError } = await supabase
          .from("ordens_servico")
          .select("id")
          .eq("implemento_id", id);
        
        if (!fetchOSError && relatedOS && relatedOS.length > 0) {
          const osIds = relatedOS.map(o => o.id);
          
          // Delete related pointing hours (apontamentos)
          const { error: deleteApError } = await supabase
            .from("os_apontamentos")
            .delete()
            .in("os_id", osIds);
          if (deleteApError) console.error("Error deleting related apontamentos:", deleteApError);
          
          // Delete related ordens_servico
          const { error: deleteOSError } = await supabase
            .from("ordens_servico")
            .delete()
            .in("id", osIds);
          if (deleteOSError) console.error("Error deleting related ordens_servico:", deleteOSError);
        }

        // 2. Also try setting implemento_id to null for any other referencing O.S. (just in case)
        await supabase
          .from("ordens_servico")
          .update({ implemento_id: null })
          .eq("implemento_id", id);

        // 3. Delete the implemento itself
        const { error } = await supabase
          .from("implementos")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Error deleting implemento from Supabase, falling back to local storage:", err);
        const list = await this.listar();
        const filtered = list.filter(i => i.id !== id);
        localStorage.setItem("gst_implementos", JSON.stringify(filtered));

        // Also update local ordens_servico (remove or nullify reference)
        const savedOS = localStorage.getItem("gst_ordens_servico");
        if (savedOS) {
          try {
            const ordensList = JSON.parse(savedOS);
            // Delete related OS locally to match the cascading DB logic
            const updatedOS = ordensList.filter((o: any) => o.implemento_id !== id);
            localStorage.setItem("gst_ordens_servico", JSON.stringify(updatedOS));
          } catch (e) {
            console.error("Error updating local ordens_servico fallback:", e);
          }
        }
        return true;
      }
    },

    async buscarSerie(serie: string): Promise<Implemento | null> {
      try {
        const { data, error } = await supabase
          .from("implementos")
          .select("*")
          .eq("numero_serie", serie)
          .maybeSingle();
        if (error) throw error;
        return data;
      } catch (err) {
        const list = await this.listar();
        return list.find(i => i.numero_serie === serie) || null;
      }
    }
  },

  tecnicos: {
    async listar(): Promise<Tecnico[]> {
      try {
        const { data, error } = await supabase
          .from("tecnicos")
          .select("*")
          .order("nome");
        if (error) throw error;

        const comissoesMappingStr = localStorage.getItem("gst_tecnicos_comissoes");
        const comissoesMapping = comissoesMappingStr ? JSON.parse(comissoesMappingStr) : {};

        const merged = (data || []).map((t: any) => ({
          ...t,
          comissao_tecnico: t.comissao_tecnico ?? comissoesMapping[t.id]?.comissao_tecnico ?? 0,
          comissao_auxiliar: t.comissao_auxiliar ?? comissoesMapping[t.id]?.comissao_auxiliar ?? 0,
        }));

        return merged;
      } catch (err) {
        console.warn("Falling back to simulated tecnicos...");
        const saved = localStorage.getItem("gst_tecnicos");
        if (saved) return JSON.parse(saved);
        // Create initial default technicians for a smooth setup
        const initial = [
          { id: 1, nome: "JEFFERSON SILVA", apelido: "JEFFERSON", cargo: "TÉCNICO SÊNIOR", telefone: "(69) 99200-1122", email: "jefferson@gmail.com", ativo: true, cor_agenda: "#E30613" },
          { id: 2, nome: "DELTERONIMO SILVA", apelido: "DELTERONIMO", cargo: "TÉCNICO", telefone: "(69) 99211-2233", email: "delteronimo@gmail.com", ativo: true, cor_agenda: "#2563eb" },
          { id: 3, nome: "LUCAS MOREIRA", apelido: "LUCAS", cargo: "TÉCNICO", telefone: "(69) 99222-3344", email: "lucas@gmail.com", ativo: true, cor_agenda: "#16a34a" },
          { id: 4, nome: "SHELTON SOUZA", apelido: "SHELTON", cargo: "TÉCNICO", telefone: "(69) 99233-4455", email: "shelton@gmail.com", ativo: true, cor_agenda: "#9333ea" }
        ];
        localStorage.setItem("gst_tecnicos", JSON.stringify(initial));
        return initial;
      }
    },

    async buscar(id: number): Promise<Tecnico | null> {
      try {
        const { data, error } = await supabase
          .from("tecnicos")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        
        const comissoesMappingStr = localStorage.getItem("gst_tecnicos_comissoes");
        const comissoesMapping = comissoesMappingStr ? JSON.parse(comissoesMappingStr) : {};

        return {
          ...data,
          comissao_tecnico: data.comissao_tecnico ?? comissoesMapping[id]?.comissao_tecnico ?? 0,
          comissao_auxiliar: data.comissao_auxiliar ?? comissoesMapping[id]?.comissao_auxiliar ?? 0,
        };
      } catch (err) {
        const list = await this.listar();
        return list.find(t => t.id === id) || null;
      }
    },

    async inserir(tecnico: Tecnico): Promise<Tecnico> {
      try {
        const { data, error } = await supabase
          .from("tecnicos")
          .insert(tecnico)
          .select()
          .single();
        
        if (error) {
          if (error.code === "42703" || error.message?.includes("comissao")) {
            const { comissao_tecnico, comissao_auxiliar, ...dbPayload } = tecnico as any;
            const retryResult = await supabase
              .from("tecnicos")
              .insert(dbPayload)
              .select()
              .single();

            if (retryResult.error) throw retryResult.error;

            const comissoesMappingStr = localStorage.getItem("gst_tecnicos_comissoes");
            const comissoesMapping = comissoesMappingStr ? JSON.parse(comissoesMappingStr) : {};
            comissoesMapping[retryResult.data.id] = { comissao_tecnico, comissao_auxiliar };
            localStorage.setItem("gst_tecnicos_comissoes", JSON.stringify(comissoesMapping));

            return { ...retryResult.data, comissao_tecnico, comissao_auxiliar };
          }
          throw error;
        }

        return data;
      } catch (err) {
        const list = await this.listar();
        const nextId = list.reduce((max, t) => Math.max(max, t.id || 0), 0) + 1;
        const newTecnico = { ...tecnico, id: nextId };
        localStorage.setItem("gst_tecnicos", JSON.stringify([...list, newTecnico]));
        return newTecnico;
      }
    },

    async atualizar(id: number, tecnico: Tecnico): Promise<Tecnico> {
      try {
        const { data, error } = await supabase
          .from("tecnicos")
          .update(tecnico)
          .eq("id", id)
          .select()
          .single();
        
        if (error) {
          if (error.code === "42703" || error.message?.includes("comissao")) {
            const { comissao_tecnico, comissao_auxiliar, ...dbPayload } = tecnico as any;
            const retryResult = await supabase
              .from("tecnicos")
              .update(dbPayload)
              .eq("id", id)
              .select()
              .single();

            if (retryResult.error) throw retryResult.error;

            const comissoesMappingStr = localStorage.getItem("gst_tecnicos_comissoes");
            const comissoesMapping = comissoesMappingStr ? JSON.parse(comissoesMappingStr) : {};
            comissoesMapping[id] = { comissao_tecnico, comissao_auxiliar };
            localStorage.setItem("gst_tecnicos_comissoes", JSON.stringify(comissoesMapping));

            return { ...retryResult.data, comissao_tecnico, comissao_auxiliar };
          }
          throw error;
        }

        return data;
      } catch (err) {
        const list = await this.listar();
        const updated = list.map(t => t.id === id ? { ...t, ...tecnico, id } : t);
        localStorage.setItem("gst_tecnicos", JSON.stringify(updated));
        return { ...tecnico, id };
      }
    },

    async excluir(id: number): Promise<boolean> {
      try {
        const { error } = await supabase
          .from("tecnicos")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return true;
      } catch (err) {
        const list = await this.listar();
        const filtered = list.filter(t => t.id !== id);
        localStorage.setItem("gst_tecnicos", JSON.stringify(filtered));
        return true;
      }
    },

    async listarAtivos(): Promise<Tecnico[]> {
      const list = await this.listar();
      return list.filter(t => t.ativo === true);
    }
  },

  ordensServico: {
    async listar(): Promise<OrdemServico[]> {
      try {
        let { data, error } = await supabase
          .from("ordens_servico")
          .select(`
            *,
            clientes (id, razao_social, cidade, uf),
            implementos (id, fabricante, categoria, modelo, numero_serie)
          `)
          .order("id", { ascending: false });
        
        // Handle join failures (PGRST200)
        if (error && error.code === "PGRST200") {
          console.warn("Join failed in listar, fetching relations separately...");
          const { data: baseData, error: baseError } = await supabase
            .from("ordens_servico")
            .select("*")
            .order("id", { ascending: false });
          
          if (baseError) throw baseError;
          
          const [clients, implements_data] = await Promise.all([
            API.clientes.listar(),
            API.implementos.listar()
          ]);

          data = (baseData || []).map(o => ({
            ...o,
            clientes: clients.find(c => c.id === o.cliente_id),
            implementos: implements_data.find(i => i.id === o.implemento_id)
          }));
          error = null;
        }

        if (error) throw error;
        
        const fetchedData = (data || []).map(o => {
          const os: any = {
            ...o,
            reclamacao: o.reclamacao || o.problema || o.problema_relatado || "",
            servico_executado: o.servico_executado || o.servico || o.laudo || "",
            observacao: o.observacao || o.obs || "",
            horimetro_final: o.horimetro_final || o.horimetro || undefined,
            km_rodado_total: o.km_rodado_total || o.km_rodado || 0,
            numero_os: (o.numero_os === "EMPTY" || !o.numero_os || o.numero_os === "NOVA") ? null : o.numero_os
          };
          
          if (!os.numero_os) {
            os.numero_os = `OS-TMP-${os.id}`;
          }
          
          return os as OrdemServico;
        });

        localStorage.setItem("gst_ordens_servico", JSON.stringify(fetchedData));
        return fetchedData;
      } catch (err) {
        console.warn("Database fetch failed, falling back to local storage...", err);
        const saved = localStorage.getItem("gst_ordens_servico");
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch (e) {
            console.error("Error parsing local ordens_servico list:", e);
          }
        }
        return [];
      }
    },

    async buscar(id: number): Promise<OrdemServico | null> {
      try {
        let rawData: any = null;
        let relationError = false;

        const { data, error } = await supabase
          .from("ordens_servico")
          .select(`
            *,
            clientes (*),
            implementos (*)
          `)
          .eq("id", id)
          .single();
          
        if (error) {
          if (error.code === "PGRST200" || error.message?.includes("relationship") || error.message?.includes("foreign key")) {
            relationError = true;
          } else {
            throw error;
          }
        } else {
          rawData = data;
        }

        if (relationError) {
          const { data: os, error: osErr } = await supabase
            .from("ordens_servico")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (osErr) throw osErr;
          if (!os) return null;

          let clientData = undefined;
          if (os.cliente_id) {
            const { data: cli } = await supabase
              .from("clientes")
              .select("*")
              .eq("id", os.cliente_id)
              .maybeSingle();
            if (cli) clientData = cli;
          }

          let impData = undefined;
          if (os.implemento_id) {
            const { data: imp } = await supabase
              .from("implementos")
              .select("*")
              .eq("id", os.implemento_id)
              .maybeSingle();
            if (imp) impData = imp;
          }

          rawData = {
            ...os,
            clientes: clientData,
            implementos: impData
          };
        }

        if (!rawData) return null;
        
        // Map common DB field names to frontend names
        return {
          ...rawData,
          reclamacao: rawData.reclamacao || rawData.problema || rawData.problema_relatado || "",
          servico_executado: rawData.servico_executado || rawData.servico || rawData.laudo || "",
          observacao: rawData.observacao || rawData.obs || "",
          horimetro_final: rawData.horimetro_final || rawData.horimetro || undefined,
          km_rodado_total: rawData.km_rodado_total || rawData.km_rodado || 0,
        } as OrdemServico;
      } catch (err) {
        const list = await this.listar();
        return list.find(o => o.id === id) || null;
      }
    },

    async inserir(os: OrdemServico): Promise<OrdemServico> {
      // 1. Generate OS Number if missing or "EMPTY" or "NOVA" or "OS-TMP-"
      if (!os.numero_os || os.numero_os.trim() === "" || os.numero_os === "EMPTY" || os.numero_os === "NOVA" || os.numero_os.startsWith("OS-TMP-")) {
        const list = await this.listar();
        const lastNum = list.reduce((max, item) => {
          const match = item.numero_os?.match(/OS(\d+)/);
          return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0);
        os.numero_os = "OS" + String(lastNum + 1).padStart(6, "0");
      }

      // 2. Map and Filter columns for DB payload
      const { clientes, implementos, id, ...cleanOS } = os;
      
      const validColumns = [
        "numero_os", "status", "cliente_id", "implemento_id", "tecnico_id", "auxiliar_id",
        "tipo_atendimento", "prioridade", "reclamacao", "observacao", "solicitante",
        "data_abertura", "data_encerramento", "data_atendimento", "data_termino",
        "hora_inicial", "hora_final", "servico_executado", "veiculo_usado",
        "km_inicial", "km_final", "km_rodado_total", "horimetro_final",
        "revisao_executada", "horas_trabalhadas_total", "valor_km_unitario",
        "valor_hora_unitario", "valor_deslocamento", "valor_mao_obra",
        "valor_terceiros", "valor_total", "nota_fiscal", "num_nota_fiscal", "data_nota_fiscal",
        "modo_debito_interno", "classificacao_atendimento_interno", "valor_referencia_servico", "base_calculo_referencia", "centro_custo_debito", "observacao_debito",
        // DB Field Mapping aliases
        "problema", "problema_relatado", "servico", "laudo", "obs", "horimetro", "km_rodado"
      ];
      
      let payload: any = {};
      for (const col of validColumns) {
        if (col in cleanOS && (cleanOS as any)[col] !== undefined) {
          payload[col] = (cleanOS as any)[col];
        }
      }

      // Defensive redundancy mapping
      if (cleanOS.reclamacao && !payload.problema) payload.problema = cleanOS.reclamacao;
      if (cleanOS.servico_executado) { payload.servico = cleanOS.servico_executado; 
        payload.servico_executado = cleanOS.servico_executado;
        
      }
      if (cleanOS.observacao && !payload.obs) payload.obs = cleanOS.observacao;
      if (cleanOS.horimetro_final && !payload.horimetro) payload.horimetro = cleanOS.horimetro_final;
      if (cleanOS.km_rodado_total && !payload.km_rodado) payload.km_rodado = cleanOS.km_rodado_total;
      
      // Sanitize time fields: if empty string, set to null to avoid DB errors
      if (payload.hora_inicial === "") payload.hora_inicial = null;
      if (payload.hora_final === "") payload.hora_final = null;
      
      // General sanitization: convert all empty strings to null for DB consistency
      // except for specifically required strings if any
      for (const key in payload) {
        if (payload[key] === "") {
          payload[key] = null;
        }
      }
      
      // Default data_abertura if missing
      if (!payload.data_abertura) payload.data_abertura = new Date().toISOString();

      let attempt = 0;
      while (attempt < 15) {
        try {
          const { data, error } = await supabase
            .from("ordens_servico")
            .insert(payload)
            .select()
            .single();
            
          if (error) {
            // PostgreSQL code 42703 (undefined_column)
            // PostgREST code PGRST204 (column not found in schema cache)
            if (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("column") || error.message?.includes("does not exist")) {
              // Handle both "column 'name'" and "'name' column" formats
              const match = error.message.match(/column ['"](.*?)['"]/i) || error.message.match(/['"](.*?)['"] column/i);
              const colName = match ? (match[1] || match[2]) : null;
              if (colName && colName in payload) {
                console.warn(`Column '${colName}' not in DB. Removing...`);
                delete (payload as any)[colName];
                attempt++;
                continue;
              }
              
              // Fallback for specific known missing columns if regex fails
              const knownMissing = ["data_termino", "obs", "problema", "servico", "laudo", "horimetro", "km_rodado", "revisao_executada"];
              let foundMissing = false;
              for (const col of knownMissing) {
                if (error.message.includes(`'${col}'`) || error.message.includes(`"${col}"`)) {
                  console.warn(`Known missing column '${col}' detected. Removing.`);
                  delete (payload as any)[col];
                  foundMissing = true;
                  break;
                }
              }
              if (foundMissing) {
                attempt++;
                continue;
              }
            }
            throw error;
          }
          
          return await this.buscar(data.id) || data;
        } catch (err) {
          console.error("Insert failed details:", JSON.stringify(err, null, 2));
          break;
        }
      }
      
      // Fallback
      const list = await this.listar();
      const nextId = Math.max(0, ...list.map(o => o.id || 0)) + 1;
      const result = { ...os, id: nextId };
      localStorage.setItem("gst_ordens_servico", JSON.stringify([result, ...list]));
      return result;
    },

    async atualizar(id: number, os: OrdemServico): Promise<OrdemServico> {
      if (!os.numero_os || os.numero_os.trim() === "" || os.numero_os === "EMPTY" || os.numero_os === "NOVA" || os.numero_os.startsWith("OS-TMP-")) {
        const list = await this.listar();
        const lastNum = list.reduce((max, item) => {
          const match = item.numero_os?.match(/OS(\d+)/);
          return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0);
        os.numero_os = "OS" + String(lastNum + 1).padStart(6, "0");
      }

      const { clientes, implementos, id: _, ...cleanOS } = os;
      const validColumns = [
        "numero_os", "status", "cliente_id", "implemento_id", "tecnico_id", "auxiliar_id",
        "tipo_atendimento", "prioridade", "reclamacao", "observacao", "solicitante",
        "data_abertura", "data_encerramento", "data_atendimento", "data_termino",
        "hora_inicial", "hora_final", "servico_executado", "veiculo_usado",
        "km_inicial", "km_final", "km_rodado_total", "horimetro_final",
        "revisao_executada", "horas_trabalhadas_total", "valor_km_unitario",
        "valor_hora_unitario", "valor_deslocamento", "valor_mao_obra",
        "valor_terceiros", "valor_total", "nota_fiscal", "num_nota_fiscal", "data_nota_fiscal",
        "modo_debito_interno", "classificacao_atendimento_interno", "valor_referencia_servico", "base_calculo_referencia", "centro_custo_debito", "observacao_debito",
        "problema", "problema_relatado", "servico", "laudo", "obs", "horimetro", "km_rodado", "servico_executado"
      ];
      
      let payload: any = {};
      for (const col of validColumns) {
        if (col in cleanOS && (cleanOS as any)[col] !== undefined) {
          payload[col] = (cleanOS as any)[col];
        }
      }
      
      if (cleanOS.reclamacao && !payload.problema) payload.problema = cleanOS.reclamacao;
      if (cleanOS.servico_executado) { payload.servico = cleanOS.servico_executado; 
        payload.servico_executado = cleanOS.servico_executado;
        
      }
      if (cleanOS.observacao && !payload.obs) payload.obs = cleanOS.observacao;
      if (cleanOS.horimetro_final && !payload.horimetro) payload.horimetro = cleanOS.horimetro_final;
      if (cleanOS.km_rodado_total && !payload.km_rodado) payload.km_rodado = cleanOS.km_rodado_total;
      
      // Sanitize time fields: if empty string, set to null to avoid DB errors
      if (payload.hora_inicial === "") payload.hora_inicial = null;
      if (payload.hora_final === "") payload.hora_final = null;

      // General sanitization: convert all empty strings to null for DB consistency
      for (const key in payload) {
        if (payload[key] === "") {
          payload[key] = null;
        }
      }
      
      let attempt = 0;
      while (attempt < 15) {
        try {
          const { data, error } = await supabase
            .from("ordens_servico")
            .update(payload)
            .eq("id", id)
            .select()
            .single();
            
          if (error) {
            // PostgreSQL code 42703 (undefined_column)
            // PostgREST code PGRST204 (column not found in schema cache)
            if (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("column") || error.message?.includes("does not exist")) {
              // Handle both "column 'name'" and "'name' column" formats
              const match = error.message.match(/column ['"](.*?)['"]/i) || error.message.match(/['"](.*?)['"] column/i);
              const colName = match ? (match[1] || match[2]) : null;
              if (colName && colName in payload) {
                console.warn(`Column '${colName}' not in DB. Removing...`);
                delete (payload as any)[colName];
                attempt++;
                continue;
              }
              
              // Fallback for specific known missing columns if regex fails
              const knownMissing = ["data_termino", "obs", "problema", "servico", "laudo", "horimetro", "km_rodado", "revisao_executada"];
              let foundMissing = false;
              for (const col of knownMissing) {
                if (error.message.includes(`'${col}'`) || error.message.includes(`"${col}"`)) {
                  console.warn(`Known missing column '${col}' detected. Removing.`);
                  delete (payload as any)[col];
                  foundMissing = true;
                  break;
                }
              }
              if (foundMissing) {
                attempt++;
                continue;
              }
            }
            throw error;
          }
          return await this.buscar(data.id) || data;
        } catch (err) {
          console.error("Update failed details:", JSON.stringify(err, null, 2));
          break;
        }
      }
      
      // Sync local storage fallback
      const list = await this.listar();
      const updated = list.map(o => o.id === id ? { ...o, ...os } : o);
      localStorage.setItem("gst_ordens_servico", JSON.stringify(updated));
      return { ...os, id };
    },

    async excluir(id: number): Promise<boolean> {
      try {
        const { error } = await supabase
          .from("ordens_servico")
          .delete()
          .eq("id", id);
        if (error) throw error;
      } catch (err) {
        console.warn("Could not delete from Supabase, removing from LocalStorage...");
      }
      const list = await this.listar();
      const filtered = list.filter(o => o.id !== id);
      localStorage.setItem("gst_ordens_servico", JSON.stringify(filtered));
      return true;
    },

    async finalizar(id: number): Promise<OrdemServico> {
      try {
        const { data, error } = await supabase
          .from("ordens_servico")
          .update({
            status: "FINALIZADA",
            data_encerramento: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        const list = await this.listar();
        let target: OrdemServico | null = null;
        const updated = list.map(o => {
          if (o.id === id) {
            target = { ...o, status: "FINALIZADA" as const, data_encerramento: new Date().toISOString() };
            return target;
          }
          return o;
        });
        localStorage.setItem("gst_ordens_servico", JSON.stringify(updated));
        return target || { id, status: "FINALIZADA" as const, numero_os: "", cliente_id: 0, implemento_id: 0, reclamacao: "" };
      }
    },

    async cancelar(id: number): Promise<OrdemServico> {
      try {
        const { data, error } = await supabase
          .from("ordens_servico")
          .update({ status: "CANCELADA" })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        const list = await this.listar();
        let target: OrdemServico | null = null;
        const updated = list.map(o => {
          if (o.id === id) {
            target = { ...o, status: "CANCELADA" as const };
            return target;
          }
          return o;
        });
        localStorage.setItem("gst_ordens_servico", JSON.stringify(updated));
        return target || { id, status: "CANCELADA" as const, numero_os: "", cliente_id: 0, implemento_id: 0, reclamacao: "" };
      }
    },

    async buscarNumero(numero: string): Promise<OrdemServico | null> {
      try {
        const { data, error } = await supabase
          .from("ordens_servico")
          .select("*")
          .eq("numero_os", numero)
          .maybeSingle();
        if (error) throw error;
        return data;
      } catch (err) {
        const list = await this.listar();
        return list.find(o => o.numero_os === numero) || null;
      }
    }
  },

  apontamentos: {
    async listar(osId: number): Promise<Apontamento[]> {
      try {
        console.log("Listing appointments for OS:", osId);
        const { data, error } = await supabase
          .from("os_apontamentos")
          .select(`
            *,
            tecnicos (
              id,
              nome,
              apelido
            )
          `)
          .eq("os_id", osId);
          
        if (error) throw error;
        
        const dbItems = (data || []).map(item => ({
          id: item.id,
          os_id: item.os_id,
          tecnico_id: item.tecnico_id,
          data_servico: item.data,
          hora_inicial: item.hora_inicio,
          hora_final: item.hora_fim,
          descricao_servico: item.descricao || item.servico || item.servico_executado || "",
          horas_trabalhadas: item.horas_trabalhadas || 0,
          km_rodado: item.km_rodado || 0,
          tecnicos: item.tecnicos
        }));

        // Merge with localStorage for resilience
        const saved = localStorage.getItem("gst_apontamentos");
        let localItems: Apontamento[] = [];
        if (saved) {
          try {
            const list: Apontamento[] = JSON.parse(saved);
            localItems = list.filter(a => 
              Number(a.os_id) === Number(osId) && 
              !dbItems.find(db => String(db.id) === String(a.id))
            );
          } catch (e) {
            console.error("Local storage parse error:", e);
          }
        }

        const allItems = [...dbItems, ...localItems];
        // Sort by date and time
        return allItems.sort((a, b) => {
          const dateA = a.data_servico || "";
          const dateB = b.data_servico || "";
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          return (a.hora_inicial || "").localeCompare(b.hora_inicial || "");
        });
      } catch (err) {
        console.error("Error listing pointing:", err);
        const saved = localStorage.getItem("gst_apontamentos");
        if (saved) {
          try {
            const list: Apontamento[] = JSON.parse(saved);
            return list.filter(a => Number(a.os_id) === Number(osId));
          } catch (e) {}
        }
        return [];
      }
    },

    async buscar(id: number): Promise<Apontamento | null> {
      try {
        const { data, error } = await supabase
          .from("os_apontamentos")
          .select(`
            *,
            tecnicos (
              id,
              nome,
              apelido
            )
          `)
          .eq("id", id)
          .single();
        if (error) throw error;
        
        return {
          id: data.id,
          os_id: data.os_id,
          tecnico_id: data.tecnico_id,
          data_servico: data.data,
          hora_inicial: data.hora_inicio,
          hora_final: data.hora_fim,
          descricao_servico: data.descricao || data.servico || "",
          horas_trabalhadas: data.horas_trabalhadas || 0,
          km_rodado: data.km_rodado || 0,
          tecnicos: data.tecnicos
        };
      } catch (err) {
        const saved = localStorage.getItem("gst_apontamentos");
        if (saved) {
          const list: Apontamento[] = JSON.parse(saved);
          return list.find(a => a.id === id) || null;
        }
        return null;
      }
    },

    async inserir(apontamento: Apontamento): Promise<Apontamento> {
      try {
        // Map frontend fields to DB columns
        const payload: any = {
          os_id: apontamento.os_id,
          tecnico_id: apontamento.tecnico_id,
          data: apontamento.data_servico,
          hora_inicio: apontamento.hora_inicial,
          hora_fim: apontamento.hora_final,
          descricao: apontamento.descricao_servico,
          servico: apontamento.descricao_servico,
          horas_trabalhadas: apontamento.horas_trabalhadas,
          km_rodado: apontamento.km_rodado
        };

        // Sanitize
        for (const key in payload) {
          if (payload[key] === "") payload[key] = null;
        }

        let attempt = 0;
        while (attempt < 15) {
          const { data, error } = await supabase
            .from("os_apontamentos")
            .insert(payload)
            .select(`
              *,
              tecnicos (id, nome, apelido)
            `)
            .single();
          
          if (error) {
            if (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("column") || error.message?.includes("does not exist")) {
              const match = error.message.match(/column ['"](.*?)['"]/i) || error.message.match(/['"](.*?)['"] column/i);
              const colName = match ? (match[1] || match[2]) : null;
              if (colName && colName in payload) {
                console.warn(`Column '${colName}' not in DB. Removing...`);
                delete payload[colName];
                attempt++;
                continue;
              }
            }
            throw error;
          }

          return {
            id: data.id,
            os_id: data.os_id,
            tecnico_id: data.tecnico_id,
            data_servico: data.data,
            hora_inicial: data.hora_inicio,
            hora_final: data.hora_fim,
            descricao_servico: data.descricao || data.servico || "",
            horas_trabalhadas: data.horas_trabalhadas || 0,
            km_rodado: data.km_rodado || 0,
            tecnicos: data.tecnicos
          };
        }
        throw new Error("Failed after too many retries");
      } catch (err) {
        console.error("Error inserting appointment, falling back to local storage:", err);
        const saved = localStorage.getItem("gst_apontamentos");
        const list: Apontamento[] = saved ? JSON.parse(saved) : [];
        const tecnicos = await API.tecnicos.listar();
        const foundTecnico = tecnicos.find(t => t.id === Number(apontamento.tecnico_id));
        
        // Use a more robust random ID for local storage to prevent collisions
        const nextId = Date.now() + Math.floor(Math.random() * 100000);
        
        const newApontamento: Apontamento = {
          ...apontamento,
          id: nextId,
          tecnicos: foundTecnico ? {
            id: foundTecnico.id!,
            nome: foundTecnico.nome,
            apelido: foundTecnico.apelido
          } : undefined
        };
        localStorage.setItem("gst_apontamentos", JSON.stringify([...list, newApontamento]));
        return newApontamento;
      }
    },

    async atualizar(id: number, apontamento: Apontamento): Promise<Apontamento> {
      try {
        const payload: any = {
          os_id: apontamento.os_id,
          tecnico_id: apontamento.tecnico_id,
          data: apontamento.data_servico,
          hora_inicio: apontamento.hora_inicial,
          hora_fim: apontamento.hora_final,
          servico: apontamento.descricao_servico,
          descricao: apontamento.descricao_servico,
          horas_trabalhadas: apontamento.horas_trabalhadas,
          km_rodado: apontamento.km_rodado
        };

        // Sanitize
        for (const key in payload) {
          if (payload[key] === "") payload[key] = null;
        }

        let attempt = 0;
        while (attempt < 15) {
          const { data, error } = await supabase
            .from("os_apontamentos")
            .update(payload)
            .eq("id", id)
            .select(`
              *,
              tecnicos (id, nome, apelido)
            `)
            .single();
          
          if (error) {
            if (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("column") || error.message?.includes("does not exist")) {
              const match = error.message.match(/column ['"](.*?)['"]/i) || error.message.match(/['"](.*?)['"] column/i);
              const colName = match ? (match[1] || match[2]) : null;
              if (colName && colName in payload) {
                console.warn(`Column '${colName}' not in DB. Removing...`);
                delete payload[colName];
                attempt++;
                continue;
              }
            }
            throw error;
          }

          return {
            id: data.id,
            os_id: data.os_id,
            tecnico_id: data.tecnico_id,
            data_servico: data.data,
            hora_inicial: data.hora_inicio,
            hora_final: data.hora_fim,
            descricao_servico: data.servico || data.descricao || "",
            horas_trabalhadas: data.horas_trabalhadas || 0,
            km_rodado: data.km_rodado || 0,
            tecnicos: data.tecnicos
          };
        }
        throw new Error("Failed after too many retries");
      } catch (err) {
        const saved = localStorage.getItem("gst_apontamentos");
        const list: Apontamento[] = saved ? JSON.parse(saved) : [];
        const tecnicos = await API.tecnicos.listar();
        const foundTecnico = tecnicos.find(t => t.id === Number(apontamento.tecnico_id));
        
        const updated = list.map(a => a.id === id ? {
          ...a,
          ...apontamento,
          id,
          tecnicos: foundTecnico ? {
            id: foundTecnico.id!,
            nome: foundTecnico.nome,
            apelido: foundTecnico.apelido
          } : a.tecnicos
        } : a);
        localStorage.setItem("gst_apontamentos", JSON.stringify(updated));
        return { ...apontamento, id };
      }
    },

    async excluir(id: number | string): Promise<boolean> {
      try {
        const idStr = String(id);
        
        // 1. Remove from localStorage immediately
        const saved = localStorage.getItem("gst_apontamentos");
        if (saved) {
          try {
            const list: Apontamento[] = JSON.parse(saved);
            const filtered = list.filter(a => String(a.id) !== idStr);
            if (filtered.length !== list.length) {
              localStorage.setItem("gst_apontamentos", JSON.stringify(filtered));
            }
          } catch (e) {
            console.error("Local storage sync error:", e);
          }
        }

        // 2. Try Supabase deletion
        const numericId = Number(id);
        if (!isNaN(numericId)) {
          await supabase.from("os_apontamentos").delete().eq("id", numericId);
        }
        
        return true;
      } catch (err) {
        console.error("Excluir error:", err);
        return true; // We return true because local removal was attempted
      }
    },

    async resumo(osId: number): Promise<{ dias: number; horas: number; km: number }> {
      try {
        const { data, error } = await supabase
          .from("os_apontamentos")
          .select("horas_trabalhadas, km_rodado")
          .eq("os_id", osId);
        if (error) throw error;
        
        const summary = { dias: data?.length || 0, horas: 0, km: 0 };
        data?.forEach(item => {
          summary.horas += Number(item.horas_trabalhadas || 0);
          summary.km += Number(item.km_rodado || 0);
        });
        return summary;
      } catch (err) {
        const list = await this.listar(osId);
        const summary = { dias: list.length, horas: 0, km: 0 };
        list.forEach(item => {
          summary.horas += Number(item.horas_trabalhadas || 0);
          summary.km += Number(item.km_rodado || 0);
        });
        return summary;
      }
    }
  },

  planos: {
    listar(): PlanoManutencao[] {
      const saved = localStorage.getItem("gst_planos");
      if (saved) return JSON.parse(saved);
      localStorage.setItem("gst_planos", JSON.stringify(INITIAL_PLANOS));
      return INITIAL_PLANOS;
    },

    buscar(id: string): PlanoManutencao | null {
      return this.listar().find(p => p.id === id) || null;
    },

    salvar(plano: PlanoManutencao): PlanoManutencao {
      const list = this.listar();
      let updatedList;
      let targetPlano = { ...plano };
      if (!plano.id) {
        const nextNum = list.reduce((max, p) => Math.max(max, parseInt(p.id.replace("PM", "")) || 0), 0) + 1;
        targetPlano.id = "PM" + String(nextNum).padStart(6, "0");
        updatedList = [...list, targetPlano];
      } else {
        updatedList = list.map(p => p.id === plano.id ? targetPlano : p);
      }
      localStorage.setItem("gst_planos", JSON.stringify(updatedList));
      return targetPlano;
    },

    excluir(id: string): boolean {
      const list = this.listar();
      const filtered = list.filter(p => p.id !== id);
      localStorage.setItem("gst_planos", JSON.stringify(filtered));
      return true;
    },

    revisoes: {
      listar(planoId: string): PlanoRevisao[] {
        const saved = localStorage.getItem("gst_revisoes");
        const list: PlanoRevisao[] = saved ? JSON.parse(saved) : INITIAL_REVISOES;
        if (!saved) {
          localStorage.setItem("gst_revisoes", JSON.stringify(INITIAL_REVISOES));
        }
        return list.filter(r => r.id_plano === planoId).sort((a, b) => a.revisao_numero - b.revisao_numero);
      },

      salvar(revisao: PlanoRevisao): PlanoRevisao {
        const saved = localStorage.getItem("gst_revisoes");
        const list: PlanoRevisao[] = saved ? JSON.parse(saved) : INITIAL_REVISOES;
        let updatedList;
        let targetRev = { ...revisao };
        if (!revisao.id_revisao) {
          const nextNum = list.reduce((max, r) => Math.max(max, parseInt(r.id_revisao?.replace("PR", "") || "0") || 0), 0) + 1;
          targetRev.id_revisao = "PR" + String(nextNum).padStart(6, "0");
          updatedList = [...list, targetRev];
        } else {
          updatedList = list.map(r => r.id_revisao === revisao.id_revisao ? targetRev : r);
        }
        localStorage.setItem("gst_revisoes", JSON.stringify(updatedList));
        return targetRev;
      },

      excluir(id: string): boolean {
        const saved = localStorage.getItem("gst_revisoes");
        const list: PlanoRevisao[] = saved ? JSON.parse(saved) : INITIAL_REVISOES;
        const filtered = list.filter(r => r.id_revisao !== id);
        localStorage.setItem("gst_revisoes", JSON.stringify(filtered));
        return true;
      }
    }
  },

  veiculos: {
    async listar(): Promise<Veiculo[]> {
      const saved = localStorage.getItem("gst_veiculos");
      if (saved) {
        // Try to update local storage in the background if Supabase is available
        try {
          const { data, error } = await supabase
            .from("veiculos")
            .select("*")
            .order("placa");
          if (!error && data) {
            localStorage.setItem("gst_veiculos", JSON.stringify(data));
            return data;
          }
        } catch (e) {
          console.warn("Supabase fetch error, using local data:", e);
        }
        
        let list: Veiculo[] = JSON.parse(saved);
        // Automatically filter out leftover simulated vehicles from the user's browser storage
        const simulatedPlates = ["HIL-4X12", "LZZ-2002", "FIO-0303", "SAV-0404", "PROPRIO"];
        const filtered = list.filter(v => !simulatedPlates.includes(v.placa));
        if (filtered.length !== list.length) {
          localStorage.setItem("gst_veiculos", JSON.stringify(filtered));
          list = filtered;
        }
        return list;
      }

      try {
        const { data, error } = await supabase
          .from("veiculos")
          .select("*")
          .order("placa");
        if (error) throw error;
        
        localStorage.setItem("gst_veiculos", JSON.stringify(data || []));
        return data || [];
      } catch (err) {
        console.warn("Falling back to local veiculos...");
        localStorage.setItem("gst_veiculos", JSON.stringify(INITIAL_VEICULOS));
        return INITIAL_VEICULOS;
      }
    },

    async buscar(id: number): Promise<Veiculo | null> {
      const list = await this.listar();
      return list.find(v => v.id === id) || null;
    },

    async inserir(veiculo: Veiculo): Promise<Veiculo> {
      const list = await this.listar();
      const newId = list.reduce((max, v) => Math.max(max, v.id || 0), 0) + 1;
      const newVeiculo = { ...veiculo, id: newId };
      const updatedList = [...list, newVeiculo];
      localStorage.setItem("gst_veiculos", JSON.stringify(updatedList));

      // Attempt Supabase insert in background
      try {
        await supabase
          .from("veiculos")
          .insert(newVeiculo);
      } catch (err) {
        console.warn("Could not sync insert to Supabase, saved locally:", err);
      }
      return newVeiculo;
    },

    async atualizar(id: number, veiculo: Veiculo): Promise<Veiculo> {
      const list = await this.listar();
      const updatedList = list.map(v => v.id === id ? { ...veiculo, id } : v);
      localStorage.setItem("gst_veiculos", JSON.stringify(updatedList));

      // Attempt Supabase update in background
      try {
        await supabase
          .from("veiculos")
          .update(veiculo)
          .eq("id", id);
      } catch (err) {
        console.warn("Could not sync update to Supabase, saved locally:", err);
      }
      return { ...veiculo, id };
    },

    async excluir(id: number): Promise<boolean> {
      const list = await this.listar();
      const filtered = list.filter(v => v.id !== id);
      localStorage.setItem("gst_veiculos", JSON.stringify(filtered));

      // Attempt Supabase delete in background
      try {
        await supabase
          .from("veiculos")
          .delete()
          .eq("id", id);
      } catch (err) {
        console.warn("Could not sync delete to Supabase, deleted locally:", err);
      }
      return true;
    }
  },

  tiposAtendimento: {
    async listar(): Promise<TipoAtendimento[]> {
      const saved = localStorage.getItem("gst_tipos_atendimento");
      if (saved) {
        // Try to update local storage in the background if Supabase is available
        try {
          const { data, error } = await supabase
            .from("tipos_atendimento")
            .select("*")
            .order("nome");
          if (!error && data) {
            localStorage.setItem("gst_tipos_atendimento", JSON.stringify(data));
          }
        } catch (e) {
          console.warn("Supabase fetch error, using local data:", e);
        }
        return JSON.parse(saved);
      }

      try {
        const { data, error } = await supabase
          .from("tipos_atendimento")
          .select("*")
          .order("nome");
        if (error) throw error;
        
        localStorage.setItem("gst_tipos_atendimento", JSON.stringify(data || []));
        return data || [];
      } catch (err) {
        console.warn("Falling back to local tipos_atendimento...");
        localStorage.setItem("gst_tipos_atendimento", JSON.stringify(INITIAL_TIPOS_ATENDIMENTO));
        return INITIAL_TIPOS_ATENDIMENTO;
      }
    },

    async buscar(id: number): Promise<TipoAtendimento | null> {
      const list = await this.listar();
      return list.find(t => t.id === id) || null;
    },

    async inserir(tipo: TipoAtendimento): Promise<TipoAtendimento> {
      const list = await this.listar();
      const newId = list.reduce((max, t) => Math.max(max, t.id || 0), 0) + 1;
      const newTipo = { ...tipo, id: newId };
      const updatedList = [...list, newTipo];
      localStorage.setItem("gst_tipos_atendimento", JSON.stringify(updatedList));

      // Attempt Supabase insert in background
      try {
        await supabase
          .from("tipos_atendimento")
          .insert(newTipo);
      } catch (err) {
        console.warn("Could not sync insert to Supabase, saved locally:", err);
      }
      return newTipo;
    },

    async atualizar(id: number, tipo: TipoAtendimento): Promise<TipoAtendimento> {
      const list = await this.listar();
      const updatedList = list.map(t => t.id === id ? { ...tipo, id } : t);
      localStorage.setItem("gst_tipos_atendimento", JSON.stringify(updatedList));

      // Attempt Supabase update in background
      try {
        await supabase
          .from("tipos_atendimento")
          .update(tipo)
          .eq("id", id);
      } catch (err) {
        console.warn("Could not sync update to Supabase, saved locally:", err);
      }
      return { ...tipo, id };
    },

    async excluir(id: number): Promise<boolean> {
      const list = await this.listar();
      const filtered = list.filter(t => t.id !== id);
      localStorage.setItem("gst_tipos_atendimento", JSON.stringify(filtered));

      // Attempt Supabase delete in background
      try {
        await supabase
          .from("tipos_atendimento")
          .delete()
          .eq("id", id);
      } catch (err) {
        console.warn("Could not sync delete to Supabase, deleted locally:", err);
      }
      return true;
    }
  },

  usuarios: {
    async listar(): Promise<Usuario[]> {
      const mapDbUserToUsuario = (u: any): Usuario => {
        let permissoes: any = null;
        if (u.permissoes) {
          try {
            permissoes = typeof u.permissoes === "string" ? JSON.parse(u.permissoes) : u.permissoes;
          } catch (e) {
            console.warn("Error parsing user permissoes JSON", e);
          }
        }
        
        if (!permissoes) {
          // Fallback / Construct from flat columns to satisfy relational non-list schema
          permissoes = {
            dashboard: {
              consultar: u.perm_dashboard_consultar ?? true,
              editar: u.perm_dashboard_editar ?? false,
              excluir: u.perm_dashboard_excluir ?? false,
            },
            clientes: {
              consultar: u.perm_clientes_consultar ?? true,
              editar: u.perm_clientes_editar ?? true,
              excluir: u.perm_clientes_excluir ?? false,
            },
            implementos: {
              consultar: u.perm_implementos_consultar ?? true,
              editar: u.perm_implementos_editar ?? true,
              excluir: u.perm_implementos_excluir ?? false,
            },
            os: {
              consultar: u.perm_os_consultar ?? true,
              editar: u.perm_os_editar ?? true,
              excluir: u.perm_os_excluir ?? false,
            },
            agenda: {
              consultar: u.perm_agenda_consultar ?? true,
              editar: u.perm_agenda_editar ?? true,
              excluir: u.perm_agenda_excluir ?? false,
            },
            financeiro: {
              consultar: u.perm_financeiro_consultar ?? true,
              editar: u.perm_financeiro_editar ?? false,
              excluir: u.perm_financeiro_excluir ?? false,
            },
            configuracoes: {
              consultar: u.perm_configuracoes_consultar ?? false,
              editar: u.perm_configuracoes_editar ?? false,
              excluir: u.perm_configuracoes_excluir ?? false,
            },
            tecnicos: {
              consultar: u.perm_tecnicos_consultar ?? false,
              editar: u.perm_tecnicos_editar ?? false,
              excluir: u.perm_tecnicos_excluir ?? false,
            },
            tipos_atendimento: {
              consultar: u.perm_tipos_atendimento_consultar ?? false,
              editar: u.perm_tipos_atendimento_editar ?? false,
              excluir: u.perm_tipos_atendimento_excluir ?? false,
            },
            comissoes: {
              consultar: u.perm_comissoes_consultar ?? false,
              editar: u.perm_comissoes_editar ?? false,
              excluir: u.perm_comissoes_excluir ?? false,
            }
          };
        }

        return {
          id: u.id,
          nome: u.nome,
          usuario: u.usuario,
          email: u.email,
          perfil: u.perfil,
          ativo: u.ativo ?? true,
          ultimo_acesso: u.ultimo_acesso && u.ultimo_acesso !== "Nunca" ? u.ultimo_acesso : "Hoje, 09:30",
          foto: u.foto,
          senha: u.senha,
          permissoes
        };
      };

      let localList: Usuario[] = [];
      const saved = localStorage.getItem("gst_usuarios_v1");
      if (saved) {
        try {
          localList = JSON.parse(saved);
          let migrated = false;
          localList = localList.map((u: any) => {
            if (u.usuario === "admin" && (u.senha === "admin" || !u.senha)) {
              u.senha = "142536";
              migrated = true;
            }
            if (!u.ultimo_acesso || u.ultimo_acesso === "Nunca") {
              u.ultimo_acesso = "Hoje, 10:30";
              migrated = true;
            }
            return u;
          });
          if (migrated) {
            localStorage.setItem("gst_usuarios_v1", JSON.stringify(localList));
          }
        } catch (e) {
          console.error("Error parsing local users:", e);
        }
      }

      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("*")
          .order("nome");
        if (!error && data) {
          const supabaseParsed = data.map(mapDbUserToUsuario).map(u => ({
            ...u,
            ultimo_acesso: !u.ultimo_acesso || u.ultimo_acesso === "Nunca" ? "Hoje, 10:30" : u.ultimo_acesso
          }));
          
          const supabaseMap = new Map(supabaseParsed.map(u => [u.id, u]));
          const merged = [...supabaseParsed];
          for (const loc of localList) {
            const locWithAccess = {
              ...loc,
              ultimo_acesso: !loc.ultimo_acesso || loc.ultimo_acesso === "Nunca" ? "Hoje, 10:30" : loc.ultimo_acesso
            };
            if (!supabaseMap.has(loc.id)) {
              merged.push(locWithAccess);
            } else {
              const idx = merged.findIndex(m => m.id === loc.id);
              if (idx !== -1) {
                merged[idx] = { ...merged[idx], ...locWithAccess };
              }
            }
          }
          localStorage.setItem("gst_usuarios_v1", JSON.stringify(merged));
          return merged;
        }
      } catch (e) {
        console.warn("Supabase fetch error, using local data:", e);
      }

      if (localList.length > 0) {
        return localList.map(u => ({
          ...u,
          ultimo_acesso: !u.ultimo_acesso || u.ultimo_acesso === "Nunca" ? "Hoje, 10:30" : u.ultimo_acesso
        }));
      }

      const defaultWithAccess = INITIAL_USUARIOS.map(u => ({
        ...u,
        ultimo_acesso: u.ultimo_acesso || "Hoje, 10:30"
      }));
      localStorage.setItem("gst_usuarios_v1", JSON.stringify(defaultWithAccess));
      return defaultWithAccess;
    },

    async buscar(id: string): Promise<Usuario | null> {
      const list = await this.listar();
      return list.find(u => u.id === id) || null;
    },

    async inserir(usuario: Usuario): Promise<Usuario> {
      const list = await this.listar();
      const updatedList = [...list, usuario];
      localStorage.setItem("gst_usuarios_v1", JSON.stringify(updatedList));

      // Attempt Supabase insert in background
      try {
        const p = usuario.permissoes || DEFAULT_PERMISSIONS_LOCAL;
        const preparedUser = {
          id: usuario.id,
          nome: usuario.nome,
          usuario: usuario.usuario,
          email: usuario.email,
          perfil: usuario.perfil,
          ativo: usuario.ativo,
          ultimo_acesso: usuario.ultimo_acesso,
          foto: usuario.foto,
          senha: usuario.senha,
          permissoes: JSON.stringify(p),
          perm_dashboard_consultar: p.dashboard?.consultar ?? false,
          perm_dashboard_editar: p.dashboard?.editar ?? false,
          perm_dashboard_excluir: p.dashboard?.excluir ?? false,
          perm_clientes_consultar: p.clientes?.consultar ?? false,
          perm_clientes_editar: p.clientes?.editar ?? false,
          perm_clientes_excluir: p.clientes?.excluir ?? false,
          perm_implementos_consultar: p.implementos?.consultar ?? false,
          perm_implementos_editar: p.implementos?.editar ?? false,
          perm_implementos_excluir: p.implementos?.excluir ?? false,
          perm_os_consultar: p.os?.consultar ?? false,
          perm_os_editar: p.os?.editar ?? false,
          perm_os_excluir: p.os?.excluir ?? false,
          perm_agenda_consultar: p.agenda?.consultar ?? false,
          perm_agenda_editar: p.agenda?.editar ?? false,
          perm_agenda_excluir: p.agenda?.excluir ?? false,
          perm_financeiro_consultar: p.financeiro?.consultar ?? false,
          perm_financeiro_editar: p.financeiro?.editar ?? false,
          perm_financeiro_excluir: p.financeiro?.excluir ?? false,
          perm_configuracoes_consultar: p.configuracoes?.consultar ?? false,
          perm_configuracoes_editar: p.configuracoes?.editar ?? false,
          perm_configuracoes_excluir: p.configuracoes?.excluir ?? false,
          perm_tecnicos_consultar: p.tecnicos?.consultar ?? false,
          perm_tecnicos_editar: p.tecnicos?.editar ?? false,
          perm_tecnicos_excluir: p.tecnicos?.excluir ?? false,
          perm_tipos_atendimento_consultar: p.tipos_atendimento?.consultar ?? false,
          perm_tipos_atendimento_editar: p.tipos_atendimento?.editar ?? false,
          perm_tipos_atendimento_excluir: p.tipos_atendimento?.excluir ?? false,
          perm_comissoes_consultar: p.comissoes?.consultar ?? false,
          perm_comissoes_editar: p.comissoes?.editar ?? false,
          perm_comissoes_excluir: p.comissoes?.excluir ?? false,
        };
        await supabase
          .from("usuarios")
          .insert(preparedUser);
      } catch (err) {
        console.warn("Could not sync insert to Supabase, saved locally:", err);
      }
      return usuario;
    },

    async atualizar(id: string, usuario: Usuario): Promise<Usuario> {
      const list = await this.listar();
      const updatedList = list.map(u => u.id === id ? { ...usuario, id } : u);
      localStorage.setItem("gst_usuarios_v1", JSON.stringify(updatedList));

      // Attempt Supabase update in background
      try {
        const p = usuario.permissoes || DEFAULT_PERMISSIONS_LOCAL;
        const preparedUser = {
          nome: usuario.nome,
          usuario: usuario.usuario,
          email: usuario.email,
          perfil: usuario.perfil,
          ativo: usuario.ativo,
          ultimo_acesso: usuario.ultimo_acesso,
          foto: usuario.foto,
          senha: usuario.senha,
          permissoes: JSON.stringify(p),
          perm_dashboard_consultar: p.dashboard?.consultar ?? false,
          perm_dashboard_editar: p.dashboard?.editar ?? false,
          perm_dashboard_excluir: p.dashboard?.excluir ?? false,
          perm_clientes_consultar: p.clientes?.consultar ?? false,
          perm_clientes_editar: p.clientes?.editar ?? false,
          perm_clientes_excluir: p.clientes?.excluir ?? false,
          perm_implementos_consultar: p.implementos?.consultar ?? false,
          perm_implementos_editar: p.implementos?.editar ?? false,
          perm_implementos_excluir: p.implementos?.excluir ?? false,
          perm_os_consultar: p.os?.consultar ?? false,
          perm_os_editar: p.os?.editar ?? false,
          perm_os_excluir: p.os?.excluir ?? false,
          perm_agenda_consultar: p.agenda?.consultar ?? false,
          perm_agenda_editar: p.agenda?.editar ?? false,
          perm_agenda_excluir: p.agenda?.excluir ?? false,
          perm_financeiro_consultar: p.financeiro?.consultar ?? false,
          perm_financeiro_editar: p.financeiro?.editar ?? false,
          perm_financeiro_excluir: p.financeiro?.excluir ?? false,
          perm_configuracoes_consultar: p.configuracoes?.consultar ?? false,
          perm_configuracoes_editar: p.configuracoes?.editar ?? false,
          perm_configuracoes_excluir: p.configuracoes?.excluir ?? false,
          perm_tecnicos_consultar: p.tecnicos?.consultar ?? false,
          perm_tecnicos_editar: p.tecnicos?.editar ?? false,
          perm_tecnicos_excluir: p.tecnicos?.excluir ?? false,
          perm_tipos_atendimento_consultar: p.tipos_atendimento?.consultar ?? false,
          perm_tipos_atendimento_editar: p.tipos_atendimento?.editar ?? false,
          perm_tipos_atendimento_excluir: p.tipos_atendimento?.excluir ?? false,
          perm_comissoes_consultar: p.comissoes?.consultar ?? false,
          perm_comissoes_editar: p.comissoes?.editar ?? false,
          perm_comissoes_excluir: p.comissoes?.excluir ?? false,
        };
        await supabase
          .from("usuarios")
          .update(preparedUser)
          .eq("id", id);
      } catch (err) {
        console.warn("Could not sync update to Supabase, saved locally:", err);
      }
      return { ...usuario, id };
    },

    async excluir(id: string): Promise<boolean> {
      const list = await this.listar();
      const filtered = list.filter(u => u.id !== id);
      localStorage.setItem("gst_usuarios_v1", JSON.stringify(filtered));

      // Attempt Supabase delete in background
      try {
        await supabase
          .from("usuarios")
          .delete()
          .eq("id", id);
      } catch (err) {
        console.warn("Could not sync delete to Supabase, deleted locally:", err);
      }
      return true;
    }
  }
};
