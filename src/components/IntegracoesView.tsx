import React, { useState, useEffect, useRef } from "react";
import { Cpu, CheckCircle2, AlertCircle, FileSpreadsheet, UploadCloud, RefreshCw, Check, FileText, ClipboardList, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { API } from "../lib/api";
import { Cliente, Implemento, OrdemServico } from "../types";
import { useUser } from "../lib/UserContext";
import { addAuditLog } from "../lib/auditLogger";

interface IntegracoesViewProps {
  onRefresh?: () => Promise<void>;
}

export const IntegracoesView: React.FC<IntegracoesViewProps> = ({ onRefresh }) => {
  const { currentUser } = useUser();
  // Existing integrations config states
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappToken, setwhatsappToken] = useState("");
  const [whatsappPhone, setwhatsappPhone] = useState("");
  const [gdriveEnabled, setgdriveEnabled] = useState(false);
  const [gdriveFolder, setgdriveFolder] = useState("");
  const [erpSyncEnabled, seterpSyncEnabled] = useState(false);
  const [erpApiKey, seterpApiKey] = useState("");
  
  // Toast notifications state
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Switcher for active importer tab
  const [activeImporterTab, setActiveImporterTab] = useState<"clientes" | "implementos" | "ordens_servico">("clientes");

  // Shared Excel Importer states
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importCurrent, setImportCurrent] = useState(0);
  const [importLogs, setImportLogs] = useState<{ type: "create" | "update" | "error"; msg: string }[]>([]);
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; failed: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedIntegrations = localStorage.getItem("gst_integrations_v1");
    if (savedIntegrations) {
      try {
        const parsed = JSON.parse(savedIntegrations);
        setWhatsappEnabled(!!parsed.whatsappEnabled);
        setwhatsappToken(parsed.whatsappToken || "");
        setwhatsappPhone(parsed.whatsappPhone || "");
        setgdriveEnabled(!!parsed.gdriveEnabled);
        setgdriveFolder(parsed.gdriveFolder || "");
        seterpSyncEnabled(!!parsed.erpSyncEnabled);
        seterpApiKey(parsed.erpApiKey || "");
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const switchTab = (tab: "clientes" | "implementos" | "ordens_servico") => {
    setActiveImporterTab(tab);
    setImportProgress(0);
    setImportTotal(0);
    setImportCurrent(0);
    setImportLogs([]);
    setImportResult(null);
  };

  const handleSaveIntegrations = (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      whatsappEnabled,
      whatsappToken,
      whatsappPhone,
      gdriveEnabled,
      gdriveFolder,
      erpSyncEnabled,
      erpApiKey
    };
    localStorage.setItem("gst_integrations_v1", JSON.stringify(config));
    showToast("Configurações de integrações salvas com sucesso!");
    addAuditLog(
      currentUser?.nome || currentUser?.usuario,
      "Sistema",
      "SUCESSO",
      "Configuração de Integrações",
      "As configurações de integração com WhatsApp, Google Drive e ERP foram atualizadas."
    );
  };

  // Helper comparison standardizers to prevent duplication
  const cleanCpfCnpj = (val: string) => {
    return String(val || "").replace(/\D/g, "");
  };

  const cleanName = (val: string) => {
    return String(val || "").toLowerCase().trim().replace(/\s+/g, " ");
  };

  const cleanSerial = (val: string) => {
    return String(val || "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
  };

  // Process Clientes Import
  
const cleanUf = (raw: any, fallback = "RO"): string => {
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
};

const cleanTipoPessoa = (raw: any, cpfCnpjStr: string, fallback: "F" | "J" = "F"): "F" | "J" => {
  if (raw) {
    const s = String(raw).toUpperCase().trim();
    if (s.startsWith("J") || s.includes("PJ") || s.includes("JURID")) return "J";
    if (s.startsWith("F") || s.includes("PF") || s.includes("FISIC") || s.includes("FÍSIC")) return "F";
  }
  const digits = String(cpfCnpjStr || "").replace(/\D/g, "");
  if (digits.length > 11) return "J";
  if (digits.length > 0) return "F";
  return fallback;
};

const normalizeKey = (k: string) => k ? String(k).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") : "";

  const extractField = (rowObj: any, possibleKeys: string[] | any, fallback: any = "") => {
    if (!rowObj || typeof rowObj !== "object") return fallback;
    const keysArray = Array.isArray(possibleKeys) ? possibleKeys : [possibleKeys];

    const normalizedRow: Record<string, any> = {};
    Object.keys(rowObj).forEach(k => {
      normalizedRow[normalizeKey(k)] = rowObj[k];
    });

    for (const pk of keysArray) {
      const normPk = normalizeKey(pk);
      if (normalizedRow[normPk] !== undefined && normalizedRow[normPk] !== null && String(normalizedRow[normPk]).trim() !== "") {
        return normalizedRow[normPk];
      }
    }
    return fallback;
  };

  const processClientesImport = async (json: any[]) => {
    // 1. Fetch current database clients to perform ultra-fast in-memory lookup map
    const existingList = await API.clientes.listar();
    
    const clientsBySankhya = new Map<string, any>();
    const clientsByCpfCnpj = new Map<string, any>();
    const clientsByName = new Map<string, any>();

    existingList.forEach((c) => {
      if (c.codigo_sankhya) {
        clientsBySankhya.set(String(c.codigo_sankhya).trim(), c);
      }
      const cleanCpf = cleanCpfCnpj(c.cpf_cnpj || "");
      if (cleanCpf) {
        clientsByCpfCnpj.set(cleanCpf, c);
      }
      const cleanN = cleanName(c.razao_social);
      if (cleanN) {
        clientsByName.set(cleanN, c);
      }
    });

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const newLogs: typeof importLogs = [];

    // Helper to extract fields from multiple potential columns, preserving database values if column is absent
    

    // 2. Process rows with intelligence
    for (let i = 0; i < json.length; i++) {
      await new Promise(r => setTimeout(r, 0));
      const row = json[i];
      setImportCurrent(i + 1);
      setImportProgress(Math.round(((i + 1) / json.length) * 100));

      // ID Match checking first
      let existing = null;
      const rawId = extractField(row, ["ID", "id", "Id", "Código", "Codigo"], "");
      if (rawId && !isNaN(Number(rawId))) {
        existing = existingList.find(c => c.id === Number(rawId));
      }

      // Standard mappings mirroring importador.js
      const codParceiro = extractField(row, ["Cód. Parceiro", "Cód Parceiro", "Cod. Parceiro", "Cod Parceiro", "Codigo", "id", "Código", "Cód. Sankhya", "Cód Sankhya", "Cod Sankhya"], existing?.codigo_sankhya);
      const nameUfCidade = row["Nome + UF (Cidade)"] || row["Cidade"] || "";
      let parsedCidade = "";
      let parsedUf = "RO";

      if (nameUfCidade && String(nameUfCidade).includes("-")) {
        const parts = String(nameUfCidade).split("-");
        parsedCidade = parts[0]?.trim() || "";
        parsedUf = parts[1]?.trim() || "RO";
      } else {
        parsedCidade = row["Cidade"] || row["cidade"] || "";
        parsedUf = row["UF"] || row["uf"] || "RO";
      }

      const rawAtivo = extractField(row, ["Ativo"], null);
      let isAtivo = true;
      if (rawAtivo !== null) {
        const strAtivo = String(rawAtivo).toUpperCase().trim();
        isAtivo = strAtivo === "SIM" || strAtivo === "TRUE" || strAtivo === "ATIVO" || rawAtivo === true;
      } else if (existing) {
        isAtivo = existing.ativo !== false;
      }

      const rawCpfCnpj = extractField(row, ["CNPJ / CPF", "CNPJ", "CPF", "CNPJ/CPF", "Cpf/Cnpj", "Cpf", "Cnpj"], existing?.cpf_cnpj || "");

      let finalCodSankhya = codParceiro ? String(codParceiro).trim() : undefined;
      if (!finalCodSankhya && !existing) {
        finalCodSankhya = `IMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }

      const mappedCliente: Cliente = {
        codigo_sankhya: finalCodSankhya ? String(finalCodSankhya).substring(0, 20) : undefined,
        tipo_pessoa: cleanTipoPessoa(
          extractField(row, ["Tipo de pessoa", "Tipo"], existing?.tipo_pessoa),
          rawCpfCnpj,
          "F"
        ),
        ativo: isAtivo,
        razao_social: String(extractField(row, ["Razão social", "Razao social", "Nome", "Cliente", "Razão Social", "Razao Social"], existing?.razao_social || "")).toUpperCase().substring(0, 250),
        nome_fantasia: String(extractField(row, ["Nome Parceiro", "Fantasia", "Nome Fantasia"], existing?.nome_fantasia || "")).substring(0, 250),
        cpf_cnpj: rawCpfCnpj ? String(rawCpfCnpj).substring(0, 20) : "",
        inscricao_estadual: String(extractField(row, ["Insc. Estadual / Identidade", "Inscricao Estadual", "IE", "I.E."], existing?.inscricao_estadual || "")).substring(0, 30),
        endereco: String(extractField(row, ["Nome (Endereço)", "Endereço", "Endereco", "Rua", "Logradouro"], existing?.endereco || "")).substring(0, 250),
        numero: String(extractField(row, ["Número", "Numero"], existing?.numero || "")).substring(0, 20),
        complemento: String(extractField(row, ["Complemento"], existing?.complemento || "")).substring(0, 100),
        bairro: String(extractField(row, ["Nome (Bairro)", "Bairro"], existing?.bairro || "")).substring(0, 100),
        cidade: String(extractField(row, ["Cidade", "cidade"], existing?.cidade || parsedCidade)).toUpperCase().substring(0, 100),
        uf: cleanUf(extractField(row, ["UF", "uf"], existing?.uf || parsedUf), "RO"),
        cep: String(extractField(row, ["CEP", "Cep"], existing?.cep || "")).substring(0, 10),
        telefone: String(extractField(row, ["Telefone"], existing?.telefone || "")).substring(0, 20),
        celular: String(extractField(row, ["Celular/Fax", "Celular", "Whatsapp", "WhatsApp"], existing?.celular || "")).substring(0, 20),
        email: String(extractField(row, ["Email", "E-mail"], existing?.email || "")).substring(0, 100)
      };

      if (!mappedCliente.razao_social) {
        // Fallback: extract any string from row or use generic name instead of skipping
        const anyVal = Object.values(row).find(v => v !== undefined && v !== null && String(v).trim() !== "");
        mappedCliente.razao_social = anyVal ? String(anyVal).toUpperCase().trim() : `CLIENTE IMPORTADO ${i + 1}`;
      }

      // Match checking if not matched by ID
      if (!existing) {
        const searchSankhya = mappedCliente.codigo_sankhya ? String(mappedCliente.codigo_sankhya).trim() : "";
        const searchCpf = cleanCpfCnpj(mappedCliente.cpf_cnpj || "");
        const searchName = cleanName(mappedCliente.razao_social);

        if (searchSankhya && clientsBySankhya.has(searchSankhya)) {
          existing = clientsBySankhya.get(searchSankhya);
        } else if (searchCpf && clientsByCpfCnpj.has(searchCpf)) {
          existing = clientsByCpfCnpj.get(searchCpf);
        } else if (searchName && clientsByName.has(searchName)) {
          existing = clientsByName.get(searchName);
        }
      }

      try {
        if (existing && existing.id) {
          // Update existing, maintaining fields not explicitly present in spreadsheet
          const updatedCliente = await API.clientes.atualizar(existing.id, {
            ...existing,
            ...mappedCliente,
            id: existing.id
          });
          
          if (updatedCliente.codigo_sankhya) {
            clientsBySankhya.set(String(updatedCliente.codigo_sankhya).trim(), updatedCliente);
          }
          const cleanC = cleanCpfCnpj(updatedCliente.cpf_cnpj || "");
          if (cleanC) {
            clientsByCpfCnpj.set(cleanC, updatedCliente);
          }
          clientsByName.set(cleanName(updatedCliente.razao_social), updatedCliente);

          updated++;
          if (newLogs.length < 100) {
            newLogs.push({ type: "update", msg: `Atualizado: ${mappedCliente.razao_social} (ID: ${existing.id})` });
          }
        } else {
          // Insert new
          const insertedCliente = await API.clientes.inserir(mappedCliente);
          
          if (insertedCliente.id) {
            if (insertedCliente.codigo_sankhya) {
              clientsBySankhya.set(String(insertedCliente.codigo_sankhya).trim(), insertedCliente);
            }
            const cleanC = cleanCpfCnpj(insertedCliente.cpf_cnpj || "");
            if (cleanC) {
              clientsByCpfCnpj.set(cleanC, insertedCliente);
            }
            clientsByName.set(cleanName(insertedCliente.razao_social), insertedCliente);
          }

          inserted++;
          if (newLogs.length < 100) {
            newLogs.push({ type: "create", msg: `Cadastrado: ${mappedCliente.razao_social}` });
          }
        }
      } catch (rowErr: any) {
        console.error(`Error processing client row ${i}:`, rowErr);
        failed++;
        if (newLogs.length < 100) {
          newLogs.push({ type: "error", msg: `Falha em: ${mappedCliente.razao_social} - ${rowErr.message || "Erro de banco de dados"}` });
        }
      }
    }

    setImportLogs(newLogs);
    setImportResult({ inserted, updated, failed });
    showToast("Processamento da planilha de clientes concluído!", "success");
    addAuditLog(
      currentUser?.nome || currentUser?.usuario,
      "Clientes & Implementos",
      failed > 0 ? "ALERTA" : "SUCESSO",
      "Importação de Clientes via Excel",
      `Planilha de Clientes processada. Inseridos: ${inserted}, Atualizados: ${updated}, Falhas: ${failed}.`
    );

    if (onRefresh) {
      await onRefresh();
    }
  };

  // Process Implementos Import
  const processImplementosImport = async (json: any[]) => {
    // 1. Fetch current database clients, implementos, and plans to perform in-memory lookups
    const [existingClients, existingImplementos, existingPlans] = await Promise.all([
      API.clientes.listar(),
      API.implementos.listar(),
      API.planos.listar()
    ]);

    const clientsBySankhya = new Map<string, any>();
    const clientsByCpfCnpj = new Map<string, any>();
    const clientsByName = new Map<string, any>();

    existingClients.forEach((c) => {
      if (c.codigo_sankhya) {
        clientsBySankhya.set(String(c.codigo_sankhya).trim(), c);
      }
      const cleanCpf = cleanCpfCnpj(c.cpf_cnpj || "");
      if (cleanCpf) {
        clientsByCpfCnpj.set(cleanCpf, c);
      }
      const cleanN = cleanName(c.razao_social);
      if (cleanN) {
        clientsByName.set(cleanN, c);
      }
    });

    const implementosBySerial = new Map<string, any>();
    existingImplementos.forEach((imp) => {
      const serial = cleanSerial(imp.numero_serie || "");
      if (serial) {
        implementosBySerial.set(serial, imp);
      }
    });

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const newLogs: typeof importLogs = [];

    // Helper to extract fields from multiple potential columns
    

    // 2. Process rows
    for (let i = 0; i < json.length; i++) {
      await new Promise(r => setTimeout(r, 0));
      const row = json[i];
      setImportCurrent(i + 1);
      setImportProgress(Math.round(((i + 1) / json.length) * 100));

      // Normalize row keys for flexible lookup (case-insensitive, accent-insensitive, trimmed)
      

      const rawSerial = extractField(row, [
        "Número de Série", "Numero de Serie", "Série", "Serie", "Chassi", 
        "Nº Série", "Nº de Série", "No Serie", "numero_serie",
        "Nro Serie", "Nro de Serie", "Num Serie", "Numero Serie", "Série / Chassi", "Serie / Chassi", "Série/Chassi", "Serie/Chassi",
        "Chassi / Série", "Chassi / Serie", "Chassi/Série", "Chassi/Serie", "Num. Serie"
      ], "");
      const cleanS = cleanSerial(rawSerial);

      const rawModelo = extractField(row, ["Modelo", "modelo", "Descrição", "Descricao", "Equipamento", "Maquina", "Equip"], "");
      const cleanM = cleanName(rawModelo);

      // Try to find existing by ID first
      let existing = null;
      const rawId = extractField(row, ["ID", "id", "Id", "Código", "Codigo", "Código Implemento", "Codigo Implemento"], "");
      if (rawId && !isNaN(Number(rawId))) {
        existing = existingImplementos.find(imp => imp.id === Number(rawId));
      }

      // Fallback: match by Serial Number if not matched by ID
      if (!existing && cleanS) {
        existing = implementosBySerial.get(cleanS);
      }

      // Fallback: match by Model and Manufacturer if not matched by ID or Serial
      if (!existing && cleanM) {
        const rawFab = String(extractField(row, ["Fabricante", "Marca", "fabricante"], "")).toUpperCase().trim();
        existing = existingImplementos.find(imp => 
          cleanName(imp.modelo) === cleanM && (!rawFab || imp.fabricante.toUpperCase().includes(rawFab) || rawFab.includes(imp.fabricante.toUpperCase()))
        );
      }

      if (!existing && !cleanS && !cleanM) {
        // Fallback: use any available text from row or default name instead of skipping
        const anyVal = Object.values(row).find(v => v !== undefined && v !== null && String(v).trim() !== "");
        const fallbackName = anyVal ? String(anyVal).toUpperCase().trim() : `IMPLEMENTO ${i + 1}`;
        // We will proceed to insert/update with this fallback name
      }

      const fabricante = String(extractField(row, ["Fabricante", "Marca", "fabricante"], existing?.fabricante || "OUTROS")).toUpperCase();
      const modelo = String(extractField(row, ["Modelo", "modelo", "Descrição", "Descricao", "Equipamento", "Maquina", "Equip"], existing?.modelo || "IMPLEMENTO AVULSO")).toUpperCase();
      const categoria = String(extractField(row, ["Categoria", "Tipo", "categoria"], existing?.categoria || "Pulverizador"));
      const anoVal = extractField(row, ["Ano", "Ano Fabricação", "Ano Fabricacao", "ano"], existing?.ano);
      const ano = anoVal ? Number(anoVal) : undefined;
      
      // Parse date
      let dataEntrega = existing?.data_entrega;
      const rawDate = extractField(row, ["Data de Entrega", "Data Entrega", "Data", "data_entrega"], null);
      if (rawDate) {
        try {
          if (typeof rawDate === "number") {
            const parsedDate = new Date((rawDate - 25569) * 86400 * 1000);
            dataEntrega = parsedDate.toISOString().split("T")[0];
          } else if (typeof rawDate === "string") {
            const trimmedDate = rawDate.trim();
            if (trimmedDate.includes("/")) {
              const parts = trimmedDate.split("/");
              if (parts.length === 3) {
                let day = parts[0].trim();
                let month = parts[1].trim();
                let year = parts[2].trim();
                if (day.length === 1) day = "0" + day;
                if (month.length === 1) month = "0" + month;
                if (year.length === 2) year = "20" + year; // handle YY
                dataEntrega = `${year}-${month}-${day}`;
              }
            } else if (trimmedDate.includes("-")) {
              const parts = trimmedDate.split("-");
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  dataEntrega = trimmedDate;
                } else {
                  let day = parts[0].trim();
                  let month = parts[1].trim();
                  let year = parts[2].trim();
                  if (day.length === 1) day = "0" + day;
                  if (month.length === 1) month = "0" + month;
                  if (year.length === 2) year = "20" + year;
                  dataEntrega = `${year}-${month}-${day}`;
                }
              }
            } else {
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) {
                dataEntrega = d.toISOString().split("T")[0];
              }
            }
          }
        } catch (e) {
          // ignore date parse
        }
      }

      const observacao = extractField(row, ["Observação", "Obs", "observacao"], existing?.observacao || "");
      
      const rawAtivo = extractField(row, ["Ativo"], null);
      let isAtivo = true;
      if (rawAtivo !== null) {
        const strAtivo = String(rawAtivo).toUpperCase().trim();
        isAtivo = strAtivo === "SIM" || strAtivo === "TRUE" || strAtivo === "ATIVO" || rawAtivo === true;
      } else if (existing) {
        isAtivo = existing.ativo !== false;
      }

      // Try to associate with client only if client columns are specified
      let matchedCliente = null;
      
      const clientSankhya = extractField(row, ["Cód. Parceiro", "Cód Parceiro", "Cod. Parceiro", "Cod Parceiro", "Cód. Proprietário", "Cód. Cliente", "Cód. Sankhya", "Cód Sankhya", "Cod Sankhya", "Código Cliente", "Codigo Cliente", "Parceiro", "Código Parceiro", "Codigo Parceiro"], "");
      const clientCpfCnpj = extractField(row, ["CNPJ / CPF", "CNPJ", "CPF", "CPF/CNPJ", "Cpf/Cnpj", "Cpf", "Cnpj"], "");
      const clientName = extractField(row, ["Razão Social", "Razao Social", "Cliente", "Proprietário", "Proprietario", "Nome", "Nome Parceiro", "Nome Cliente"], "");

      const hasClientInfo = !!(clientSankhya || clientCpfCnpj || clientName);

      if (hasClientInfo) {
        const searchSankhya = clientSankhya ? String(clientSankhya).trim() : "";
        const searchCpf = cleanCpfCnpj(clientCpfCnpj);
        const searchName = cleanName(clientName);

        if (searchSankhya && clientsBySankhya.has(searchSankhya)) {
          matchedCliente = clientsBySankhya.get(searchSankhya);
        } else if (searchCpf && clientsByCpfCnpj.has(searchCpf)) {
          matchedCliente = clientsByCpfCnpj.get(searchCpf);
        } else if (searchName && clientsByName.has(searchName)) {
          matchedCliente = clientsByName.get(searchName);
        }

        // If no match but we have a name, create client on-the-fly!
        if (!matchedCliente && clientName) {
          try {
            const newCli = await API.clientes.inserir({
              razao_social: String(clientName).toUpperCase(),
              cidade: "DESCONHECIDA",
              uf: "RO",
              codigo_sankhya: searchSankhya ? String(searchSankhya).substring(0, 20) : `IMP-${Date.now().toString(36).substring(0, 6).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`,
              cpf_cnpj: searchCpf || undefined
            });
            
            matchedCliente = newCli;
            
            if (newCli.id) {
              if (newCli.codigo_sankhya) clientsBySankhya.set(String(newCli.codigo_sankhya).trim(), newCli);
              if (searchCpf) clientsByCpfCnpj.set(searchCpf, newCli);
              clientsByName.set(cleanName(newCli.razao_social), newCli);
            }
            newLogs.push({ type: "create", msg: `Cliente criado p/ associação: ${newCli.razao_social}` });
          } catch (cliErr) {
            console.error("Error creating client on the fly:", cliErr);
          }
        }

        // Fallback: If still no client found, use default "CLIENTE AVULSO / IMPORTADO"
        if (!matchedCliente) {
          const defaultName = "CLIENTE AVULSO / IMPORTADO";
          const cleanDefault = cleanName(defaultName);
          if (clientsByName.has(cleanDefault)) {
            matchedCliente = clientsByName.get(cleanDefault);
          } else {
            try {
              const defaultCli = await API.clientes.inserir({
                razao_social: defaultName,
                cidade: "DESCONHECIDA",
                uf: "RO",
                codigo_sankhya: `IMP-DEF-${Math.floor(Math.random() * 89999 + 10000)}`
              });
              matchedCliente = defaultCli;
              if (defaultCli.id) {
                clientsByName.set(cleanDefault, defaultCli);
              }
              newLogs.push({ type: "create", msg: `Criado cliente padrão avulso para órfãos.` });
            } catch (cliErr) {
              console.error("Error creating default client:", cliErr);
            }
          }
        }
      }

      // Try to find a matching plan
      let plano_id = existing?.plano_id;
      const colPlano = extractField(row, ["Plano de Manutenção", "Plano de Manutencao", "Plano", "Plano ID", "plano_id"], "");
      if (colPlano) {
        // Try to match by ID
        const foundPl = existingPlans.find(p => String(p.id) === String(colPlano).trim());
        if (foundPl) {
          plano_id = foundPl.id;
        }
        // Try to match by model/name
        if (!plano_id) {
          const cleanPlStr = String(colPlano).toUpperCase().trim();
          const foundPl = existingPlans.find(p => 
            p.modelo.toUpperCase().includes(cleanPlStr) || 
            cleanPlStr.includes(p.modelo.toUpperCase())
          );
          if (foundPl) plano_id = foundPl.id;
        }
      } else if (!existing) {
        // Try automatic match by manufacturer & model
        const matchedPlan = existingPlans.find(p => 
          p.fabricante.toUpperCase() === fabricante && 
          modelo.includes(p.modelo.toUpperCase())
        );
        if (matchedPlan) {
          plano_id = matchedPlan.id;
        }
      }

      let finalSerial = String(rawSerial || (existing ? existing.numero_serie : "")).toUpperCase().trim();
      if (!finalSerial) {
        finalSerial = `S/N-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }

      const mappedImplemento: Implemento = {
        cliente_id: matchedCliente ? matchedCliente.id : (existing ? existing.cliente_id : undefined),
        fabricante,
        modelo,
        categoria,
        numero_serie: finalSerial,
        ano,
        data_entrega: dataEntrega,
        observacao,
        ativo: isAtivo,
        plano_id
      };

      try {
        if (existing && existing.id) {
          // Update existing
          const updatedImpl = await API.implementos.atualizar(existing.id, {
            ...existing,
            ...mappedImplemento,
            id: existing.id
          });
          if (cleanS) {
            implementosBySerial.set(cleanS, updatedImpl);
          }
          updated++;
          if (newLogs.length < 100) {
            newLogs.push({ type: "update", msg: `Atualizado: ${fabricante} ${modelo} (Série: ${mappedImplemento.numero_serie} | ID: ${existing.id})` });
          }
        } else {
          // Insert new
          const insertedImpl = await API.implementos.inserir(mappedImplemento);
          if (insertedImpl.id && cleanS) {
            implementosBySerial.set(cleanS, insertedImpl);
          }
          inserted++;
          if (newLogs.length < 100) {
            newLogs.push({ type: "create", msg: `Cadastrado: ${fabricante} ${modelo} (Série: ${mappedImplemento.numero_serie})` });
          }
        }
      } catch (rowErr: any) {
        if (rowErr.code === "23505" || String(rowErr.message).includes("duplicate key")) {
          // Retry with unique suffix
          try {
            mappedImplemento.numero_serie = `${mappedImplemento.numero_serie}-DUP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const retriedImpl = await API.implementos.inserir(mappedImplemento);
            if (retriedImpl.id && cleanS) {
              implementosBySerial.set(cleanS, retriedImpl);
            }
            inserted++;
            if (newLogs.length < 100) {
              newLogs.push({ type: "create", msg: `Cadastrado (com série alterada devido a duplicata): ${fabricante} ${modelo} (Série: ${mappedImplemento.numero_serie})` });
            }
            continue; // Skip the outer catch error logging since it succeeded
          } catch (retryErr: any) {
            console.error(`Retry failed for row ${i}:`, retryErr);
          }
        }

        console.error(`Error processing implemento row ${i}:`, rowErr);
        failed++;
        if (newLogs.length < 100) {
          newLogs.push({ type: "error", msg: `Falha em: ${fabricante} ${modelo} - ${rowErr.message || "Erro de banco de dados"}` });
        }
      }
    }

    setImportLogs(newLogs);
    setImportResult({ inserted, updated, failed });
    showToast("Processamento da planilha de implementos concluído!", "success");
    addAuditLog(
      currentUser?.nome || currentUser?.usuario,
      "Clientes & Implementos",
      failed > 0 ? "ALERTA" : "SUCESSO",
      "Importação de Implementos via Excel",
      `Planilha de Implementos processada. Inseridos: ${inserted}, Atualizados: ${updated}, Falhas: ${failed}.`
    );

    if (onRefresh) {
      await onRefresh();
    }
  };

  // Process Ordens de Serviço Import
  const processOrdensServicoImport = async (json: any[]) => {
    // 1. Fetch current database entities
    const [existingOS, existingClients, existingImplementos, existingTecnicos] = await Promise.all([
      API.ordensServico.listar(),
      API.clientes.listar(),
      API.implementos.listar(),
      API.tecnicos.listar()
    ]);

    const clientsBySankhya = new Map<string, any>();
    const clientsByCpfCnpj = new Map<string, any>();
    const clientsByName = new Map<string, any>();
    existingClients.forEach((c) => {
      if (c.codigo_sankhya) clientsBySankhya.set(String(c.codigo_sankhya).trim(), c);
      const cleanCpf = cleanCpfCnpj(c.cpf_cnpj || "");
      if (cleanCpf) clientsByCpfCnpj.set(cleanCpf, c);
      const cleanN = cleanName(c.razao_social);
      if (cleanN) clientsByName.set(cleanN, c);
    });

    const implementosBySerial = new Map<string, any>();
    existingImplementos.forEach((imp) => {
      const serial = cleanSerial(imp.numero_serie || "");
      if (serial) implementosBySerial.set(serial, imp);
    });

    const tecnicosByName = new Map<string, any>();
    existingTecnicos.forEach((t) => {
      const name = cleanName(t.nome || "");
      if (name) tecnicosByName.set(name, t);
      const nick = cleanName(t.apelido || "");
      if (nick) tecnicosByName.set(nick, t);
    });

    const osByNumber = new Map<string, any>();
    existingOS.forEach((o) => {
      const num = String(o.numero_os || "").toUpperCase().trim();
      if (num) osByNumber.set(num, o);
    });

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const newLogs: typeof importLogs = [];

    

    const parseDateVal = (val: any) => {
      if (!val) return undefined;
      try {
        if (typeof val === "number") {
          const parsedDate = new Date((val - 25569) * 86400 * 1000);
          return parsedDate.toISOString().split("T")[0];
        } else if (typeof val === "string") {
          const trimmedDate = val.trim();
          if (trimmedDate.includes("/")) {
            const parts = trimmedDate.split("/");
            if (parts.length === 3) {
              let day = parts[0].trim();
              let month = parts[1].trim();
              let year = parts[2].trim();
              if (day.length === 1) day = "0" + day;
              if (month.length === 1) month = "0" + month;
              if (year.length === 2) year = "20" + year;
              return `${year}-${month}-${day}`;
            }
          } else if (trimmedDate.includes("-")) {
            const parts = trimmedDate.split("-");
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                return trimmedDate;
              } else {
                let day = parts[0].trim();
                let month = parts[1].trim();
                let year = parts[2].trim();
                if (day.length === 1) day = "0" + day;
                if (month.length === 1) month = "0" + month;
                if (year.length === 2) year = "20" + year;
                return `${year}-${month}-${day}`;
              }
            }
          } else {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              return d.toISOString().split("T")[0];
            }
          }
        }
      } catch (e) {
        // ignore
      }
      return undefined;
    };

    for (let i = 0; i < json.length; i++) {
      await new Promise(r => setTimeout(r, 0));
      const row = json[i];
      setImportCurrent(i + 1);
      setImportProgress(Math.round(((i + 1) / json.length) * 100));

      

      // 1. Identify existing OS
      let existing: any = null;
      const rawId = row["ID"] || row["id"] || row["Id"] || "";
      if (rawId && !isNaN(Number(rawId))) {
        existing = existingOS.find(o => o.id === Number(rawId));
      }

      const rawNumOs = extractField(row, ["Nº O.S.", "Nº OS", "OS", "No OS", "numero_os", "Número OS", "Número da OS", "Num OS", "Nro OS"], "");
      const cleanNumOs = String(rawNumOs).toUpperCase().trim();
      if (!existing && cleanNumOs) {
        existing = osByNumber.get(cleanNumOs);
      }

      // 2. Resolve or Create Client
      let resolvedCliente = null;
      const clientSankhya = extractField(row, ["Cód. Parceiro", "Cód Parceiro", "Cod. Parceiro", "Cod Parceiro", "Cód. Proprietário", "Cód. Cliente", "Cód. Sankhya", "Cód Sankhya", "Cod Sankhya", "Código Cliente", "Codigo Cliente", "Parceiro", "Código Parceiro", "Codigo Parceiro"], "");
      const clientCpfCnpj = extractField(row, ["CNPJ / CPF", "CNPJ", "CPF", "CPF/CNPJ", "Cpf/Cnpj", "Cpf", "Cnpj"], "");
      const clientName = extractField(row, ["Razão Social", "Razao Social", "Cliente", "Proprietário", "Proprietario", "Nome", "Nome Parceiro", "Nome Cliente"], "");

      const searchSankhya = clientSankhya ? String(clientSankhya).trim() : "";
      const searchCpf = cleanCpfCnpj(clientCpfCnpj);
      const searchName = cleanName(clientName);

      if (searchSankhya && clientsBySankhya.has(searchSankhya)) {
        resolvedCliente = clientsBySankhya.get(searchSankhya);
      } else if (searchCpf && clientsByCpfCnpj.has(searchCpf)) {
        resolvedCliente = clientsByCpfCnpj.get(searchCpf);
      } else if (searchName && clientsByName.has(searchName)) {
        resolvedCliente = clientsByName.get(searchName);
      }

      if (!resolvedCliente && clientName) {
        try {
          resolvedCliente = await API.clientes.inserir({
            razao_social: String(clientName).toUpperCase(),
            cidade: "DESCONHECIDA",
            uf: "RO",
            codigo_sankhya: searchSankhya ? String(searchSankhya).substring(0, 20) : `IMP-${Date.now().toString(36).substring(0, 6).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`,
            cpf_cnpj: searchCpf || undefined
          });
          if (resolvedCliente.id) {
            if (resolvedCliente.codigo_sankhya) clientsBySankhya.set(String(resolvedCliente.codigo_sankhya).trim(), resolvedCliente);
            if (searchCpf) clientsByCpfCnpj.set(searchCpf, resolvedCliente);
            clientsByName.set(cleanName(resolvedCliente.razao_social), resolvedCliente);
          }
          newLogs.push({ type: "create", msg: `Cliente criado p/ O.S.: ${resolvedCliente.razao_social}` });
        } catch (err) {
          console.error("Error creating client on the fly for OS:", err);
        }
      }

      if (!resolvedCliente && existing) {
        resolvedCliente = { id: existing.cliente_id };
      }

      if (!resolvedCliente) {
        const defaultName = "CLIENTE AVULSO / IMPORTADO";
        const cleanDefault = cleanName(defaultName);
        if (clientsByName.has(cleanDefault)) {
          resolvedCliente = clientsByName.get(cleanDefault);
        } else {
          try {
            resolvedCliente = await API.clientes.inserir({
              razao_social: defaultName,
              cidade: "DESCONHECIDA",
              uf: "RO",
              codigo_sankhya: `IMP-DEF-${Math.floor(Math.random() * 89999 + 10000)}`
            });
            if (resolvedCliente.id) {
              clientsByName.set(cleanDefault, resolvedCliente);
            }
          } catch (err) {
            console.error(err);
          }
        }
      }

      const cliente_id = resolvedCliente?.id;

      // 3. Resolve or Create Implemento
      let resolvedImplemento = null;
      const rawSerial = extractField(row, [
        "Número de Série", "Numero de Serie", "Série", "Serie", "Chassi", 
        "Nº Série", "Nº de Série", "No Serie", "numero_serie",
        "Nro Serie", "Nro de Serie", "Num Serie", "Numero Serie", "Série / Chassi", "Serie / Chassi", "Série/Chassi", "Serie/Chassi",
        "Chassi / Série", "Chassi / Serie", "Chassi/Série", "Chassi/Serie", "Num. Serie"
      ], "");
      const cleanS = cleanSerial(rawSerial);

      const rawModelo = extractField(row, ["Modelo", "modelo", "Descrição", "Descricao", "Equipamento", "Maquina", "Equip"], "");
      const cleanM = cleanName(rawModelo);
      const rawFab = String(extractField(row, ["Fabricante", "Marca", "fabricante"], "OUTROS")).toUpperCase();
      const rawCat = String(extractField(row, ["Categoria", "Tipo", "categoria"], "Pulverizador"));

      if (cleanS && implementosBySerial.has(cleanS)) {
        resolvedImplemento = implementosBySerial.get(cleanS);
      }

      if (!resolvedImplemento && cleanM) {
        resolvedImplemento = existingImplementos.find(imp => 
          cleanName(imp.modelo) === cleanM && (!rawFab || imp.fabricante.toUpperCase().includes(rawFab) || rawFab.includes(imp.fabricante.toUpperCase()))
        );
      }

      if (!resolvedImplemento && cleanM) {
        resolvedImplemento = existingImplementos.find(imp => cleanName(imp.modelo) === cleanM);
      }

      if (!resolvedImplemento && (cleanS || cleanM)) {
        try {
          resolvedImplemento = await API.implementos.inserir({
            cliente_id,
            fabricante: rawFab || "OUTROS",
            modelo: String(rawModelo || "IMPLEMENTO OS").toUpperCase(),
            categoria: rawCat,
            numero_serie: String(rawSerial || `S/N-OS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`).toUpperCase().trim(),
            ativo: true
          });
          if (resolvedImplemento.id) {
            existingImplementos.push(resolvedImplemento);
            if (cleanS) implementosBySerial.set(cleanS, resolvedImplemento);
          }
          newLogs.push({ type: "create", msg: `Implemento criado p/ O.S.: ${rawFab} ${rawModelo} (Série: ${rawSerial})` });
        } catch (err: any) {
          console.error("Error creating implemento for OS:", err);
        }
      }

      if (!resolvedImplemento && existing) {
        resolvedImplemento = { id: existing.implemento_id };
      }

      if (!resolvedImplemento) {
        const clientImpls = existingImplementos.filter(imp => imp.cliente_id === cliente_id);
        if (clientImpls.length > 0) {
          resolvedImplemento = clientImpls[0];
        } else {
          try {
            resolvedImplemento = await API.implementos.inserir({
              cliente_id,
              fabricante: "OUTROS",
              modelo: "IMPLEMENTO AVULSO",
              categoria: "Pulverizador",
              numero_serie: "AVULSO",
              ativo: true
            });
            existingImplementos.push(resolvedImplemento);
          } catch (err) {
            console.error(err);
          }
        }
      }

      const implemento_id = resolvedImplemento?.id;

      if (!cliente_id || !implemento_id) {
        failed++;
        newLogs.push({ type: "error", msg: `Linha ${i + 2}: Ignorada. Falha ao associar Cliente ou Implemento.` });
        continue;
      }

      // 4. Resolve Technician
      let tecnico_id = existing?.tecnico_id;
      const rawTecName = extractField(row, ["Técnico", "Tecnico", "tecnico", "Responsável", "Responsavel"], "");
      if (rawTecName) {
        const cleanTec = cleanName(rawTecName);
        if (tecnicosByName.has(cleanTec)) {
          tecnico_id = tecnicosByName.get(cleanTec).id;
        }
      }

      // 5. Resolve Auxiliar
      let auxiliar_id = existing?.auxiliar_id;
      const rawAuxName = extractField(row, ["Auxiliar", "auxiliar"], "");
      if (rawAuxName) {
        const cleanAux = cleanName(rawAuxName);
        if (tecnicosByName.has(cleanAux)) {
          auxiliar_id = tecnicosByName.get(cleanAux).id;
        }
      }

      // 6. Map Other Fields
      const rawStatus = String(extractField(row, ["Status", "status", "Situação", "Situacao"], "ABERTA")).toUpperCase().trim();
      let mappedStatus: OrdemServico["status"] = "ABERTA";
      if (["ABERTA", "EM ATENDIMENTO", "AGENDADA", "AGUARDANDO", "FINALIZADA", "CANCELADA"].includes(rawStatus)) {
        mappedStatus = rawStatus as any;
      }

      const rawPrioridade = String(extractField(row, ["Prioridade", "prioridade"], "NORMAL")).toUpperCase().trim();
      let mappedPrioridade: OrdemServico["prioridade"] = "NORMAL";
      if (["NORMAL", "ALTA", "URGENTE"].includes(rawPrioridade)) {
        mappedPrioridade = rawPrioridade as any;
      }

      const data_abertura = parseDateVal(extractField(row, ["Data Abertura", "Data de Abertura", "Abertura", "data_abertura"], null)) || existing?.data_abertura || new Date().toISOString().split("T")[0];
      const data_encerramento = parseDateVal(extractField(row, ["Data Encerramento", "Data de Encerramento", "Encerramento", "data_encerramento"], null)) || existing?.data_encerramento;
      const data_atendimento = parseDateVal(extractField(row, ["Data Atendimento", "Data do Atendimento", "data_atendimento"], null)) || existing?.data_atendimento;
      const data_termino = parseDateVal(extractField(row, ["Data Término", "Data Termino", "data_termino"], null)) || existing?.data_termino;

      const parseNumVal = (v: any, fallback: any) => {
        if (v === "" || v === null || v === undefined) return fallback;
        const n = Number(String(v).replace(",", "."));
        return isNaN(n) ? fallback : n;
      };
      const mappedOS: OrdemServico = {
        numero_os: existing ? existing.numero_os : (cleanNumOs || `OS${String(existingOS.length + inserted + 1).padStart(6, "0")}`),
        status: mappedStatus,
        cliente_id,
        implemento_id,
        data_abertura,
        data_encerramento,
        tipo_atendimento: String(extractField(row, ["Tipo de Atendimento", "Tipo Atendimento", "tipo_atendimento"], existing?.tipo_atendimento || "ASSISTÊNCIA TÉCNICA")).toUpperCase(),
        prioridade: mappedPrioridade,
        reclamacao: String(extractField(row, ["Reclamação", "Reclamacao", "Sintomas", "Problema"], existing?.reclamacao || "Importado do Excel")),
        observacao: String(extractField(row, ["Observação", "Observacao", "Obs"], existing?.observacao || "")),
        solicitante: String(extractField(row, ["Solicitante", "Contato"], existing?.solicitante || "")),
        tecnico_id,
        auxiliar_id,
        data_atendimento,
        data_termino,
        hora_inicial: String(extractField(row, ["Hora Inicial", "Hora Inicio", "hora_inicial"], existing?.hora_inicial || "")),
        hora_final: String(extractField(row, ["Hora Final", "Hora Fim", "hora_final"], existing?.hora_final || "")),
        servico_executado: String(extractField(row, ["Serviço Executado", "Servico Executado", "Trabalho Executado", "Laudo"], existing?.servico_executado || "")),
        km_rodado_total: parseNumVal(extractField(row, ["Km Rodado", "KM Rodado", "Km Total", "km_rodado_total"], null), existing?.km_rodado_total),
        km_inicial: parseNumVal(extractField(row, ["Km Inicial", "KM Inicial", "km_inicial"], null), existing?.km_inicial),
        km_final: parseNumVal(extractField(row, ["Km Final", "KM Final", "km_final"], null), existing?.km_final),
        valor_km_unitario: parseNumVal(extractField(row, ["Valor Km", "Valor KM", "valor_km_unitario"], null), existing?.valor_km_unitario),
        valor_hora_unitario: parseNumVal(extractField(row, ["Valor Hora", "valor_hora_unitario"], null), existing?.valor_hora_unitario),
        veiculo_usado: String(extractField(row, ["Veículo Usado", "Veiculo Usado", "Veículo", "Veiculo"], existing?.veiculo_usado || "")),
        valor_deslocamento: parseNumVal(extractField(row, ["Valor Deslocamento", "valor_deslocamento"], null), existing?.valor_deslocamento),
        valor_mao_obra: parseNumVal(extractField(row, ["Valor Mão de Obra", "Valor Mao de Obra", "valor_mao_obra"], null), existing?.valor_mao_obra),
        valor_terceiros: parseNumVal(extractField(row, ["Valor Terceiros", "valor_terceiros"], null), existing?.valor_terceiros),
        nota_fiscal: String(extractField(row, ["Nota Fiscal", "NF", "nota_fiscal"], existing?.nota_fiscal || "")),
        valor_total: parseNumVal(extractField(row, ["Valor Total", "valor_total", "Valor OS"], null), existing?.valor_total)
      };

      try {
        if (existing && existing.id) {
          const updatedOS = await API.ordensServico.atualizar(existing.id, {
            ...existing,
            ...mappedOS,
            id: existing.id
          });
          osByNumber.set(String(updatedOS.numero_os).toUpperCase().trim(), updatedOS);
          updated++;
          if (newLogs.length < 100) {
            newLogs.push({ type: "update", msg: `Atualizada: O.S. ${mappedOS.numero_os} (ID: ${existing.id})` });
          }
        } else {
          const insertedOS = await API.ordensServico.inserir(mappedOS);
          osByNumber.set(String(insertedOS.numero_os).toUpperCase().trim(), insertedOS);
          inserted++;
          if (newLogs.length < 100) {
            newLogs.push({ type: "create", msg: `Cadastrada: O.S. ${insertedOS.numero_os}` });
          }
        }
      } catch (err: any) {
        console.error("Error creating/updating OS:", err);
        failed++;
        if (newLogs.length < 100) {
          newLogs.push({ type: "error", msg: `Falha na O.S. ${mappedOS.numero_os} - ${err.message || "Erro de banco"}` });
        }
      }
    }

    setImportLogs(newLogs);
    setImportResult({ inserted, updated, failed });
    showToast("Processamento da planilha de Ordens de Serviço concluído!", "success");
    addAuditLog(
      currentUser?.nome || currentUser?.usuario,
      "Ordens de Serviço",
      failed > 0 ? "ALERTA" : "SUCESSO",
      "Importação de O.S. via Excel",
      `Planilha de Ordens de Serviço processada. Inseridos: ${inserted}, Atualizados: ${updated}, Falhas: ${failed}.`
    );

    if (onRefresh) {
      await onRefresh();
    }
  };

  // Excel parser & routing trigger
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);
    setImportCurrent(0);
    setImportLogs([]);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(ws);

        if (json.length === 0) {
          showToast("Nenhuma linha válida encontrada no arquivo.", "error");
          setImporting(false);
          return;
        }

        if (activeImporterTab === "clientes") {
          await processClientesImport(json);
        } else if (activeImporterTab === "implementos") {
          await processImplementosImport(json);
        } else {
          await processOrdensServicoImport(json);
        }
      } catch (err) {
        console.error(err);
        showToast("Erro crítico ao processar planilha de importação.", "error");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadClientesTemplate = () => {
    const headers = [
      {
        "ID": "", 
        "Cód. Parceiro": "1001",
        "Razão social": "AGROPECUARIA RONDONIA LTDA",
        "Nome Parceiro": "AGRO RONDONIA",
        "CNPJ / CPF": "12.345.678/0001-90",
        "Insc. Estadual / Identidade": "101.202.303",
        "Nome (Endereço)": "RODOVIA BR 364, KM 5",
        "Número": "SN",
        "Complemento": "LOTE B",
        "Nome (Bairro)": "ZONA RURAL",
        "Cidade": "ARIQUEMES",
        "UF": "RO",
        "CEP": "76870-000",
        "Telefone": "(69) 3535-1234",
        "Celular/Fax": "(69) 99999-1234",
        "Email": "contato@agrorondonia.com.br",
        "Ativo": "SIM"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "modelo_importacao_clientes.xlsx");
  };

  const downloadImplementosTemplate = () => {
    const headers = [
      {
        "ID": "", 
        "Fabricante": "JOHN DEERE",
        "Modelo": "M4030",
        "Número de Série": "1Y1M4030AXXXXXXXX",
        "Categoria": "Pulverizador",
        "Ano": "2022",
        "Data de Entrega": "15/06/2022",
        "Observação": "Equipamento com piloto automático integrado.",
        "Ativo": "SIM",
        "Proprietário": "AGROPECUARIA RONDONIA LTDA", 
        "CNPJ / CPF": "12.345.678/0001-90", 
        "Cód. Parceiro": "1001", 
        "Plano de Manutenção": "JOHN DEERE — M4030" 
      }
    ];
    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Implementos");
    XLSX.writeFile(wb, "modelo_importacao_implementos.xlsx");
  };

  const downloadOrdensServicoTemplate = () => {
    const headers = [
      {
        "ID": "",
        "Nº O.S.": "OS000100",
        "Status": "ABERTA",
        "Cód. Parceiro": "1001",
        "Cliente": "AGROPECUARIA RONDONIA LTDA",
        "Número de Série": "1Y1M4030AXXXXXXXX",
        "Técnico": "JEFFERSON SILVA",
        "Data Abertura": "17/07/2026",
        "Tipo de Atendimento": "ASSISTÊNCIA TÉCNICA",
        "Prioridade": "NORMAL",
        "Reclamação": "Vazamento no bico pulverizador esquerdo.",
        "Observação": "Cliente solicita urgência.",
        "Solicitante": "SEBASTIÃO",
        "Km Rodado": "50",
        "Valor Total": "450.00"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OrdensServico");
    XLSX.writeFile(wb, "modelo_importacao_ordens_servico.xlsx");
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

      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase animate-fade">
            Administração & Integrações
          </h1>
          <p className="text-gray-500 text-sm">
            Acesso restrito para configuração do sistema, canais externos e importadores inteligentes de cadastros.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (window.confirm("ATENÇÃO MÁXIMA: Deseja realmente apagar TODOS os dados fictícios do sistema (clientes, implementos, O.S., apontamentos, etc.) para deixar o ambiente 100% limpo apenas com dados reais de homologação? Esta ação não pode ser desfeita!")) {
              setImporting(true);
              try {
                await API.limparTodosDadosSistema();
                showToast("Sistema limpo com sucesso! Todos os dados fictícios foram removidos para homologação.", "success");
                if (onRefresh) await onRefresh();
              } catch (err) {
                console.error(err);
                showToast("Erro ao limpar dados do sistema.", "error");
              } finally {
                setImporting(false);
              }
            }
          }}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold py-2.5 px-4 rounded-xl shadow-md transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
          Limpar Todos os Dados Fictícios (Homologação)
        </button>
      </div>

      {/* Grid containing import client cards and integration settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Importers (Clientes and Implementos) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-150 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-extrabold uppercase text-gray-800 flex items-center gap-2">
                <FileSpreadsheet className="text-brand-red w-5 h-5" />
                Importadores Inteligentes
              </h2>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">
                Verificação automatizada de duplicidade antes da inserção.
              </p>
            </div>

            {/* Switcher Tabs */}
            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => switchTab("clientes")}
                className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-md transition-all ${
                  activeImporterTab === "clientes"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Clientes (Sankhya)
              </button>
              <button
                type="button"
                onClick={() => switchTab("implementos")}
                className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-md transition-all ${
                  activeImporterTab === "implementos"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Implementos
              </button>
              <button
                type="button"
                onClick={() => switchTab("ordens_servico")}
                className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-md transition-all ${
                  activeImporterTab === "ordens_servico"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Ordens de Serviço
              </button>
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col space-y-6">
            
            {/* Guide Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase text-gray-700 tracking-wider">
                    {activeImporterTab === "clientes" 
                      ? "Layout Esperado (Clientes)" 
                      : activeImporterTab === "implementos" 
                      ? "Layout Esperado (Implementos)" 
                      : "Layout Esperado (Ordens de Serviço)"}
                  </h4>
                  <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
                    {activeImporterTab === "clientes" ? (
                      "Colunas aceitas: ID (opcional para atualizar), Cód. Parceiro, Razão social, Nome Parceiro, CNPJ / CPF, Cidade, UF, Endereço, Bairro, CEP, Telefone, Email, Ativo."
                    ) : activeImporterTab === "implementos" ? (
                      "Colunas aceitas: ID (opcional para atualizar), Fabricante (ou Marca), Modelo, Número de Série (ou Chassi/Série), Categoria, Ano, Data de Entrega, Observação, Ativo. Proprietário (ou Cliente): Razão Social, CNPJ / CPF ou Cód. Parceiro."
                    ) : (
                      "Colunas aceitas: ID (opcional para atualizar), Nº O.S. (ou numero_os), Status, Cód. Parceiro, Cliente, Número de Série (para associar Implemento), Técnico, Data Abertura, Tipo de Atendimento, Prioridade, Reclamação, Observação, Solicitante, Km Rodado, Valor Total."
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activeImporterTab === "clientes" && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("ATENÇÃO: Deseja realmente excluir TODOS os cadastros de clientes do banco de dados para uma nova importação limpa?")) {
                          setImporting(true);
                          try {
                            await API.clientes.excluirTodos();
                            showToast("Todos os clientes foram excluídos com sucesso. Banco limpo para nova importação!", "success");
                            if (onRefresh) await onRefresh();
                          } catch (err) {
                            console.error(err);
                            showToast("Erro ao limpar clientes do banco.", "error");
                          } finally {
                            setImporting(false);
                          }
                        }
                      }}
                      className="shrink-0 flex items-center gap-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-[10px] font-bold text-rose-700 py-1.5 px-2.5 rounded shadow-sm transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      Limpar Clientes
                    </button>
                  )}
                  {activeImporterTab === "implementos" && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("ATENÇÃO: Deseja realmente excluir TODOS os cadastros de implementos do banco de dados para uma nova importação limpa?")) {
                          setImporting(true);
                          try {
                            await API.implementos.excluirTodos();
                            showToast("Todos os implementos foram excluídos com sucesso. Banco limpo para nova importação!", "success");
                            if (onRefresh) await onRefresh();
                          } catch (err) {
                            console.error(err);
                            showToast("Erro ao limpar implementos do banco.", "error");
                          } finally {
                            setImporting(false);
                          }
                        }
                      }}
                      className="shrink-0 flex items-center gap-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-[10px] font-bold text-rose-700 py-1.5 px-2.5 rounded shadow-sm transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      Limpar Implementos
                    </button>
                  )}
                  {activeImporterTab === "ordens_servico" && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("ATENÇÃO: Deseja realmente excluir TODAS as ordens de serviço do banco de dados para uma nova importação limpa?")) {
                          setImporting(true);
                          try {
                            await API.ordensServico.excluirTodos();
                            showToast("Todas as ordens de serviço foram excluídas com sucesso. Banco limpo para nova importação!", "success");
                            if (onRefresh) await onRefresh();
                          } catch (err) {
                            console.error(err);
                            showToast("Erro ao limpar ordens de serviço do banco.", "error");
                          } finally {
                            setImporting(false);
                          }
                        }
                      }}
                      className="shrink-0 flex items-center gap-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-[10px] font-bold text-rose-700 py-1.5 px-2.5 rounded shadow-sm transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      Limpar O.S.
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={
                      activeImporterTab === "clientes" 
                        ? downloadClientesTemplate 
                        : activeImporterTab === "implementos" 
                        ? downloadImplementosTemplate 
                        : downloadOrdensServicoTemplate
                    }
                    className="shrink-0 flex items-center gap-1 bg-white border border-gray-200 hover:border-gray-300 text-[10px] font-bold text-gray-700 py-1.5 px-2.5 rounded shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-brand-red" />
                    Modelo .xlsx
                  </button>
                </div>
              </div>
            </div>

            {/* Drag & Drop Trigger Zone */}
            <div 
              onClick={() => !importing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                importing 
                  ? "border-amber-400 bg-amber-50/20 pointer-events-none" 
                  : "border-gray-200 hover:border-brand-red hover:bg-gray-50/50"
              }`}
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={importing}
              />
              
              {importing ? (
                <RefreshCw className="w-12 h-12 text-amber-500 animate-spin mb-4" />
              ) : (
                <UploadCloud className="w-12 h-12 text-gray-400 mb-4 hover:scale-110 transition-transform text-brand-red" />
              )}

              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                {importing ? "Processando planilha..." : `Selecione ou Arraste o arquivo de ${
                  activeImporterTab === "clientes" 
                    ? "Clientes (Sankhya)" 
                    : activeImporterTab === "implementos" 
                    ? "Implementos" 
                    : "Ordens de Serviço"
                }`}
              </h3>
              <p className="text-xs text-gray-400 font-semibold mt-1 max-w-sm">
                Formatos aceitos: <code className="text-[10px] font-mono text-brand-red font-bold">.xlsx</code>, <code className="text-[10px] font-mono text-brand-red font-bold">.xls</code> ou <code className="text-[10px] font-mono text-brand-red font-bold">.csv</code>.
              </p>
            </div>

            {/* Import progress bar */}
            {importing && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processando: {importCurrent} / {importTotal}
                  </span>
                  <span className="text-xs font-black text-amber-950 font-mono">{importProgress}%</span>
                </div>
                <div className="w-full h-2 bg-amber-200/50 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all duration-150" style={{ width: `${importProgress}%` }}></div>
                </div>
              </div>
            )}

            {/* Results summaries */}
            {importResult && (
              <div className="bg-emerald-50/55 border border-emerald-150 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Check className="w-5 h-5 stroke-[3px]" />
                  <h4 className="text-xs font-black uppercase tracking-wider">Planilha Processada com Sucesso!</h4>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-emerald-100 p-3 rounded-lg text-center shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Novos Criados</span>
                    <span className="text-2xl font-black text-emerald-600">{importResult.inserted}</span>
                  </div>
                  <div className="bg-white border border-emerald-100 p-3 rounded-lg text-center shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Atualizados</span>
                    <span className="text-2xl font-black text-blue-600">{importResult.updated}</span>
                  </div>
                  <div className="bg-white border border-emerald-100 p-3 rounded-lg text-center shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Falhas/Pulados</span>
                    <span className="text-2xl font-black text-rose-500">{importResult.failed}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent logs */}
            {(importLogs.length > 0) && (
              <div className="space-y-2 flex-1 flex flex-col min-h-[180px]">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  Registro de Atividades Recentes
                </h4>
                <div className="border border-gray-150 bg-gray-900 rounded-lg p-3 text-[10px] font-mono font-bold text-gray-300 h-44 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-700">
                  {importLogs.map((log, index) => (
                    <div key={index} className="flex gap-2 leading-relaxed">
                      {log.type === "create" && <span className="text-emerald-400 shrink-0">[CRIADO]</span>}
                      {log.type === "update" && <span className="text-cyan-400 shrink-0">[ATUALIZADO]</span>}
                      {log.type === "error" && <span className="text-rose-400 shrink-0">[FALHA]</span>}
                      <span>{log.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Existing Connections */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-150 bg-gray-50/50">
              <h2 className="font-display text-lg font-extrabold uppercase text-gray-800 flex items-center gap-2">
                <Cpu className="text-brand-red w-5 h-5" />
                Canais Externas & Notificações
              </h2>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">
                Notificações de WhatsApp, backups e faturamento externo.
              </p>
            </div>

            <form onSubmit={handleSaveIntegrations} className="p-5 space-y-6">
              
              {/* WhatsApp Integration Block */}
              <div className="border border-gray-150 rounded-xl p-4 space-y-3 hover:border-gray-200 transition-colors">
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <div>
                      <h3 className="text-xs font-extrabold uppercase text-gray-800">WhatsApp Business API</h3>
                      <p className="text-[9px] text-gray-400 font-semibold">Envio ativo de ordens de serviço concluídas.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={whatsappEnabled}
                      onChange={(e) => setWhatsappEnabled(e.target.checked)}
                    />
                    <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                
                {whatsappEnabled && (
                  <div className="space-y-3 pt-1 animate-fade">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Token de Acesso (API Key)</label>
                      <input type="password" value={whatsappToken} onChange={(e) => setwhatsappToken(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1 text-xs font-bold text-gray-800" placeholder="Token..." />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Telefone da Conta (DDI + DDD + Nº)</label>
                      <input type="text" value={whatsappPhone} onChange={(e) => setwhatsappPhone(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1 text-xs font-bold text-gray-800" placeholder="55..." />
                    </div>
                  </div>
                )}
              </div>

              {/* GDrive Block */}
              <div className="border border-gray-150 rounded-xl p-4 space-y-3 hover:border-gray-200 transition-colors">
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📁</span>
                    <div>
                      <h3 className="text-xs font-extrabold uppercase text-gray-800">Google Drive Backup</h3>
                      <p className="text-[9px] text-gray-400 font-semibold">Criação automatizada de PDFs na nuvem.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={gdriveEnabled}
                      onChange={(e) => setgdriveEnabled(e.target.checked)}
                    />
                    <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
                {gdriveEnabled && (
                  <div className="pt-1 animate-fade">
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">ID da Pasta Google Drive</label>
                    <input type="text" value={gdriveFolder} onChange={(e) => setgdriveFolder(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1 text-xs font-bold text-gray-800" placeholder="ID da pasta..." />
                  </div>
                )}
              </div>
              
              {/* ERP Sync Block */}
              <div className="border border-gray-150 rounded-xl p-4 space-y-3 hover:border-gray-200 transition-colors">
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔄</span>
                    <div>
                      <h3 className="text-xs font-extrabold uppercase text-gray-800">Sincronização ERP</h3>
                      <p className="text-[9px] text-gray-400 font-semibold">Exportação automática de faturamento.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={erpSyncEnabled}
                      onChange={(e) => seterpSyncEnabled(e.target.checked)}
                    />
                    <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                </div>
                {erpSyncEnabled && (
                  <div className="pt-1 animate-fade">
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">ERP API Key</label>
                    <input type="password" value={erpApiKey} onChange={(e) => seterpApiKey(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1 text-xs font-bold text-gray-800" placeholder="API Key..." />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-gray-150">
                <button
                  type="submit"
                  className="btn bg-brand-red hover:bg-brand-red-dark text-white text-xs font-black uppercase tracking-wider h-10 px-6 rounded-lg shadow-sm"
                >
                  Salvar Canais
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
