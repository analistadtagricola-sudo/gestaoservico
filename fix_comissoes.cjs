const fs = require('fs');
let code = fs.readFileSync('src/components/ComissoesView.tsx', 'utf8');

const regex = /let \{ rule, baseValue, baseDesc, techComm: techCommission, auxComm: auxCommission, techDesc: techDescSuffix, auxDesc: auxDescSuffix \} = calcResult;[\s\S]*?\}\s*};\s*\/\/ Handle Commission Payment Status toggle for O\.S\./;

const replacement = `let { rule, baseValue, baseDesc, techComm: techCommission, auxComm: auxCommission, techDesc: techDescSuffix, auxDesc: auxDescSuffix } = calcResult;
      
      const comissaoTecnico = techCommission;
      const comissaoAuxiliar = auxCommission;

      if (o.tecnico_id && comissaoTecnico > 0) {
        commissions.push({
          id: \`os_\${o.id}_tech\`,
          payment_key: \`os_\${o.id}_tech\`,
          os_id: o.id,
          numero_os: o.numero_os,
          tecnico_id: o.tecnico_id,
          tecnico_nome: tech?.nome || "Técnico Removido",
          data: o.data_encerramento || o.data_fechamento || o.data_abertura || "",
          valor: comissaoTecnico,
          descricao: \`O.S. \${o.numero_os || o.id} (\${clienteNome}) - \${equipModelo}\`,
          detalhes_regra: rule.tipo,
          status: paidOSIds[\`os_\${o.id}_tech\`] ? "PAGO" : "PENDENTE",
          tipo: "AUTOMATICA"
        });
      }
      if (o.auxiliar_id && comissaoAuxiliar > 0) {
        const aux = tecnicos.find(t => t.id === o.auxiliar_id);
        commissions.push({
          id: \`os_\${o.id}_aux\`,
          payment_key: \`os_\${o.id}_aux\`,
          os_id: o.id,
          numero_os: o.numero_os,
          tecnico_id: o.auxiliar_id,
          tecnico_nome: aux?.nome || "Auxiliar Removido",
          data: o.data_encerramento || o.data_fechamento || o.data_abertura || "",
          valor: comissaoAuxiliar,
          descricao: \`[AUXILIAR] O.S. \${o.numero_os || o.id} (\${clienteNome}) - \${equipModelo}\`,
          detalhes_regra: rule.tipo,
          status: paidOSIds[\`os_\${o.id}_aux\`] ? "PAGO" : "PENDENTE",
          tipo: "AUTOMATICA"
        });
      }
    });
    return commissions;
  };

  const getAllCommissions = () => {
    return [...getAutoCommissions(), ...comissoesManuais];
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle Commission Payment Status toggle for O.S.`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/ComissoesView.tsx', code);
