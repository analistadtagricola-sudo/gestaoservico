const fs = require('fs');
let code1 = fs.readFileSync('src/components/ComissoesView.tsx', 'utf8');
code1 = code1.replace(/const hrs = parseFloat\(o\.horas_trabalhadas_total \|\| "0"\) \|\| 0;/g, 'const hrs = 0; /* deprecated */');
code1 = code1.replace(/if \(o\.comissao_custom_opcao === "personalizado"\) \{[\s\S]*?\} else \{/g, '{');
fs.writeFileSync('src/components/ComissoesView.tsx', code1);

let code2 = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');
code2 = code2.replace(/o\.horas_trabalhadas_total \|\| "0"/g, '"0"');
code2 = code2.replace(/o\.horas_trabalhadas_total/g, 'undefined');
code2 = code2.replace(/const isCustom = o\.comissao_custom_opcao === "personalizado";/g, 'const isCustom = false;');
code2 = code2.replace(/o\.comissao_custom_opcao === "personalizado"/g, 'false');
fs.writeFileSync('src/components/RelatoriosView.tsx', code2);

let code3 = fs.readFileSync('src/components/relatorios/DashboardOverview.tsx', 'utf8');
code3 = code3.replace(/const isCustom = o\.comissao_custom_opcao === "personalizado";/g, 'const isCustom = false;');
fs.writeFileSync('src/components/relatorios/DashboardOverview.tsx', code3);

let code4 = fs.readFileSync('src/components/OrdensServicoView.tsx', 'utf8');
code4 = code4.replace(/setComissaoCustomOpcao\(.*\);/g, '');
code4 = code4.replace(/setComissaoCustomValorTecnico\(.*\);/g, '');
code4 = code4.replace(/setComissaoCustomValorAuxiliar\(.*\);/g, '');
fs.writeFileSync('src/components/OrdensServicoView.tsx', code4);

