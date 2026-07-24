const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

const regex = /async inserir\(os: OrdemServico\): Promise<OrdemServico> \{[\s\S]*?async excluir\(id: number\): Promise<boolean> \{/g;

const replacement = `async inserir(os: OrdemServico): Promise<OrdemServico> {
      const list = await this.listar();
      const lastNum = list.reduce((max, item) => {
        const match = item.numero_os?.match(/OS(\\d+)/);
        return match ? Math.max(max, parseInt(match[1])) : max;
      }, 0);
      if (!os.numero_os) {
        os.numero_os = "OS" + String(lastNum + 1).padStart(6, "0");
      }

      // 2. Map and Filter columns for DB payload
      const { clientes, implementos, id, ...cleanOS } = os;
      
      const validColumns = [
        "numero_os", "status", "cliente_id", "implemento_id", "tecnico_id", "auxiliar_id",
        "tipo_atendimento", "prioridade", "reclamacao", "observacao", "solicitante",
        "data_abertura", "data_encerramento", "data_atendimento", "data_termino",
        "hora_inicial", "hora_final", "servico_executado", "veiculo_usado",
        "km_inicial", "km_final", "km_rodado_total",
        "revisao_executada", "valor_km_unitario",
        "valor_hora_unitario", "valor_deslocamento", "valor_mao_obra",
        "valor_terceiros", "valor_total", "nota_fiscal", "num_nota_fiscal", "data_nota_fiscal",
        "modo_debito_interno", "classificacao_atendimento_interno", "valor_referencia_servico", "base_calculo_referencia", "centro_custo_debito", "observacao_debito",
        "localizacao", "obs", "horimetro_atual"
      ];

      let payload: any = {};
      for (const col of validColumns) {
        if (col in cleanOS && (cleanOS as any)[col] !== undefined) {
          payload[col] = (cleanOS as any)[col];
        }
      }

      if (cleanOS.horimetro_final !== undefined && cleanOS.horimetro_final !== null && String(cleanOS.horimetro_final) !== "") {
        payload.horimetro_atual = cleanOS.horimetro_final;
        // Ensure horimetro tag is present in obs/observacao so Supabase saves it inside the text field
        const hTag = \`[Horímetro: \${cleanOS.horimetro_final}h]\`;
        if (!String(payload.obs || "").includes("[Horímetro:")) {
          payload.obs = \`\${payload.obs || ""} \${hTag}\`.trim();
        }
        if (!String(payload.observacao || "").includes("[Horímetro:")) {
          payload.observacao = \`\${payload.observacao || ""} \${hTag}\`.trim();
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

      const locValInserir = String(cleanOS.localizacao_maquina || (cleanOS as any).localizacao || "").trim();
      if (locValInserir) {
        payload.localizacao = locValInserir;
        const locTag = \`[Localização: \${locValInserir}]\`;
        if (!String(payload.obs || "").includes("[Localização:")) {
          payload.obs = \`\${payload.obs || ""} \${locTag}\`.trim();
        } else {
          payload.obs = String(payload.obs).replace(/\\[Localização:\\s*[^\\]]+\\]/i, locTag);
        }
        if (!String(payload.observacao || "").includes("[Localização:")) {
          payload.observacao = \`\${payload.observacao || ""} \${locTag}\`.trim();
        } else {
          payload.observacao = String(payload.observacao).replace(/\\[Localização:\\s*[^\\]]+\\]/i, locTag);
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

      try {
        const { data, error } = await supabase
          .from("ordens_servico")
          .insert(payload)
          .select();
            
        if (error) {
          throw error;
        }
          
        if (data && data[0]) {
          if (cleanOS.localizacao_maquina) {
            const osLocMapStr = localStorage.getItem("gst_os_localizacao");
            const osLocMap = osLocMapStr ? JSON.parse(osLocMapStr) : {};
            osLocMap[data[0].id] = cleanOS.localizacao_maquina;
            localStorage.setItem("gst_os_localizacao", JSON.stringify(osLocMap));
          }
          const savedOS = await this.buscar(data[0].id) || data[0];
          const updatedList = [...list, savedOS];
          localStorage.setItem("gst_ordens_servico", JSON.stringify(updatedList));
          return savedOS;
        }
      } catch (err) {
        console.warn("Could not insert to Supabase, saving locally...", err);
      }

      // Local fallback
      const newId = list.reduce((max, o) => Math.max(max, o.id || 0), 0) + 1;
      const newOS = { ...os, id: newId };
      const updatedList = [...list, newOS];
      localStorage.setItem("gst_ordens_servico", JSON.stringify(updatedList));
      return newOS as OrdemServico;
    },

    async atualizar(id: number, os: Partial<OrdemServico>): Promise<OrdemServico> {
      if (!os.numero_os && id > 0) {
        try {
          const list = await this.listar();
          const lastNum = list.reduce((max, item) => {
            const match = item.numero_os?.match(/OS(\\d+)/);
            return match ? Math.max(max, parseInt(match[1])) : max;
          }, 0);
          os.numero_os = "OS" + String(lastNum + 1).padStart(6, "0");
        } catch (e) {
          os.numero_os = \`OS\${String(id).padStart(6, "0")}\`;
        }
      }

      const { clientes, implementos, id: _, ...cleanOS } = os;
      const validColumns = [
        "numero_os", "status", "cliente_id", "implemento_id", "tecnico_id", "auxiliar_id",
        "tipo_atendimento", "prioridade", "reclamacao", "observacao", "solicitante",
        "data_abertura", "data_encerramento", "data_atendimento", "data_termino",
        "hora_inicial", "hora_final", "servico_executado", "veiculo_usado",
        "km_inicial", "km_final", "km_rodado_total",
        "revisao_executada", "valor_km_unitario",
        "valor_hora_unitario", "valor_deslocamento", "valor_mao_obra",
        "valor_terceiros", "valor_total", "nota_fiscal", "num_nota_fiscal", "data_nota_fiscal",
        "modo_debito_interno", "classificacao_atendimento_interno", "valor_referencia_servico", "base_calculo_referencia", "centro_custo_debito", "observacao_debito",
        "localizacao", "obs", "horimetro_atual"
      ];
      
      let payload: any = {};
      for (const col of validColumns) {
        if (col in cleanOS && (cleanOS as any)[col] !== undefined) {
          payload[col] = (cleanOS as any)[col];
        }
      }
      
      if (cleanOS.horimetro_final !== undefined && cleanOS.horimetro_final !== null && String(cleanOS.horimetro_final) !== "") {
        payload.horimetro_atual = cleanOS.horimetro_final;
        // Ensure horimetro tag is present in obs/observacao so Supabase saves it inside the text field
        const hTag = \`[Horímetro: \${cleanOS.horimetro_final}h]\`;
        if (!String(payload.obs || "").includes("[Horímetro:")) {
          payload.obs = \`\${payload.obs || ""} \${hTag}\`.trim();
        }
        if (!String(payload.observacao || "").includes("[Horímetro:")) {
          payload.observacao = \`\${payload.observacao || ""} \${hTag}\`.trim();
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

      const locValAtualizar = String(cleanOS.localizacao_maquina || (cleanOS as any).localizacao || "").trim();
      if (locValAtualizar) {
        payload.localizacao = locValAtualizar;
        const locTag = \`[Localização: \${locValAtualizar}]\`;
        if (!String(payload.obs || "").includes("[Localização:")) {
          payload.obs = \`\${payload.obs || ""} \${locTag}\`.trim();
        } else {
          payload.obs = String(payload.obs).replace(/\\[Localização:\\s*[^\\]]+\\]/i, locTag);
        }
        if (!String(payload.observacao || "").includes("[Localização:")) {
          payload.observacao = \`\${payload.observacao || ""} \${locTag}\`.trim();
        } else {
          payload.observacao = String(payload.observacao).replace(/\\[Localização:\\s*[^\\]]+\\]/i, locTag);
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
            throw insErr;
          }

          if (insData && insData[0]) {
            return await this.buscar(insData[0].id) || insData[0];
          }
        } else {
          return await this.buscar(data[0].id) || data[0];
        }
      } catch (err) {
        console.error("Update failed details:", JSON.stringify(err, null, 2));
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
      return { ...os, id } as OrdemServico;
    },

    async excluir(id: number): Promise<boolean> {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/lib/api.ts', code);
