/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from "./supabase";
import { Cliente, Implemento, Tecnico, OrdemServico, Apontamento, PlanoManutencao, PlanoRevisao } from "../types";

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
          .order("modelo");

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
            .order("modelo");
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
        const { data, error } = await supabase
          .from("ordens_servico")
          .select(`
            *,
            clientes (
              id,
              razao_social,
              cidade,
              uf
            ),
            implementos (
              id,
              fabricante,
              categoria,
              modelo,
              numero_serie
            )
          `)
          .order("id", { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Falling back to simulated O.S. list...");
        const saved = localStorage.getItem("gst_ordens_servico");
        if (saved) return JSON.parse(saved);
        return [];
      }
    },

    async buscar(id: number): Promise<OrdemServico | null> {
      try {
        const { data, error } = await supabase
          .from("ordens_servico")
          .select(`
            *,
            clientes (*),
            implementos (*)
          `)
          .eq("id", id)
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        const list = await this.listar();
        return list.find(o => o.id === id) || null;
      }
    },

    async inserir(os: OrdemServico): Promise<OrdemServico> {
      try {
        const { data, error } = await supabase
          .from("ordens_servico")
          .insert(os)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        const list = await this.listar();
        const nextId = list.reduce((max, o) => Math.max(max, o.id || 0), 0) + 1;
        const numOs = "OS" + String(nextId).padStart(6, "0");
        
        // Fetch client and implement
        const clients = await API.clientes.listar();
        const foundClient = clients.find(c => c.id === Number(os.cliente_id));
        const implementos = await API.implementos.listar();
        const foundImplemento = implementos.find(i => i.id === Number(os.implemento_id));

        const newOS: OrdemServico = {
          ...os,
          id: nextId,
          numero_os: os.numero_os || numOs,
          data_abertura: os.data_abertura || new Date().toISOString(),
          clientes: foundClient ? {
            id: foundClient.id!,
            razao_social: foundClient.razao_social,
            cidade: foundClient.cidade,
            uf: foundClient.uf,
            telefone: foundClient.telefone,
            celular: foundClient.celular
          } : undefined,
          implementos: foundImplemento ? {
            id: foundImplemento.id!,
            fabricante: foundImplemento.fabricante,
            categoria: foundImplemento.categoria,
            modelo: foundImplemento.modelo,
            numero_serie: foundImplemento.numero_serie,
            ano: foundImplemento.ano,
            data_entrega: foundImplemento.data_entrega,
            ativo: foundImplemento.ativo
          } : undefined
        };
        localStorage.setItem("gst_ordens_servico", JSON.stringify([...list, newOS]));
        return newOS;
      }
    },

    async atualizar(id: number, os: OrdemServico): Promise<OrdemServico> {
      try {
        const { data, error } = await supabase
          .from("ordens_servico")
          .update(os)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        const list = await this.listar();
        const clients = await API.clientes.listar();
        const foundClient = clients.find(c => c.id === Number(os.cliente_id));
        const implementos = await API.implementos.listar();
        const foundImplemento = implementos.find(i => i.id === Number(os.implemento_id));

        const updated = list.map(o => o.id === id ? {
          ...o,
          ...os,
          id,
          clientes: foundClient ? {
            id: foundClient.id!,
            razao_social: foundClient.razao_social,
            cidade: foundClient.cidade,
            uf: foundClient.uf,
            telefone: foundClient.telefone,
            celular: foundClient.celular
          } : o.clientes,
          implementos: foundImplemento ? {
            id: foundImplemento.id!,
            fabricante: foundImplemento.fabricante,
            categoria: foundImplemento.categoria,
            modelo: foundImplemento.modelo,
            numero_serie: foundImplemento.numero_serie,
            ano: foundImplemento.ano,
            data_entrega: foundImplemento.data_entrega,
            ativo: foundImplemento.ativo
          } : o.implementos
        } : o);
        localStorage.setItem("gst_ordens_servico", JSON.stringify(updated));
        return { ...os, id };
      }
    },

    async excluir(id: number): Promise<boolean> {
      try {
        const { error } = await supabase
          .from("ordens_servico")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return true;
      } catch (err) {
        const list = await this.listar();
        const filtered = list.filter(o => o.id !== id);
        localStorage.setItem("gst_ordens_servico", JSON.stringify(filtered));
        return true;
      }
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
          .eq("os_id", osId)
          .order("data_servico")
          .order("hora_inicial");
        if (error) throw error;
        return data || [];
      } catch (err) {
        const saved = localStorage.getItem("gst_apontamentos");
        if (saved) {
          const list: Apontamento[] = JSON.parse(saved);
          return list.filter(a => a.os_id === osId);
        }
        return [];
      }
    },

    async buscar(id: number): Promise<Apontamento | null> {
      try {
        const { data, error } = await supabase
          .from("os_apontamentos")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        return data;
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
        const { data, error } = await supabase
          .from("os_apontamentos")
          .insert(apontamento)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        const saved = localStorage.getItem("gst_apontamentos");
        const list: Apontamento[] = saved ? JSON.parse(saved) : [];
        const nextId = list.reduce((max, a) => Math.max(max, a.id || 0), 0) + 1;
        const tecnicos = await API.tecnicos.listar();
        const foundTecnico = tecnicos.find(t => t.id === Number(apontamento.tecnico_id));
        
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
        const { data, error } = await supabase
          .from("os_apontamentos")
          .update(apontamento)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
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

    async excluir(id: number): Promise<boolean> {
      try {
        const { error } = await supabase
          .from("os_apontamentos")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return true;
      } catch (err) {
        const saved = localStorage.getItem("gst_apontamentos");
        const list: Apontamento[] = saved ? JSON.parse(saved) : [];
        const filtered = list.filter(a => a.id !== id);
        localStorage.setItem("gst_apontamentos", JSON.stringify(filtered));
        return true;
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
  }
};
