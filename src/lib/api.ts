
function cleanUf(raw: any, fallback = "RO"): string {
  if (!raw) return fallback;
  const s = String(raw).toUpperCase().trim();
  if (s.includes("ROND")) return "RO";
  if (s.includes("ACRE")) return "AC";
  if (s.includes("AMAZON")) return "AM";
  if (s.includes("MATO GROSSO DO SUL")) return "MS";
  if (s.includes("MATO GROSSO")) return "MT";
  if (s.includes("PARAN")) return "PR";
  if (s.includes("SÃO PAULO") || s.includes("SAO PAULO")) return "SP";
  if (s.includes("MINAS")) return "MG";
  if (s.includes("GOI")) return "GO";
  const match = s.match(/\b([A-Z]{2})\b/);
  if (match) return match[1];
  return s.substring(0, 2) || fallback;
}

function cleanTipoPessoa(raw: any, cpfCnpjStr: string, fallback: "F" | "J" = "F"): "F" | "J" {
  if (raw) {
    const s = String(raw).toUpperCase().trim();
    if (s.startsWith("J") || s.includes("PJ") || s.includes("JURID")) return "J";
    if (s.startsWith("F") || s.includes("PF") || s.includes("FISIC") || s.includes("FÍSIC")) return "F";
  }
  const digits = String(cpfCnpjStr || "").replace(/\D/g, "");
  if (digits.length > 11) return "J";
  if (digits.length > 0) return "F";
  return fallback;
}

function cleanTimeVal(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const parts = s.split(":");
    const h = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    const sec = parts[2] ? parts[2].padStart(2, "0") : "00";
    return `${h}:${m}:${sec}`;
  }
  return null;
}

function extractMissingColumn(errorMessage: string, payload: Record<string, any>): string | null {
  if (!errorMessage || !payload) return null;
  const msgLower = String(errorMessage).toLowerCase();

  for (const key of Object.keys(payload)) {
    const keyLower = key.toLowerCase();
    if (
      msgLower.includes(`'${keyLower}'`) ||
      msgLower.includes(`"${keyLower}"`) ||
      msgLower.includes(`.${keyLower}`) ||
      msgLower.includes(` ${keyLower} `) ||
      msgLower.includes(`column ${keyLower}`) ||
      msgLower.includes(`column "${keyLower}"`) ||
      msgLower.includes(`column '${keyLower}'`)
    ) {
      return key;
    }
  }

  const postgrestMatch = errorMessage.match(/find the ['"](.*?)['"] column/i) || errorMessage.match(/['"](.*?)['"] column/i) || errorMessage.match(/column ['"](.*?)['"]/i);
  if (postgrestMatch?.[1]) {
    const matchedKey = Object.keys(payload).find(k => k.toLowerCase() === postgrestMatch[1].toLowerCase());
    if (matchedKey) return matchedKey;
  }

  return null;
}

function sanitizeClientePayload(c: any): any {
  const cpfCnpj = c.cpf_cnpj ? String(c.cpf_cnpj).trim().substring(0, 20) : "";
  let codSankhya = c.codigo_sankhya ? String(c.codigo_sankhya).trim().substring(0, 20) : "";
  if (!codSankhya) {
    codSankhya = `IMP-${Date.now().toString(36).substring(0, 6).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;
  }

  const payload: any = {
    codigo_sankhya: codSankhya,
    tipo_pessoa: cleanTipoPessoa(c.tipo_pessoa, cpfCnpj, "F"),
    ativo: c.ativo !== false,
    razao_social: String(c.razao_social || "CLIENTE SEM NOME").toUpperCase().trim().substring(0, 250),
    nome_fantasia: c.nome_fantasia ? String(c.nome_fantasia).trim().substring(0, 250) : "",
    cpf_cnpj: cpfCnpj,
    inscricao_estadual: c.inscricao_estadual ? String(c.inscricao_estadual).trim().substring(0, 30) : "",
    endereco: c.endereco ? String(c.endereco).trim().substring(0, 250) : "",
    numero: c.numero ? String(c.numero).trim().substring(0, 20) : "",
    complemento: c.complemento ? String(c.complemento).trim().substring(0, 100) : "",
    bairro: c.bairro ? String(c.bairro).trim().substring(0, 100) : "",
    cidade: String(c.cidade || "DESCONHECIDA").toUpperCase().trim().substring(0, 100),
    uf: cleanUf(c.uf, "RO"),
    cep: c.cep ? String(c.cep).trim().substring(0, 10) : "",
    telefone: c.telefone ? String(c.telefone).trim().substring(0, 20) : "",
    celular: c.celular ? String(c.celular).trim().substring(0, 20) : "",
    email: c.email ? String(c.email).trim().substring(0, 100) : ""
  };

  if (c.observacao) {
    payload.observacao = String(c.observacao).trim().substring(0, 500);
  }

  return payload;
}

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
      const saved = localStorage.getItem("gst_clientes");
      if (saved) {
        try {
          let allData: Cliente[] = [];
          let hasMore = true;
          let start = 0;
          const step = 1000;

          while (hasMore) {
            const { data, error } = await supabase
              .from("clientes")
              .select("*")
              .order("razao_social")
              .range(start, start + step - 1);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
              allData = [...allData, ...data];
              start += step;
              if (data.length < step) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }
          if (allData.length > 0) {
            localStorage.setItem("gst_clientes", JSON.stringify(allData));
            return allData;
          }
        } catch (e) {
          console.warn("Supabase fetch clients error, using local data:", e);
        }
        return JSON.parse(saved);
      }

      try {
        let allData: Cliente[] = [];
        let hasMore = true;
        let start = 0;
        const step = 1000;

        while (hasMore) {
          const { data, error } = await supabase
            .from("clientes")
            .select("*")
            .order("razao_social")
            .range(start, start + step - 1);
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            start += step;
            if (data.length < step) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
        
        localStorage.setItem("gst_clientes", JSON.stringify(allData));
        return allData;
      } catch (err) {
        console.warn("Falling back to simulated clients...", err);
        const initial: Cliente[] = [
          {
            id: 1,
            codigo_sankhya: '1',
            razao_social: 'DANIEL TRATORES AGRICOLA LTDA',
            nome_fantasia: 'DANIEL TRATORES AGRICOLA',
            cpf_cnpj: '11.994.044/0001-09',
            inscricao_estadual: '3067351',
            tipo_pessoa: 'J',
            ativo: true,
            cep: '76877225',
            endereco: 'BR-364',
            numero: '3949',
            complemento: '',
            bairro: 'INDUSTRIAL JAMARI',
            cidade: 'ARIQUEMES',
            uf: 'RO',
            telefone: '(069) 3535-4633',
            celular: '',
            email: 'contato@dtagricola.com.br'
          }
        ];
        localStorage.setItem("gst_clientes", JSON.stringify(initial));
        return initial;
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
        console.warn("ERRO SUPABASE BUSCAR CLIENTE, using local storage:", err);
        const list = await this.listar();
        return list.find(c => c.id === id) || null;
      }
    },

    async inserir(cliente: Cliente): Promise<Cliente> {
      const list = await this.listar();
      const newId = list.reduce((max, c) => Math.max(max, c.id || 0), 0) + 1;
      const payload = sanitizeClientePayload(cliente);
      const newCliente = { ...payload, id: newId };
      const updatedList = [...list, newCliente];
      localStorage.setItem("gst_clientes", JSON.stringify(updatedList));

      try {
        const { data, error } = await supabase
          .from("clientes")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          const freshList = updatedList.map(c => c.id === newId ? data : c);
          localStorage.setItem("gst_clientes", JSON.stringify(freshList));
          return data;
        }
      } catch (err) {
        console.warn("ERRO SUPABASE INSERT CLIENTE (saving locally only):", err);
      }
      return newCliente;
    },

    async atualizar(id: number, cliente: Cliente): Promise<Cliente> {
      const list = await this.listar();
      const payload = sanitizeClientePayload({ ...cliente, id });
      const updatedList = list.map(c => c.id === id ? { ...c, ...payload } : c);
      localStorage.setItem("gst_clientes", JSON.stringify(updatedList));

      try {
        const { data, error } = await supabase
          .from("clientes")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          const freshList = updatedList.map(c => c.id === id ? data : c);
          localStorage.setItem("gst_clientes", JSON.stringify(freshList));
          return data;
        }
      } catch (err) {
        console.warn("ERRO SUPABASE UPDATE CLIENTE (saving locally only):", err);
      }
      return { ...cliente, id, ...payload };
    },

    async excluir(id: number): Promise<boolean> {
      const list = await this.listar();
      const filtered = list.filter(c => c.id !== id);
      localStorage.setItem("gst_clientes", JSON.stringify(filtered));

      try {
        const { error } = await supabase
          .from("clientes")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.warn("ERRO SUPABASE EXCLUIR CLIENTE (saving locally only):", err);
        return true;
      }
    },

    async excluirTodos(): Promise<boolean> {
      localStorage.setItem("gst_clientes", JSON.stringify([]));
      try {
        const { error } = await supabase
          .from("clientes")
          .delete()
          .neq("id", -999999);
        if (error) throw error;
        return true;
      } catch (err) {
        console.warn("ERRO SUPABASE EXCLUIR TODOS CLIENTES (saving locally only):", err);
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
        console.warn("ERRO SUPABASE BUSCAR_CODIGO CLIENTE, using local storage:", err);
        const list = await this.listar();
        return list.find(c => String(c.codigo_sankhya) === String(codigo)) || null;
      }
    },

    async salvar(cliente: Cliente): Promise<Cliente> {
      if (cliente.id) {
        return await this.atualizar(cliente.id, cliente);
      }
      return await this.inserir(cliente);
    }
  },

  implementos: {
    async listar(): Promise<Implemento[]> {
      try {
        let rawData: any[] = [];
        let relationError = false;

        // Try to fetch with relation join first
        let allDataWithRelation: any[] = [];
        let hasMoreWithRelation = true;
        let startRel = 0;
        const step = 1000;

        while (hasMoreWithRelation) {
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
            `)
            .range(startRel, startRel + step - 1);
          
          try {
            query = query.order("id", { ascending: false });
          } catch (e) {
            console.warn("Could not order by id, continuing...");
          }

          const { data, error } = await query;

          if (error) {
            if (error.code === "PGRST200" || error.message?.includes("relationship") || error.message?.includes("foreign key")) {
              relationError = true;
              hasMoreWithRelation = false;
              allDataWithRelation = [];
            } else {
              throw error;
            }
          } else {
            if (data && data.length > 0) {
              allDataWithRelation = [...allDataWithRelation, ...data];
              startRel += step;
              if (data.length < step) {
                hasMoreWithRelation = false;
              }
            } else {
              hasMoreWithRelation = false;
            }
          }
        }
        
        if (!relationError) {
          rawData = allDataWithRelation;
        }

        if (relationError) {
          // Fetch implementos separately with pagination
          let allImpls: any[] = [];
          let hasMoreImpls = true;
          let startImpl = 0;
          
          while (hasMoreImpls) {
            const { data: impls, error: implsErr } = await supabase
              .from("implementos")
              .select("*")
              .order("id", { ascending: false })
              .range(startImpl, startImpl + step - 1);
              
            if (implsErr) throw implsErr;
            
            if (impls && impls.length > 0) {
              allImpls = [...allImpls, ...impls];
              startImpl += step;
              if (impls.length < step) {
                hasMoreImpls = false;
              }
            } else {
              hasMoreImpls = false;
            }
          }

          // Fetch all clients to map in-memory
          const clientsList = await this.clientes?.listar() || [];
          
          const clisMap = new Map<number, any>();
          clientsList.forEach(c => clisMap.set(c.id!, c));

          rawData = allImpls.map((impl: any) => ({
            ...impl,
            clientes: impl.cliente_id ? clisMap.get(impl.cliente_id) : undefined
          }));
        }

        // Merge plano_id & localizacao from local mapping if it exists in case DB is missing the column
        const plansMapping = localStorage.getItem("gst_implemento_planos");
        const mapping = plansMapping ? JSON.parse(plansMapping) : {};
        const locMappingStr = localStorage.getItem("gst_implemento_localizacao");
        const locMapping = locMappingStr ? JSON.parse(locMappingStr) : {};
        const mergedWithPlans = rawData.map((impl: any) => {
          const rawLoc = (impl.localizacao && String(impl.localizacao).trim().toUpperCase() !== "EMPTY") ? String(impl.localizacao).trim() : "";
          return {
            ...impl,
            plano_id: impl.plano_id || mapping[impl.id] || "",
            localizacao: rawLoc || locMapping[impl.id] || ""
          };
        });

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
        const locMappingStr = localStorage.getItem("gst_implemento_localizacao");
        const locMapping = locMappingStr ? JSON.parse(locMappingStr) : {};
        const rawLoc = (rawData.localizacao && String(rawData.localizacao).trim().toUpperCase() !== "EMPTY") ? String(rawData.localizacao).trim() : "";
        return {
          ...rawData,
          plano_id: rawData.plano_id || mapping[id] || "",
          localizacao: rawLoc || locMapping[id] || ""
        };
      } catch (err) {
        const list = await this.listar();
        return list.find(i => i.id === id) || null;
      }
    },

    async inserir(implemento: Implemento): Promise<Implemento> {
      try {
        const { clientes, id, ...rawPayload } = implemento;
        const cleanPayload: any = { ...rawPayload };
        if (cleanPayload.cliente_id !== undefined && cleanPayload.cliente_id !== null && cleanPayload.cliente_id !== "") {
          cleanPayload.cliente_id = Number(cleanPayload.cliente_id);
          if (isNaN(cleanPayload.cliente_id)) {
            delete cleanPayload.cliente_id;
          }
        } else {
          delete cleanPayload.cliente_id;
        }

        if (!cleanPayload.plano_id) {
          delete cleanPayload.plano_id;
        }

        const locVal = cleanPayload.localizacao;
        const planoVal = cleanPayload.plano_id;

        let dbPayload = { ...cleanPayload };
        let data: any = null;
        let attempt = 0;

        while (attempt < 5) {
          const res = await supabase
            .from("implementos")
            .insert(dbPayload)
            .select()
            .single();

          if (res.error) {
            const colName = extractMissingColumn(res.error.message || "", dbPayload);
            if (colName && colName in dbPayload) {
              console.warn(`Column '${colName}' not in implementos DB. Removing...`);
              delete (dbPayload as any)[colName];
              attempt++;
              continue;
            } else if (res.error.code === "42703") {
              // Try removing plano_id or localizacao if error contains them
              if (res.error.message?.includes("plano_id")) delete dbPayload.plano_id;
              if (res.error.message?.includes("localizacao")) delete dbPayload.localizacao;
              attempt++;
              continue;
            }
            throw res.error;
          }
          data = res.data;
          break;
        }

        if (!data) {
          data = { ...cleanPayload, id: Date.now() };
        }

        if (planoVal) {
          const plansMapping = localStorage.getItem("gst_implemento_planos");
          const mapping = plansMapping ? JSON.parse(plansMapping) : {};
          mapping[data.id] = planoVal;
          localStorage.setItem("gst_implemento_planos", JSON.stringify(mapping));
        }

        if (locVal) {
          const locMappingStr = localStorage.getItem("gst_implemento_localizacao");
          const locMapping = locMappingStr ? JSON.parse(locMappingStr) : {};
          locMapping[data.id] = locVal;
          localStorage.setItem("gst_implemento_localizacao", JSON.stringify(locMapping));
        }

        return { ...data, plano_id: planoVal || data.plano_id, localizacao: locVal || data.localizacao };
      } catch (err) {
        console.error("ERRO SUPABASE INSERT IMPLEMENTO:", err);
        throw err;
      }
    },

    async atualizar(id: number, implemento: Implemento): Promise<Implemento> {
      try {
        const { clientes, id: _, ...rawPayload } = implemento;
        const cleanPayload: any = { ...rawPayload };
        if (cleanPayload.cliente_id !== undefined && cleanPayload.cliente_id !== null && cleanPayload.cliente_id !== "") {
          cleanPayload.cliente_id = Number(cleanPayload.cliente_id);
          if (isNaN(cleanPayload.cliente_id)) {
            delete cleanPayload.cliente_id;
          }
        } else {
          delete cleanPayload.cliente_id;
        }

        if (!cleanPayload.plano_id) {
          delete cleanPayload.plano_id;
        }

        const locVal = cleanPayload.localizacao;
        const planoVal = cleanPayload.plano_id;

        const validCols = [
          "cliente_id", "categoria", "modelo", "numero_serie", "ano",
          "horimetro_atual", "localizacao", "data_entrega", "ativo",
          "observacao", "plano_id", "codigo_sankhya", "fabricante"
        ];
        let dbPayload: any = {};
        for (const col of validCols) {
          if (col in cleanPayload && cleanPayload[col] !== undefined) {
            dbPayload[col] = cleanPayload[col];
          }
        }

        let data: any = null;
        let attempt = 0;

        while (attempt < 5) {
          const res = await supabase
            .from("implementos")
            .update(dbPayload)
            .eq("id", id)
            .select()
            .single();

          if (res.error) {
            const colName = extractMissingColumn(res.error.message || "", dbPayload);
            if (colName && colName in dbPayload) {
              console.warn(`Column '${colName}' not in implementos DB. Removing...`);
              delete (dbPayload as any)[colName];
              attempt++;
              continue;
            }
            throw res.error;
          }
          data = res.data;
          break;
        }

        if (!data) {
          data = { ...cleanPayload, id };
        }

        const plansMapping = localStorage.getItem("gst_implemento_planos");
        const mapping = plansMapping ? JSON.parse(plansMapping) : {};
        if (planoVal) {
          mapping[id] = planoVal;
        } else {
          delete mapping[id];
        }
        localStorage.setItem("gst_implemento_planos", JSON.stringify(mapping));

        const locMappingStr = localStorage.getItem("gst_implemento_localizacao");
        const locMapping = locMappingStr ? JSON.parse(locMappingStr) : {};
        if (locVal) {
          locMapping[id] = locVal;
        } else {
          delete locMapping[id];
        }
        localStorage.setItem("gst_implemento_localizacao", JSON.stringify(locMapping));

        return { ...data, plano_id: planoVal || data.plano_id, localizacao: locVal || data.localizacao };
      } catch (err) {
        console.error("ERRO SUPABASE UPDATE IMPLEMENTO:", err);
        throw err;
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
    },

    async excluirTodos(): Promise<boolean> {
      try {
        // Fetch all implementos IDs first
        const { data: allImps, error: fetchErr } = await supabase
          .from("implementos")
          .select("id");
        
        if (fetchErr) {
          console.error("Error fetching implementos for deletion:", fetchErr);
        }

        if (allImps && allImps.length > 0) {
          const ids = allImps.map(i => i.id);

          // Nullify references in ordens_servico
          await supabase
            .from("ordens_servico")
            .update({ implemento_id: null })
            .in("implemento_id", ids);

          // Delete implementos by ID list
          const { error: delErr } = await supabase
            .from("implementos")
            .delete()
            .in("id", ids);

          if (delErr) {
            console.error("Error deleting implementos by id list:", delErr);
            throw delErr;
          }
        }

        // Also fallback delete all just in case
        const { error: finalErr } = await supabase.from("implementos").delete().neq("id", -999999);
        if (finalErr) {
          console.error("Error final delete:", finalErr);
          throw finalErr;
        }

        localStorage.removeItem("gst_implementos");
        return true;
      } catch (err) {
        console.error("Error clearing implementos:", err);
        throw err;
      }
    },

    async salvar(implemento: Implemento): Promise<Implemento> {
      if (implemento.id) {
        return await this.atualizar(implemento.id, implemento);
      }
      return await this.inserir(implemento);
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
        const { id, ...cleanTecnico } = tecnico as any;
        const { data, error } = await supabase
          .from("tecnicos")
          .insert(cleanTecnico)
          .select()
          .single();
        
        if (error) {
          if (error.code === "42703" || error.message?.includes("comissao")) {
            const { comissao_tecnico, comissao_auxiliar, id: _, ...dbPayload } = tecnico as any;
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
        const { id: _, ...cleanTecnico } = tecnico as any;
        const { data, error } = await supabase
          .from("tecnicos")
          .update(cleanTecnico)
          .eq("id", id)
          .select()
          .single();
        
        if (error) {
          if (error.code === "42703" || error.message?.includes("comissao")) {
            const { comissao_tecnico, comissao_auxiliar, id: __, ...dbPayload } = tecnico as any;
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
    },

    async salvar(tecnico: Tecnico): Promise<Tecnico> {
      if (tecnico.id) {
        return await this.atualizar(tecnico.id, tecnico);
      }
      return await this.inserir(tecnico);
    }
  },

  get ordens() {
    return this.ordensServico;
  },

  ordensServico: {
    async listar(): Promise<OrdemServico[]> {
      try {
        let allDataWithClientes: any[] = [];
        let hasMore = true;
        let startRel = 0;
        const step = 1000;

        const implementosPromise = API.implementos.listar().catch(() => []);

        while (hasMore) {
          const { data, error } = await supabase
            .from("ordens_servico")
            .select(`
              *,
              clientes (id, razao_social, cidade, uf)
            `)
            .order("id", { ascending: false })
            .range(startRel, startRel + step - 1);
          
          if (error) throw error;

          if (data && data.length > 0) {
            allDataWithClientes = [...allDataWithClientes, ...data];
            startRel += step;
            if (data.length < step) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }

        const implements_data = await implementosPromise;
        const implementosMap = new Map((implements_data || []).map(i => [i.id, i]));

        const finalData = allDataWithClientes.map(o => ({
          ...o,
          implementos: o.implementos || implementosMap.get(o.implemento_id)
        }));

        const osLocMapStr = localStorage.getItem("gst_os_localizacao");
        const osLocMap = osLocMapStr ? JSON.parse(osLocMapStr) : {};

        const fetchedData = (finalData || []).map(o => {
          const horimetroVal = (() => {
            if (o.horimetro_final !== undefined && o.horimetro_final !== null && o.horimetro_final !== "") return Number(o.horimetro_final);
            if (o.horimetro !== undefined && o.horimetro !== null && o.horimetro !== "") return Number(o.horimetro);
            const match = String(o.observacao || o.obs || "").match(/\[Horímetro:\s*(\d+(?:\.\d+)?)h?\]/i);
            return match ? Number(match[1]) : undefined;
          })();

          const locMaquinaVal = (() => {
            if (o.localizacao_maquina) return o.localizacao_maquina;
            if (o.localizacao) return o.localizacao;
            if (osLocMap[o.id]) return osLocMap[o.id];
            const match = String(o.observacao || o.obs || "").match(/\[Localização:\s*([^\]]+)\]/i);
            return match ? match[1].trim() : undefined;
          })();

          const os: any = {
            ...o,
            reclamacao: o.reclamacao || o.problema || o.problema_relatado || "",
            servico_executado: o.servico_executado || o.servico || o.laudo || "",
            observacao: o.observacao || o.obs || "",
            horimetro_final: horimetroVal,
            localizacao_maquina: locMaquinaVal,
            km_rodado_total: o.km_rodado_total || o.km_rodado || 0,
            numero_os: (o.numero_os === "EMPTY" || !o.numero_os || o.numero_os === "NOVA") ? null : o.numero_os
          };
          
          if (!os.numero_os) {
            os.numero_os = `OS-TMP-${os.id}`;
          }
          
          return os as OrdemServico;
        });

        // Merge local storage fallback items so local OS entries like OS 0005 are not lost on refresh
        let combinedData = [...fetchedData];
        try {
          const savedLocalStr = localStorage.getItem("gst_ordens_servico");
          if (savedLocalStr) {
            const savedLocal: OrdemServico[] = JSON.parse(savedLocalStr);
            const fetchedIds = new Set(fetchedData.map(o => String(o.id)));
            const fetchedNumeros = new Set(fetchedData.map(o => o.numero_os ? String(o.numero_os).trim() : "").filter(Boolean));

            const localOnlyItems = savedLocal.filter(loc => {
              if (!loc || !loc.id) return false;
              if (fetchedIds.has(String(loc.id))) return false;
              if (loc.numero_os && fetchedNumeros.has(String(loc.numero_os).trim())) return false;
              return true;
            });

            combinedData = [...fetchedData, ...localOnlyItems];
          }
        } catch (e) {
          console.error("Error merging local items in listar():", e);
        }

        localStorage.setItem("gst_ordens_servico", JSON.stringify(combinedData));
        return combinedData;
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
        const { data, error } = await supabase
          .from("ordens_servico")
          .select(`
            *,
            clientes (*)
          `)
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        let impData = undefined;
        if (data.implemento_id) {
          const { data: imp } = await supabase
            .from("implementos")
            .select("*")
            .eq("id", data.implemento_id)
            .maybeSingle();
          if (imp) impData = imp;
        }

        const rawData = {
          ...data,
          implementos: impData
        };

        const horimetroVal = (() => {
          if (rawData.horimetro_final !== undefined && rawData.horimetro_final !== null && rawData.horimetro_final !== "") return Number(rawData.horimetro_final);
          if (rawData.horimetro !== undefined && rawData.horimetro !== null && rawData.horimetro !== "") return Number(rawData.horimetro);
          const match = String(rawData.observacao || rawData.obs || "").match(/\[Horímetro:\s*(\d+(?:\.\d+)?)h?\]/i);
          return match ? Number(match[1]) : undefined;
        })();

        const osLocMapStr = localStorage.getItem("gst_os_localizacao");
        const osLocMap = osLocMapStr ? JSON.parse(osLocMapStr) : {};
        const locMaquinaVal = (() => {
          if (rawData.localizacao_maquina) return rawData.localizacao_maquina;
          if (rawData.localizacao) return rawData.localizacao;
          if (osLocMap[rawData.id]) return osLocMap[rawData.id];
          const match = String(rawData.observacao || rawData.obs || "").match(/\[Localização:\s*([^\]]+)\]/i);
          return match ? match[1].trim() : undefined;
        })();

        return {
          ...rawData,
          reclamacao: rawData.reclamacao || rawData.problema || rawData.problema_relatado || "",
          servico_executado: rawData.servico_executado || rawData.servico || rawData.laudo || "",
          observacao: rawData.observacao || rawData.obs || "",
          horimetro_final: horimetroVal,
          localizacao_maquina: locMaquinaVal,
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
        "comissao_custom_opcao", "comissao_custom_valor_tecnico", "comissao_custom_valor_auxiliar",
        "localizacao_maquina", "localizacao",
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
      if (cleanOS.horimetro_final !== undefined && cleanOS.horimetro_final !== null && String(cleanOS.horimetro_final) !== "") {
        payload.horimetro = cleanOS.horimetro_final;
        // Ensure horimetro tag is present in obs/observacao so Supabase saves it inside the text field
        const hTag = `[Horímetro: ${cleanOS.horimetro_final}h]`;
        if (!String(payload.obs || "").includes("[Horímetro:")) {
          payload.obs = `${payload.obs || ""} ${hTag}`.trim();
        }
        if (!String(payload.observacao || "").includes("[Horímetro:")) {
          payload.observacao = `${payload.observacao || ""} ${hTag}`.trim();
        }

        // Auto update implement horimetro_atual
        if (cleanOS.implemento_id) {
          API.implementos.buscar(cleanOS.implemento_id).then(imp => {
            if (imp) {
              const newH = Number(cleanOS.horimetro_final);
              if (newH > (Number(imp.horimetro_atual) || 0)) {
                API.implementos.atualizar(imp.id!, { ...imp, horimetro_atual: newH });
              }
            }
          }).catch(() => {});
        }
      }
      if (cleanOS.km_rodado_total && !payload.km_rodado) payload.km_rodado = cleanOS.km_rodado_total;
      
      const locValInserir = String(cleanOS.localizacao_maquina || (cleanOS as any).localizacao || "").trim();
      if (locValInserir) {
        payload.localizacao_maquina = locValInserir;
        payload.localizacao = locValInserir;
        const locTag = `[Localização: ${locValInserir}]`;
        if (!String(payload.obs || "").includes("[Localização:")) {
          payload.obs = `${payload.obs || ""} ${locTag}`.trim();
        } else {
          payload.obs = String(payload.obs).replace(/\[Localização:\s*[^\]]+\]/i, locTag);
        }
        if (!String(payload.observacao || "").includes("[Localização:")) {
          payload.observacao = `${payload.observacao || ""} ${locTag}`.trim();
        } else {
          payload.observacao = String(payload.observacao).replace(/\[Localização:\s*[^\]]+\]/i, locTag);
        }

        // Auto update implement localizacao & horimetro_atual directly in Supabase
        if (cleanOS.implemento_id) {
          const impLocToSave = String(cleanOS.localizacao_maquina || (cleanOS as any).localizacao || "").trim();
          const impHToSave = cleanOS.horimetro_final !== undefined && cleanOS.horimetro_final !== null && String(cleanOS.horimetro_final) !== "" ? Number(cleanOS.horimetro_final) : undefined;
          const impUpdatePayload: any = {};
          if (impLocToSave && impLocToSave.toUpperCase() !== "EMPTY") {
            impUpdatePayload.localizacao = impLocToSave;
          }
          if (impHToSave !== undefined && !isNaN(impHToSave) && impHToSave > 0) {
            impUpdatePayload.horimetro_atual = impHToSave;
          }

          if (Object.keys(impUpdatePayload).length > 0) {
            (async () => {
              try {
                await supabase
                  .from("implementos")
                  .update(impUpdatePayload)
                  .eq("id", Number(cleanOS.implemento_id));
                if (impUpdatePayload.localizacao) {
                  const locMappingStr = localStorage.getItem("gst_implemento_localizacao");
                  const locMapping = locMappingStr ? JSON.parse(locMappingStr) : {};
                  locMapping[cleanOS.implemento_id] = impUpdatePayload.localizacao;
                  localStorage.setItem("gst_implemento_localizacao", JSON.stringify(locMapping));
                }
              } catch (err) {
                console.warn("Failed to sync implemento location/horimetro:", err);
              }
            })();
          }
        }
      }

      // Sanitize time fields: if empty string, set to null to avoid DB errors
      if (payload.hora_inicial === "") payload.hora_inicial = null;
      if (payload.hora_final === "") payload.hora_final = null;
      
      // General sanitization: convert all empty strings and NaN values to null for DB consistency
      for (const key in payload) {
        if (payload[key] === "" || (typeof payload[key] === "number" && isNaN(payload[key]))) {
          payload[key] = null;
        }
      }
      
      if (payload.hora_inicial !== undefined && payload.hora_inicial !== null) payload.hora_inicial = cleanTimeVal(payload.hora_inicial);
      if (payload.hora_final !== undefined && payload.hora_final !== null) payload.hora_final = cleanTimeVal(payload.hora_final);
      if (payload.numero_os) payload.numero_os = String(payload.numero_os).substring(0, 20);
      if (payload.status) payload.status = String(payload.status).substring(0, 30);
      if (payload.prioridade) payload.prioridade = String(payload.prioridade).substring(0, 20);
      if (payload.tipo_atendimento) payload.tipo_atendimento = String(payload.tipo_atendimento).substring(0, 50);

      // Default data_abertura if missing
      if (!payload.data_abertura) payload.data_abertura = new Date().toISOString();

      let attempt = 0;
      while (attempt < 15) {
        try {
          const { data, error } = await supabase
            .from("ordens_servico")
            .insert(payload)
            .select();
            
          if (error) {
            const colName = extractMissingColumn(error.message || error.details || error.hint || "", payload);
            if (colName && colName in payload) {
              console.warn(`Column '${colName}' not in DB. Removing...`);
              delete (payload as any)[colName];
              attempt++;
              continue;
            }
            throw error;
          }
          
          if (data && data[0]) {
            if (cleanOS.localizacao_maquina) {
              const osLocMapStr = localStorage.getItem("gst_os_localizacao");
              const osLocMap = osLocMapStr ? JSON.parse(osLocMapStr) : {};
              osLocMap[data[0].id] = cleanOS.localizacao_maquina.trim();
              localStorage.setItem("gst_os_localizacao", JSON.stringify(osLocMap));
            }
            return await this.buscar(data[0].id) || data[0];
          }
          break;
        } catch (err) {
          console.error("Insert failed details:", JSON.stringify(err, null, 2));
          break;
        }
      }
      
      // Fallback local storage insert
      try {
        const saved = localStorage.getItem("gst_ordens_servico");
        const list: OrdemServico[] = saved ? JSON.parse(saved) : [];
        const nextId = Math.max(0, ...list.map(o => Number(o.id) || 0)) + 1;
        const result = { ...os, id: os.id || nextId };
        localStorage.setItem("gst_ordens_servico", JSON.stringify([result, ...list.filter(o => o.id !== result.id)]));
        return result;
      } catch (e) {
        return { ...os, id: os.id || Date.now() };
      }
    },

    async atualizar(id: number, os: OrdemServico): Promise<OrdemServico> {
      if (!os.numero_os || os.numero_os.trim() === "" || os.numero_os === "EMPTY" || os.numero_os === "NOVA" || os.numero_os.startsWith("OS-TMP-")) {
        try {
          const list = await this.listar();
          const lastNum = list.reduce((max, item) => {
            const match = item.numero_os?.match(/OS(\d+)/);
            return match ? Math.max(max, parseInt(match[1])) : max;
          }, 0);
          os.numero_os = "OS" + String(lastNum + 1).padStart(6, "0");
        } catch (e) {
          os.numero_os = `OS${String(id).padStart(6, "0")}`;
        }
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
        "comissao_custom_opcao", "comissao_custom_valor_tecnico", "comissao_custom_valor_auxiliar",
        "localizacao_maquina", "localizacao",
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
      if (cleanOS.horimetro_final !== undefined && cleanOS.horimetro_final !== null && String(cleanOS.horimetro_final) !== "") {
        payload.horimetro = cleanOS.horimetro_final;
        // Ensure horimetro tag is present in obs/observacao so Supabase saves it inside the text field
        const hTag = `[Horímetro: ${cleanOS.horimetro_final}h]`;
        if (!String(payload.obs || "").includes("[Horímetro:")) {
          payload.obs = `${payload.obs || ""} ${hTag}`.trim();
        }
        if (!String(payload.observacao || "").includes("[Horímetro:")) {
          payload.observacao = `${payload.observacao || ""} ${hTag}`.trim();
        }

        // Auto update implement horimetro_atual
        if (cleanOS.implemento_id) {
          API.implementos.buscar(cleanOS.implemento_id).then(imp => {
            if (imp) {
              const newH = Number(cleanOS.horimetro_final);
              if (newH > (Number(imp.horimetro_atual) || 0)) {
                API.implementos.atualizar(imp.id!, { ...imp, horimetro_atual: newH });
              }
            }
          }).catch(() => {});
        }
      }
      if (cleanOS.km_rodado_total && !payload.km_rodado) payload.km_rodado = cleanOS.km_rodado_total;
      
      const locValAtualizar = String(cleanOS.localizacao_maquina || (cleanOS as any).localizacao || "").trim();
      if (locValAtualizar) {
        payload.localizacao_maquina = locValAtualizar;
        payload.localizacao = locValAtualizar;
        const locTag = `[Localização: ${locValAtualizar}]`;
        if (!String(payload.obs || "").includes("[Localização:")) {
          payload.obs = `${payload.obs || ""} ${locTag}`.trim();
        } else {
          payload.obs = String(payload.obs).replace(/\[Localização:\s*[^\]]+\]/i, locTag);
        }
        if (!String(payload.observacao || "").includes("[Localização:")) {
          payload.observacao = `${payload.observacao || ""} ${locTag}`.trim();
        } else {
          payload.observacao = String(payload.observacao).replace(/\[Localização:\s*[^\]]+\]/i, locTag);
        }

        const osLocMapStr = localStorage.getItem("gst_os_localizacao");
        const osLocMap = osLocMapStr ? JSON.parse(osLocMapStr) : {};
        osLocMap[id] = locValAtualizar;
        localStorage.setItem("gst_os_localizacao", JSON.stringify(osLocMap));

        // Auto update implement localizacao & horimetro_atual directly in Supabase
        if (cleanOS.implemento_id) {
          const impLocToSave = String(cleanOS.localizacao_maquina || (cleanOS as any).localizacao || "").trim();
          const impHToSave = cleanOS.horimetro_final !== undefined && cleanOS.horimetro_final !== null && String(cleanOS.horimetro_final) !== "" ? Number(cleanOS.horimetro_final) : undefined;
          const impUpdatePayload: any = {};
          if (impLocToSave && impLocToSave.toUpperCase() !== "EMPTY") {
            impUpdatePayload.localizacao = impLocToSave;
          }
          if (impHToSave !== undefined && !isNaN(impHToSave) && impHToSave > 0) {
            impUpdatePayload.horimetro_atual = impHToSave;
          }

          if (Object.keys(impUpdatePayload).length > 0) {
            (async () => {
              try {
                await supabase
                  .from("implementos")
                  .update(impUpdatePayload)
                  .eq("id", Number(cleanOS.implemento_id));
                if (impUpdatePayload.localizacao) {
                  const locMappingStr = localStorage.getItem("gst_implemento_localizacao");
                  const locMapping = locMappingStr ? JSON.parse(locMappingStr) : {};
                  locMapping[cleanOS.implemento_id] = impUpdatePayload.localizacao;
                  localStorage.setItem("gst_implemento_localizacao", JSON.stringify(locMapping));
                }
              } catch (err) {
                console.warn("Failed to sync implemento location/horimetro:", err);
              }
            })();
          }
        }
      }

      // Sanitize time fields: if empty string, set to null to avoid DB errors
      if (payload.hora_inicial === "") payload.hora_inicial = null;
      if (payload.hora_final === "") payload.hora_final = null;

      // General sanitization: convert all empty strings and NaN values to null for DB consistency
      for (const key in payload) {
        if (payload[key] === "" || (typeof payload[key] === "number" && isNaN(payload[key]))) {
          payload[key] = null;
        }
      }
      
      let attempt = 0;
      while (attempt < 15) {
        try {
          let { data, error } = await supabase
            .from("ordens_servico")
            .update(payload)
            .eq("id", id)
            .select();
            
          if (!error && (!data || data.length === 0) && os.numero_os) {
            const { data: numData, error: numErr } = await supabase
              .from("ordens_servico")
              .update(payload)
              .eq("numero_os", String(os.numero_os).trim())
              .select();
            if (!numErr && numData && numData.length > 0) {
              data = numData;
            }
          }

          if (error) {
            const colName = extractMissingColumn(error.message || error.details || error.hint || "", payload);
            if (colName && colName in payload) {
              console.warn(`Column '${colName}' not in DB. Removing...`);
              delete (payload as any)[colName];
              attempt++;
              continue;
            }
            throw error;
          }

          if (!data || data.length === 0) {
            // Row was not found in Supabase. Attempt insert with ID
            const insertPayload = { ...payload, id };
            const { data: insData, error: insErr } = await supabase
              .from("ordens_servico")
              .insert(insertPayload)
              .select();

            if (insErr) {
              const colName = extractMissingColumn(insErr.message || insErr.details || insErr.hint || "", insertPayload);
              if (colName && colName in insertPayload) {
                console.warn(`Column '${colName}' not in DB during insert fallback. Removing...`);
                delete (payload as any)[colName];
                delete (insertPayload as any)[colName];
                attempt++;
                continue;
              }
            }

            if (insData && insData[0]) {
              return await this.buscar(insData[0].id) || insData[0];
            }
          } else {
            return await this.buscar(data[0].id) || data[0];
          }
          break;
        } catch (err) {
          console.error("Update failed details:", JSON.stringify(err, null, 2));
          break;
        }
      }
      
      // Sync local storage fallback safely
      try {
        const saved = localStorage.getItem("gst_ordens_servico");
        const list: OrdemServico[] = saved ? JSON.parse(saved) : [];
        const index = list.findIndex(o => Number(o.id) === Number(id));
        let updated: OrdemServico[];
        if (index >= 0) {
          updated = list.map(o => Number(o.id) === Number(id) ? { ...o, ...os, id } : o);
        } else {
          updated = [{ ...os, id }, ...list];
        }
        localStorage.setItem("gst_ordens_servico", JSON.stringify(updated));
      } catch (e) {
        console.error("Local storage fallback sync error:", e);
      }
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
      const localList: PlanoManutencao[] = saved ? JSON.parse(saved) : INITIAL_PLANOS;
      if (!saved) {
        localStorage.setItem("gst_planos", JSON.stringify(INITIAL_PLANOS));
      }

      const remotePromise = (async () => {
        try {
          const { data, error } = await supabase
            .from("planos_manutencao")
            .select("*")
            .order("id", { ascending: true });
          if (!error && data) {
            const mapped: PlanoManutencao[] = data.map((d: any) => ({
              id: d.id,
              fabricante: d.fabricante || "",
              modelo: d.modelo || "",
              garantia_meses: Number(d.garantia_meses || 12),
              horimetro_base: Number(d.horimetro_base || 50),
              ativo: d.ativo !== false,
              observacao: d.observacao || "",
              grupo: d.grupo || "TRATORES"
            }));
            localStorage.setItem("gst_planos", JSON.stringify(mapped));
            return mapped;
          }
        } catch (err) {
          console.warn("Could not fetch planos from Supabase:", err);
        }
        return localList;
      })();

      const result = [...localList];
      (result as any).then = remotePromise.then.bind(remotePromise);
      (result as any).catch = remotePromise.catch.bind(remotePromise);
      return result as any;
    },

    buscar(id: string): PlanoManutencao | null {
      const list = this.listar();
      return list.find(p => p.id === id) || null;
    },

    async salvar(plano: PlanoManutencao): Promise<PlanoManutencao> {
      const saved = localStorage.getItem("gst_planos");
      const list: PlanoManutencao[] = saved ? JSON.parse(saved) : INITIAL_PLANOS;
      let updatedList: PlanoManutencao[];
      let targetPlano = { ...plano };
      if (!plano.id) {
        const nextNum = list.reduce((max, p) => Math.max(max, parseInt(p.id.replace("PM", "")) || 0), 0) + 1;
        targetPlano.id = "PM" + String(nextNum).padStart(6, "0");
        updatedList = [...list, targetPlano];
      } else {
        updatedList = list.map(p => p.id === plano.id ? targetPlano : p);
      }
      localStorage.setItem("gst_planos", JSON.stringify(updatedList));

      try {
        const payload = {
          id: targetPlano.id,
          fabricante: targetPlano.fabricante,
          modelo: targetPlano.modelo,
          garantia_meses: targetPlano.garantia_meses,
          horimetro_base: targetPlano.horimetro_base,
          ativo: targetPlano.ativo,
          observacao: targetPlano.observacao || "",
          grupo: targetPlano.grupo || "TRATORES"
        };
        const { error } = await supabase
          .from("planos_manutencao")
          .upsert(payload);
        if (error) console.error("Error saving plano to Supabase:", error);
      } catch (err) {
        console.warn("Could not sync plano to Supabase:", err);
      }
      return targetPlano;
    },

    async excluir(id: string): Promise<boolean> {
      const saved = localStorage.getItem("gst_planos");
      const list: PlanoManutencao[] = saved ? JSON.parse(saved) : INITIAL_PLANOS;
      const filtered = list.filter(p => p.id !== id);
      localStorage.setItem("gst_planos", JSON.stringify(filtered));

      try {
        await supabase.from("revisoes_plano").delete().eq("id_plano", id);
        const { error } = await supabase.from("planos_manutencao").delete().eq("id", id);
        if (error) console.error("Error deleting plano from Supabase:", error);
      } catch (err) {
        console.warn("Could not delete plano from Supabase:", err);
      }
      return true;
    },

    revisoes: {
      listar(planoId: string): PlanoRevisao[] {
        const saved = localStorage.getItem("gst_revisoes");
        const list: PlanoRevisao[] = saved ? JSON.parse(saved) : INITIAL_REVISOES;
        if (!saved) {
          localStorage.setItem("gst_revisoes", JSON.stringify(INITIAL_REVISOES));
        }
        const filtered = list.filter(r => r.id_plano === planoId).sort((a, b) => a.revisao_numero - b.revisao_numero);

        const remotePromise = (async () => {
          try {
            const { data, error } = await supabase
              .from("revisoes_plano")
              .select("*")
              .eq("id_plano", planoId)
              .order("revisao_numero", { ascending: true });
            if (!error && data) {
              const mapped: PlanoRevisao[] = data.map((d: any) => ({
                id_revisao: d.id_revisao,
                id_plano: d.id_plano,
                revisao_numero: Number(d.revisao_numero),
                horas_limite: Number(d.horas_limite),
                meses_limite: Number(d.meses_limite),
                descricao: d.descricao || ""
              }));
              const freshSaved = localStorage.getItem("gst_revisoes");
              const allLocal: PlanoRevisao[] = freshSaved ? JSON.parse(freshSaved) : INITIAL_REVISOES;
              const others = allLocal.filter(r => r.id_plano !== planoId);
              localStorage.setItem("gst_revisoes", JSON.stringify([...others, ...mapped]));
              return mapped;
            }
          } catch (err) {
            console.warn("Could not fetch revisoes from Supabase:", err);
          }
          return filtered;
        })();

        const result = [...filtered];
        (result as any).then = remotePromise.then.bind(remotePromise);
        (result as any).catch = remotePromise.catch.bind(remotePromise);
        return result as any;
      },

      async salvar(revisao: PlanoRevisao): Promise<PlanoRevisao> {
        const saved = localStorage.getItem("gst_revisoes");
        const list: PlanoRevisao[] = saved ? JSON.parse(saved) : INITIAL_REVISOES;
        let updatedList: PlanoRevisao[];
        let targetRev = { ...revisao };
        if (!revisao.id_revisao) {
          const nextNum = list.reduce((max, r) => Math.max(max, parseInt(r.id_revisao?.replace("PR", "") || "0") || 0), 0) + 1;
          targetRev.id_revisao = "PR" + String(nextNum).padStart(6, "0");
          updatedList = [...list, targetRev];
        } else {
          updatedList = list.map(r => r.id_revisao === revisao.id_revisao ? targetRev : r);
        }
        localStorage.setItem("gst_revisoes", JSON.stringify(updatedList));

        try {
          const payload = {
            id_revisao: targetRev.id_revisao,
            id_plano: targetRev.id_plano,
            revisao_numero: targetRev.revisao_numero,
            horas_limite: targetRev.horas_limite,
            meses_limite: targetRev.meses_limite,
            descricao: targetRev.descricao || ""
          };
          const { error } = await supabase
            .from("revisoes_plano")
            .upsert(payload);
          if (error) console.error("Error saving revisao to Supabase:", error);
        } catch (err) {
          console.warn("Could not sync revisao to Supabase:", err);
        }
        return targetRev;
      },

      async excluir(id: string, planoId?: string, revisaoNum?: number): Promise<boolean> {
        const freshSaved = localStorage.getItem("gst_revisoes");
        const list: PlanoRevisao[] = freshSaved ? JSON.parse(freshSaved) : INITIAL_REVISOES;
        const filtered = list.filter(r => {
          if (id && r.id_revisao === id) return false;
          if (planoId && r.id_plano === planoId && r.revisao_numero === revisaoNum) return false;
          return true;
        });
        localStorage.setItem("gst_revisoes", JSON.stringify(filtered));

        try {
          if (id) {
            const { error: err1 } = await supabase.from("revisoes_plano").delete().eq("id_revisao", id);
            if (err1) console.error("Error deleting revisao by id from Supabase:", err1);
          }
          if (planoId && revisaoNum !== undefined) {
            const { error: err2 } = await supabase
              .from("revisoes_plano")
              .delete()
              .eq("id_plano", planoId)
              .eq("revisao_numero", revisaoNum);
            if (err2) console.error("Error deleting revisao by plano/num from Supabase:", err2);
          }
        } catch (err) {
          console.warn("Could not delete revisao from Supabase:", err);
        }
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
        const { id: _, ...vPayload } = veiculo as any;
        await supabase
          .from("veiculos")
          .insert(vPayload);
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
        const { id: _, ...vPayload } = veiculo as any;
        await supabase
          .from("veiculos")
          .update(vPayload)
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
        const { id: _, ...tPayload } = tipo as any;
        await supabase
          .from("tipos_atendimento")
          .insert(tPayload);
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
        const { id: _, ...tPayload } = tipo as any;
        await supabase
          .from("tipos_atendimento")
          .update(tPayload)
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
          localList = localList.filter((u: any) => u.id !== "usr_2" && u.id !== "usr_3" && u.usuario !== "amanda.faturamento" && u.usuario !== "marcos.mecanico");
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
          localStorage.setItem("gst_usuarios_v1", JSON.stringify(localList));
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
          })).filter(u => u.id !== "usr_2" && u.id !== "usr_3" && u.usuario !== "amanda.faturamento" && u.usuario !== "marcos.mecanico");
          
          const supabaseMap = new Map(supabaseParsed.map(u => [u.id, u]));
          const merged = [...supabaseParsed];
          for (const loc of localList) {
            if (loc.id === "usr_2" || loc.id === "usr_3") continue;
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
          const finalMerged = merged.filter(u => u.id !== "usr_2" && u.id !== "usr_3" && u.usuario !== "amanda.faturamento" && u.usuario !== "marcos.mecanico");
          localStorage.setItem("gst_usuarios_v1", JSON.stringify(finalMerged));
          return finalMerged;
        }
      } catch (e) {
        console.warn("Supabase fetch error, using local data:", e);
      }

      if (localList.length > 0) {
        const cleanedLocal = localList.filter(u => u.id !== "usr_2" && u.id !== "usr_3" && u.usuario !== "amanda.faturamento" && u.usuario !== "marcos.mecanico").map(u => ({
          ...u,
          ultimo_acesso: !u.ultimo_acesso || u.ultimo_acesso === "Nunca" ? "Hoje, 10:30" : u.ultimo_acesso
        }));
        localStorage.setItem("gst_usuarios_v1", JSON.stringify(cleanedLocal));
        return cleanedLocal;
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
  },

  chamadosGarantia: {
    async listar(): Promise<any[]> {
      try {
        const { data, error } = await supabase
          .from("chamados_garantia")
          .select("*")
          .order("id", { ascending: false });
        if (!error && data) {
          const mapped = data.map((d: any) => ({
            id: d.numero_chamado || String(d.id),
            db_id: d.id,
            tipo_objeto: d.tipo_objeto || "EQUIPAMENTO",
            implemento_id: d.implemento_id,
            cliente_id: d.cliente_id,
            codigo_peca: d.codigo_peca,
            descricao_peca: d.descricao_peca,
            fabricante_peca: d.fabricante_peca,
            nota_fiscal_peca: d.nota_fiscal_peca,
            solicitante: d.solicitante,
            tipo_problema: d.tipo_problema,
            descricao: d.descricao,
            parecer_tecnico: d.parecer_tecnico,
            horimetro: Number(d.horimetro || 0),
            status: d.status || "ABERTO",
            data_abertura: d.data_abertura || new Date().toISOString().split("T")[0],
            ordem_servico_id: d.ordem_servico_id
          }));
          localStorage.setItem("gst_chamados_garantia", JSON.stringify(mapped));
          return mapped;
        }
      } catch (err) {
        console.warn("Could not fetch chamados_garantia from Supabase, loading from localStorage:", err);
      }
      const saved = localStorage.getItem("gst_chamados_garantia");
      return saved ? JSON.parse(saved) : [];
    },

    async inserir(chamado: any): Promise<any> {
      const saved = localStorage.getItem("gst_chamados_garantia");
      const list = saved ? JSON.parse(saved) : [];
      const numChamado = chamado.id || `CG-${Math.floor(1000 + Math.random() * 9000)}`;
      const newChamado = { ...chamado, id: numChamado };
      const updatedList = [newChamado, ...list];
      localStorage.setItem("gst_chamados_garantia", JSON.stringify(updatedList));

      try {
        const payload = {
          numero_chamado: numChamado,
          tipo_objeto: chamado.tipo_objeto || "EQUIPAMENTO",
          implemento_id: chamado.implemento_id || null,
          cliente_id: chamado.cliente_id,
          codigo_peca: chamado.codigo_peca || null,
          descricao_peca: chamado.descricao_peca || null,
          fabricante_peca: chamado.fabricante_peca || null,
          nota_fiscal_peca: chamado.nota_fiscal_peca || null,
          solicitante: chamado.solicitante || "Solicitante",
          tipo_problema: chamado.tipo_problema || "MECANICO",
          descricao: chamado.descricao,
          parecer_tecnico: chamado.parecer_tecnico || null,
          horimetro: chamado.horimetro || 0,
          status: chamado.status || "ABERTO",
          data_abertura: chamado.data_abertura || new Date().toISOString().split("T")[0],
          ordem_servico_id: chamado.ordem_servico_id || null
        };
        await supabase.from("chamados_garantia").insert(payload);
      } catch (err) {
        console.warn("Could not sync insert of chamado to Supabase:", err);
      }
      return newChamado;
    },

    async atualizar(id: string, chamado: any): Promise<any> {
      const saved = localStorage.getItem("gst_chamados_garantia");
      const list = saved ? JSON.parse(saved) : [];
      const updatedList = list.map((c: any) => (c.id === id || c.numero_chamado === id || (c.db_id && String(c.db_id) === String(id))) ? { ...c, ...chamado } : c);
      localStorage.setItem("gst_chamados_garantia", JSON.stringify(updatedList));

      try {
        const payload: any = {
          tipo_objeto: chamado.tipo_objeto,
          implemento_id: chamado.implemento_id || null,
          cliente_id: chamado.cliente_id,
          codigo_peca: chamado.codigo_peca || null,
          descricao_peca: chamado.descricao_peca || null,
          fabricante_peca: chamado.fabricante_peca || null,
          nota_fiscal_peca: chamado.nota_fiscal_peca || null,
          solicitante: chamado.solicitante,
          tipo_problema: chamado.tipo_problema,
          descricao: chamado.descricao,
          parecer_tecnico: chamado.parecer_tecnico,
          horimetro: chamado.horimetro,
          status: chamado.status,
          ordem_servico_id: chamado.ordem_servico_id || null
        };
        if (chamado.db_id) {
          await supabase.from("chamados_garantia").update(payload).eq("id", chamado.db_id);
        } else {
          const { error } = await supabase.from("chamados_garantia").update(payload).eq("numero_chamado", id);
          if (error) {
            await supabase.from("chamados_garantia").update(payload).eq("id", id);
          }
        }
      } catch (err) {
        console.warn("Could not sync update of chamado to Supabase:", err);
      }
      return { ...chamado, id };
    },

    async excluir(id: string): Promise<boolean> {
      const saved = localStorage.getItem("gst_chamados_garantia");
      const list = saved ? JSON.parse(saved) : [];
      const filtered = list.filter((c: any) => c.id !== id);
      localStorage.setItem("gst_chamados_garantia", JSON.stringify(filtered));

      try {
        await supabase.from("chamados_garantia").delete().eq("numero_chamado", id);
      } catch (err) {
        console.warn("Could not sync delete of chamado to Supabase:", err);
      }
      return true;
    }
  },

  empresa: {
    async obter(): Promise<any> {
      try {
        const { data, error } = await supabase
          .from("empresa")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          const config = {
            id: data.id,
            nome: data.razao_social || data.nome || "",
            subtitulo: data.slogan || data.subtitulo || "",
            endereco: data.endereco || "",
            telefone: data.telefone || "",
            cnpj: data.cnpj || "",
            email: data.email || "",
            inscricao_estadual: data.inscricao_estadual || data.ie || "",
            logo: data.logo_url || data.logo || ""
          };
          localStorage.setItem("gst_company_config_v1", JSON.stringify(config));
          return config;
        }

        const { data: data2, error: err2 } = await supabase
          .from("empresa_config")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (!err2 && data2) {
          const config = {
            id: data2.id,
            nome: data2.nome || data2.razao_social || "",
            subtitulo: data2.subtitulo || data2.slogan || "",
            endereco: data2.endereco || "",
            telefone: data2.telefone || "",
            cnpj: data2.cnpj || "",
            email: data2.email || "",
            inscricao_estadual: data2.inscricao_estadual || data2.ie || "",
            logo: data2.logo || data2.logo_url || ""
          };
          localStorage.setItem("gst_company_config_v1", JSON.stringify(config));
          return config;
        }
      } catch (err) {
        console.warn("Could not load company config from Supabase:", err);
      }

      const saved = localStorage.getItem("gst_company_config_v1");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error parsing local company config:", e);
        }
      }
      return null;
    },

    async salvar(config: any): Promise<any> {
      localStorage.setItem("gst_company_config_v1", JSON.stringify(config));
      window.dispatchEvent(new Event("company_config_updated"));

      const payloadEmpresa: any = {
        razao_social: config.nome || "",
        slogan: config.subtitulo || "",
        cnpj: config.cnpj || "",
        inscricao_estadual: config.inscricao_estadual || "",
        endereco: config.endereco || "",
        telefone: config.telefone || "",
        email: config.email || "",
        logo_url: config.logo || "",
        updated_at: new Date().toISOString()
      };

      try {
        const { data: existing } = await supabase.from("empresa").select("id").limit(1).maybeSingle();

        if (existing?.id) {
          const { error: updateErr } = await supabase
            .from("empresa")
            .update(payloadEmpresa)
            .eq("id", existing.id);

          if (!updateErr) {
            config.id = existing.id;
            localStorage.setItem("gst_company_config_v1", JSON.stringify(config));
            return config;
          } else {
            console.warn("Error updating existing empresa row:", updateErr);
          }
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from("empresa")
            .insert([payloadEmpresa])
            .select()
            .single();

          if (!insertErr && inserted?.id) {
            config.id = inserted.id;
            localStorage.setItem("gst_company_config_v1", JSON.stringify(config));
            return config;
          } else {
            console.warn("Error inserting into empresa table:", insertErr);
          }
        }

        await supabase.from("empresa_config").upsert({
          id: config.id || 1,
          nome: config.nome,
          subtitulo: config.subtitulo,
          endereco: config.endereco,
          telefone: config.telefone,
          cnpj: config.cnpj,
          email: config.email,
          inscricao_estadual: config.inscricao_estadual,
          logo: config.logo
        }, { onConflict: "id" });

      } catch (err) {
        console.warn("Could not sync company config to Supabase:", err);
      }
      return config;
    }
  },

  centrosCusto: {
    async listar(): Promise<string[]> {
      try {
        const { data, error } = await supabase
          .from("centros_custo")
          .select("nome")
          .eq("ativo", true)
          .order("nome", { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((c: any) => c.nome);
        }
      } catch (err) {
        console.warn("Erro ao buscar centros de custo no Supabase:", err);
      }
      const saved = localStorage.getItem("gst_centros_custo");
      return saved ? JSON.parse(saved) : [];
    },

    async salvar(nome: string): Promise<boolean> {
      try {
        await supabase
          .from("centros_custo")
          .upsert({ nome: nome.trim(), ativo: true }, { onConflict: "nome" });
      } catch (err) {
        console.warn("Erro ao salvar centro de custo no Supabase:", err);
      }
      return true;
    },

    async sincronizar(centros: string[]): Promise<boolean> {
      try {
        const payload = centros.map(nome => ({ nome: nome.trim(), ativo: true }));
        await supabase.from("centros_custo").upsert(payload, { onConflict: "nome" });
        return true;
      } catch (err) {
        console.warn("Erro ao sincronizar centros de custo no Supabase:", err);
        return false;
      }
    },

    async excluir(nome: string): Promise<boolean> {
      try {
        await supabase.from("centros_custo").delete().eq("nome", nome);
      } catch (err) {
        console.warn("Erro ao excluir centro de custo no Supabase:", err);
      }
      return true;
    }
  },

  comissaoConfig: {
    async obter(): Promise<any> {
      try {
        const { data, error } = await supabase
          .from("comissao_config")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn("Erro ao obter comissao_config no Supabase:", err);
      }
      const saved = localStorage.getItem("gst_comissoes_config");
      return saved ? JSON.parse(saved) : null;
    },

    async salvar(configObj: any): Promise<any> {
      try {
        const { data: existing } = await supabase.from("comissao_config").select("id").limit(1).maybeSingle();
        
        const percentual = configObj.regraPadrao?.percentualTecnico ?? configObj.regraPadrao?.percentualPadrao ?? configObj.percentual_padrao ?? 20;
        const base = configObj.regraPadrao?.baseCalculo ?? configObj.regraPadrao?.baseCalculoPadrao ?? configObj.base_calculo ?? "faturamento_total";
        const modo = configObj.modo_calculo || configObj.modoCalculo || "REGRA_MAIS_ESPECIFICA";
        const status = configObj.status_os || configObj.statusOS || "CONCLUIDA";

        const payload = {
          modo_calculo: String(modo),
          percentual_padrao: Number(percentual),
          base_calculo: String(base),
          status_os: String(status),
          ativo: true,
          updated_at: new Date().toISOString()
        };

        if (existing?.id) {
          const { data, error } = await supabase.from("comissao_config").update(payload).eq("id", existing.id).select().single();
          if (!error && data) return data;
        } else {
          const { data, error } = await supabase.from("comissao_config").insert([payload]).select().single();
          if (!error && data) return data;
        }
      } catch (err) {
        console.warn("Erro ao salvar comissao_config no Supabase:", err);
      }
      return configObj;
    }
  },

  comissaoRegras: {
    async listar(): Promise<any[]> {
      try {
        const { data, error } = await supabase
          .from("comissao_regras")
          .select("*")
          .eq("ativo", true);

        if (!error && data && data.length > 0) {
          return data.map((item: any) => {
            let obs: any = {};
            if (item.observacao) {
              try { obs = JSON.parse(item.observacao); } catch (e) {}
            }
            return {
              tipo: item.tipo_atendimento,
              baseCalculo: item.base_calculo,
              valorTecnico: item.base_calculo === "fixo" ? Number(item.valor_fixo || 0) : Number(item.percentual || 0),
              valorHoraComissao: obs.valorHoraComissao,
              valorKmComissao: obs.valorKmComissao,
              regraAuxiliar: obs.regraAuxiliar || "racha_50_50",
              valorAuxiliar: obs.valorAuxiliar || 0
            };
          });
        }
      } catch (err) {
        console.warn("Erro ao listar comissao_regras no Supabase:", err);
      }
      return [];
    },

    async sincronizar(regras: any[]): Promise<boolean> {
      if (!regras || regras.length === 0) return true;
      try {
        for (const r of regras) {
          const payload = {
            tipo_atendimento: r.tipo,
            base_calculo: r.baseCalculo || "VALOR_TOTAL",
            relacao_aplicada: r.baseCalculo === "fixo" ? "VALOR_FIXO" : "PERCENTUAL",
            percentual: Number(r.valorTecnico || 0),
            valor_fixo: r.baseCalculo === "fixo" ? Number(r.valorTecnico || 0) : 0,
            observacao: JSON.stringify({
              valorHoraComissao: r.valorHoraComissao,
              valorKmComissao: r.valorKmComissao,
              regraAuxiliar: r.regraAuxiliar,
              valorAuxiliar: r.valorAuxiliar
            }),
            ativo: true,
            updated_at: new Date().toISOString()
          };

          const { data: existing } = await supabase
            .from("comissao_regras")
            .select("id")
            .eq("tipo_atendimento", r.tipo)
            .maybeSingle();

          if (existing?.id) {
            await supabase.from("comissao_regras").update(payload).eq("id", existing.id);
          } else {
            await supabase.from("comissao_regras").insert([payload]);
          }
        }
        return true;
      } catch (err) {
        console.warn("Erro ao sincronizar comissao_regras no Supabase:", err);
        return false;
      }
    }
  },

  comissaoMetas: {
    async listar(): Promise<any[]> {
      try {
        // Tenta buscar com o relacionamento JOIN com a tabela de técnicos
        const { data, error } = await supabase
          .from("comissao_metas")
          .select("*, tecnicos(id, nome, apelido)")
          .order("ano", { ascending: false })
          .order("mes", { ascending: false });

        if (!error && data) {
          return data;
        }

        // Se houver erro de relacionamento (ex: FK não configurada), tenta busca simples
        const { data: simpleData, error: simpleError } = await supabase
          .from("comissao_metas")
          .select("*")
          .order("ano", { ascending: false })
          .order("mes", { ascending: false });

        if (!simpleError && simpleData) {
          return simpleData;
        }

        if (error || simpleError) {
          console.warn("Aviso ao buscar comissao_metas no Supabase (tabela pode não ter sido criada ainda):", error || simpleError);
        }
      } catch (err) {
        console.warn("Exceção ao conectar com Supabase em comissao_metas:", err);
      }
      return [];
    },

    async salvar(meta: any): Promise<any> {
      try {
        const tecnicoIdVal = !isNaN(Number(meta.tecnico_id)) ? Number(meta.tecnico_id) : meta.tecnico_id;
        const payload: any = {
          tecnico_id: tecnicoIdVal,
          ano: Number(meta.ano),
          mes: Number(meta.mes),
          meta_faturamento: Number(meta.meta_faturamento || 0),
          meta_comissao: Number(meta.meta_comissao || 0),
          observacao: meta.observacao || "",
          ativo: meta.ativo !== false
        };

        if (meta.id && typeof meta.id === "number" && meta.id < 1000000000) {
          payload.id = meta.id;
        }

        const { data, error } = await supabase
          .from("comissao_metas")
          .upsert(payload, { onConflict: "tecnico_id,ano,mes" })
          .select()
          .single();

        if (error) {
          console.warn("Aviso ao salvar comissao_metas no Supabase:", error);
          throw error;
        }

        return data;
      } catch (err) {
        console.warn("Erro no salvar comissao_metas:", err);
        throw err;
      }
    },

    async excluir(id: number | string): Promise<boolean> {
      try {
        const { error } = await supabase.from("comissao_metas").delete().eq("id", id);
        if (error) {
          console.warn("Aviso ao excluir comissao_metas no Supabase:", error);
          throw error;
        }
        return true;
      } catch (err) {
        console.warn("Erro ao excluir comissao_metas:", err);
        throw err;
      }
    }
  },

  comissaoFaixas: {
    async listar(): Promise<any[]> {
      try {
        const { data, error } = await supabase
          .from("comissao_faixas")
          .select("*")
          .order("valor_inicial", { ascending: true });

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn("Erro ao listar comissao_faixas:", err);
      }
      const saved = localStorage.getItem("gst_comissao_faixas");
      return saved ? JSON.parse(saved) : [];
    },

    async salvar(faixa: any): Promise<any> {
      const saved = localStorage.getItem("gst_comissao_faixas");
      let list: any[] = saved ? JSON.parse(saved) : [];
      let itemToSave = { ...faixa, id: faixa.id || Date.now() };

      const existingIndex = list.findIndex((f: any) => String(f.id) === String(itemToSave.id));
      if (existingIndex >= 0) {
        list[existingIndex] = itemToSave;
      } else {
        list.push(itemToSave);
      }
      localStorage.setItem("gst_comissao_faixas", JSON.stringify(list));

      try {
        const payload: any = {
          nome: faixa.nome,
          valor_inicial: Number(faixa.valor_inicial || 0),
          valor_final: faixa.valor_final !== undefined && faixa.valor_final !== null && faixa.valor_final !== "" ? Number(faixa.valor_final) : null,
          percentual: Number(faixa.percentual || 0),
          bonus_fixo: Number(faixa.bonus_fixo || 0),
          ativo: faixa.ativo !== false
        };

        if (faixa.id && typeof faixa.id === "number" && faixa.id < 1000000000) {
          payload.id = faixa.id;
        }

        const { data, error } = await supabase
          .from("comissao_faixas")
          .upsert(payload)
          .select()
          .single();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn("Erro ao salvar comissao_faixas no Supabase, mantendo local:", err);
      }

      return itemToSave;
    },

    async excluir(id: number | string): Promise<boolean> {
      const saved = localStorage.getItem("gst_comissao_faixas");
      let list: any[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter((f: any) => String(f.id) !== String(id));
      localStorage.setItem("gst_comissao_faixas", JSON.stringify(filtered));

      try {
        await supabase.from("comissao_faixas").delete().eq("id", id);
      } catch (err) {
        console.warn("Erro ao deletar comissao_faixas no Supabase:", err);
      }
      return true;
    }
  },

  comissoes: {
    async listar(): Promise<any[]> {
      try {
        const { data, error } = await supabase
          .from("comissoes")
          .select("*")
          .order("data_comissao", { ascending: false });

        if (!error && data) {
          return data;
        }
        if (error) {
          console.warn("Aviso ao buscar comissoes no Supabase:", error);
        }
      } catch (err) {
        console.warn("Erro ao buscar comissoes no Supabase:", err);
      }
      return [];
    },

    async sincronizar(comissoesList: any[]): Promise<boolean> {
      if (!comissoesList || comissoesList.length === 0) return true;
      try {
        for (const item of comissoesList) {
          let dataComissao = item.data || new Date().toISOString().split("T")[0];
          if (dataComissao.includes("T")) {
            dataComissao = dataComissao.split("T")[0];
          }

          const payload: any = {
            os_id: item.os_id ? String(item.os_id) : null,
            os_numero: item.numero_os && item.numero_os !== "—" ? String(item.numero_os) : null,
            tecnico_id: String(item.tecnico_id || "0"),
            tecnico_nome: item.tecnico_nome || "Técnico Não Definido",
            cliente_nome: item.cliente_nome || null,
            data_comissao: dataComissao,
            tipo_atendimento: item.tipo_os || null,
            valor_os: Number(item.valor_os || 0),
            valor_comissao: Number(item.valor || item.valor_comissao || 0),
            tipo_lancamento: item.isManual ? "MANUAL" : "AUTO",
            status: item.status || "PENDENTE",
            observacao: item.descricao || ""
          };

          if (payload.os_id && payload.tecnico_id) {
            const { data: existing } = await supabase
              .from("comissoes")
              .select("id")
              .eq("os_id", payload.os_id)
              .eq("tecnico_id", payload.tecnico_id)
              .maybeSingle();

            if (existing?.id) {
              await supabase.from("comissoes").update({
                valor_comissao: payload.valor_comissao,
                valor_os: payload.valor_os,
                status: payload.status,
                tecnico_nome: payload.tecnico_nome,
                cliente_nome: payload.cliente_nome,
                observacao: payload.observacao,
                updated_at: new Date().toISOString()
              }).eq("id", existing.id);
            } else {
              await supabase.from("comissoes").insert([payload]);
            }
          } else if (payload.tipo_lancamento === "MANUAL") {
            if (item.db_id) {
              await supabase.from("comissoes").update(payload).eq("id", item.db_id);
            } else {
              await supabase.from("comissoes").insert([payload]);
            }
          }
        }
        return true;
      } catch (err) {
        console.warn("Erro ao sincronizar comissoes no Supabase:", err);
        return false;
      }
    },

    async salvar(comissao: any): Promise<any> {
      try {
        let dataComissao = comissao.data || new Date().toISOString().split("T")[0];
        if (dataComissao.includes("T")) {
          dataComissao = dataComissao.split("T")[0];
        }

        const payload: any = {
          os_id: comissao.os_id ? String(comissao.os_id) : null,
          os_numero: comissao.numero_os && comissao.numero_os !== "—" ? String(comissao.numero_os) : null,
          tecnico_id: String(comissao.tecnico_id || "0"),
          tecnico_nome: comissao.tecnico_nome || "",
          cliente_nome: comissao.cliente_nome || null,
          data_comissao: dataComissao,
          tipo_atendimento: comissao.tipo_os || null,
          valor_os: Number(comissao.valor_os || 0),
          valor_comissao: Number(comissao.valor || comissao.valor_comissao || 0),
          tipo_lancamento: comissao.isManual ? "MANUAL" : "AUTO",
          status: comissao.status || "PENDENTE",
          observacao: comissao.descricao || ""
        };

        if (comissao.db_id) {
          payload.id = comissao.db_id;
        }

        const { data, error } = await supabase
          .from("comissoes")
          .upsert(payload)
          .select()
          .single();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn("Erro ao salvar comissao individual no Supabase:", err);
      }
      return comissao;
    },

    async atualizarStatus(keyOrId: string | number, status: "PENDENTE" | "PAGO", tecnicoId?: number): Promise<boolean> {
      try {
        const payload = {
          status,
          updated_at: new Date().toISOString(),
          data_pagamento: status === "PAGO" ? new Date().toISOString().split("T")[0] : null
        };

        if (typeof keyOrId === "number") {
          await supabase.from("comissoes").update(payload).eq("id", keyOrId);
        } else if (String(keyOrId).startsWith("OS-")) {
          const parts = String(keyOrId).split("-");
          const realOsId = parts[1];
          
          if (tecnicoId) {
            await supabase.from("comissoes").update(payload).eq("os_id", realOsId).eq("tecnico_id", Number(tecnicoId));
          } else {
            const role = parts[2];
            if (role === "tech") {
              await supabase.from("comissoes").update(payload).eq("os_id", realOsId).like("observacao", "%(Técnico)%");
            } else if (role === "aux") {
              await supabase.from("comissoes").update(payload).eq("os_id", realOsId).like("observacao", "%(Auxiliar)%");
            } else {
              await supabase.from("comissoes").update(payload).eq("os_id", realOsId);
            }
          }
        } else {
          await supabase.from("comissoes").update(payload).eq("id", keyOrId);
        }
        return true;
      } catch (err) {
        console.warn("Erro ao atualizar status de comissao no Supabase:", err);
        return false;
      }
    }
  },

  configuracoesAgenda: {
    async obter(): Promise<any | null> {
      try {
        const { data, error } = await supabase
          .from("configuracoes_agenda")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn("Aviso ao buscar configuracoes_agenda no Supabase:", error);
          return null;
        }

        if (!data) return null;

        const formatTimeForInput = (tStr: string | null) => {
          if (!tStr) return "07:30";
          const s = String(tStr).trim();
          const parts = s.split(":");
          if (parts.length >= 2) {
            return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
          }
          return s;
        };

        const storedLocal = localStorage.getItem("gst_agenda_config_v1");
        let localDuracao = {};
        if (storedLocal) {
          try {
            localDuracao = JSON.parse(storedLocal).duracaoAtendimentoPorTipo || {};
          } catch (e) {}
        }

        return {
          horaInicioWork: formatTimeForInput(data.hora_inicio_work) || "07:30",
          horaFimWork: formatTimeForInput(data.hora_fim_work) || "18:00",
          intervaloAlmocoInicio: formatTimeForInput(data.intervalo_almoco_inicio) || "12:00",
          intervaloAlmocoFim: formatTimeForInput(data.intervalo_almoco_fim) || "13:30",
          exibirFimDeSemana: data.exibir_fim_de_semana ?? true,
          limiteOsPorTecnicoDia: Number(data.limite_os_por_tecnico_dia) || 4,
          bloquearSobreposicao: data.bloquear_sobreposicao ?? true,
          notificarTecnicoWhatsapp: data.notificar_tecnico_whatsapp ?? true,
          gerarRotaMaps: data.gerar_rota_maps ?? true,
          duracaoAtendimentoPorTipo: localDuracao
        };
      } catch (err) {
        console.warn("Falha ao carregar configuracoes_agenda:", err);
        return null;
      }
    },

    async salvar(config: any): Promise<boolean> {
      try {
        const ensureTimeFull = (val: string, fallback: string) => {
          if (!val) return fallback;
          const clean = String(val).trim();
          if (clean.length === 5) return `${clean}:00`;
          return clean;
        };

        const payload: any = {
          hora_inicio_work: ensureTimeFull(config.horaInicioWork, "07:30:00"),
          hora_fim_work: ensureTimeFull(config.horaFimWork, "18:00:00"),
          intervalo_almoco_inicio: ensureTimeFull(config.intervaloAlmocoInicio, "12:00:00"),
          intervalo_almoco_fim: ensureTimeFull(config.intervaloAlmocoFim, "13:30:00"),
          exibir_fim_de_semana: Boolean(config.exibirFimDeSemana),
          limite_os_por_tecnico_dia: Number(config.limiteOsPorTecnicoDia) || 4,
          bloquear_sobreposicao: Boolean(config.bloquearSobreposicao),
          notificar_tecnico_whatsapp: Boolean(config.notificarTecnicoWhatsapp),
          gerar_rota_maps: Boolean(config.gerarRotaMaps),
          updated_at: new Date().toISOString()
        };

        const { data: existing } = await supabase
          .from("configuracoes_agenda")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          const { error } = await supabase
            .from("configuracoes_agenda")
            .update(payload)
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("configuracoes_agenda")
            .insert([payload]);
          if (error) throw error;
        }

        return true;
      } catch (err) {
        console.warn("Erro ao salvar configuracoes_agenda no Supabase:", err);
        return false;
      }
    }
  }
};
