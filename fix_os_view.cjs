const fs = require('fs');
let code = fs.readFileSync('src/components/OrdensServicoView.tsx', 'utf8');

code = code.replace(/setComissaoCustomOpcao\(os\.comissao_custom_opcao \|\| "automatico"\);\n/g, '');
code = code.replace(/setComissaoCustomValorTecnico\(os\.comissao_custom_valor_tecnico \|\| 0\);\n/g, '');
code = code.replace(/setComissaoCustomValorAuxiliar\(os\.comissao_custom_valor_auxiliar \|\| 0\);\n/g, '');
code = code.replace(/horas_trabalhadas_total: String\(calcularTotalHorasTrabalhadas\(\)\),\n/g, '');
code = code.replace(/\/\/ Custom commission overrides fields\n\s*comissao_custom_opcao: comissaoCustomOpcao,\n\s*comissao_custom_valor_tecnico: Number\(comissaoCustomValorTecnico\),\n\s*comissao_custom_valor_auxiliar: Number\(comissaoCustomValorAuxiliar\),\n/g, '');

fs.writeFileSync('src/components/OrdensServicoView.tsx', code);
