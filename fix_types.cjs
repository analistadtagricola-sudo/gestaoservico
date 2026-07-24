const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(/\s*horas_trabalhadas_total\?: string;\n/g, '\n');
code = code.replace(/\s*\/\/ Custom commission overrides for variants of Entrega Técnica \/ custom values\n/g, '\n');
code = code.replace(/\s*comissao_custom_opcao\?: "automatico" \| "personalizado";\n/g, '\n');
code = code.replace(/\s*comissao_custom_valor_tecnico\?: number;\n/g, '\n');
code = code.replace(/\s*comissao_custom_valor_auxiliar\?: number;\n/g, '\n');
code = code.replace(/\s*problema\?: string;\n/g, '\n');

fs.writeFileSync('src/types.ts', code);
