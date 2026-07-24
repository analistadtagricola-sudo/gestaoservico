const fs = require('fs');

// 1. Fix ComissoesView
let code1 = fs.readFileSync('src/components/ComissoesView.tsx', 'utf8');
code1 = code1.replace(/o\.data_fechamento \|\| /g, '');
code1 = code1.replace(/getFilteredCommissions/g, 'filteredComms');
code1 = code1.replace(/const handleSort = /g, 'const toggleSort = ');
fs.writeFileSync('src/components/ComissoesView.tsx', code1);

// 2. Fix RelatoriosView
let code2 = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');
code2 = code2.replace(/o\.comissao_custom_valor_tecnico/g, 'undefined');
code2 = code2.replace(/o\.comissao_custom_valor_auxiliar/g, 'undefined');
code2 = code2.replace(/undefined !== undefined/g, 'false'); // clean up tertiary expressions if any
fs.writeFileSync('src/components/RelatoriosView.tsx', code2);

// 3. Fix DashboardOverview
let code3 = fs.readFileSync('src/components/relatorios/DashboardOverview.tsx', 'utf8');
code3 = code3.replace(/o\.comissao_custom_valor_tecnico/g, 'undefined');
code3 = code3.replace(/o\.comissao_custom_valor_auxiliar/g, 'undefined');
fs.writeFileSync('src/components/relatorios/DashboardOverview.tsx', code3);

// 4. Fix api.ts
let code4 = fs.readFileSync('src/lib/api.ts', 'utf8');
code4 = code4.replace(/return newOS as OrdemServico;/g, 'return newOS as unknown as OrdemServico;');
fs.writeFileSync('src/lib/api.ts', code4);

