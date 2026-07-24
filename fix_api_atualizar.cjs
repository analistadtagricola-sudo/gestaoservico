const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

const regex = /const validColumns = \[\s*"numero_os", "status", "cliente_id", "implemento_id", "tecnico_id", "auxiliar_id",[\s\S]*?"problema", "problema_relatado", "servico", "laudo", "obs", "horimetro", "km_rodado", "servico_executado"\s*\];/g;
const replaceWith = `const validColumns = [
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
      ];`;

code = code.replace(regex, replaceWith);

const regexRedundancy = /if \(cleanOS\.reclamacao && !payload\.problema\)[\s\S]*?if \(cleanOS\.km_rodado_total[^\n]*\n/g;

const replaceRedundancyWith = `if (cleanOS.horimetro_final !== undefined && cleanOS.horimetro_final !== null && String(cleanOS.horimetro_final) !== "") {
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
`;

code = code.replace(regexRedundancy, replaceRedundancyWith);

fs.writeFileSync('src/lib/api.ts', code);
