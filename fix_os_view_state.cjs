const fs = require('fs');
let code = fs.readFileSync('src/components/OrdensServicoView.tsx', 'utf8');

code = code.replace(/const \[comissaoCustomOpcao, setComissaoCustomOpcao\] = useState<"automatico" \| "personalizado">.*?\n/g, '');
code = code.replace(/const \[comissaoCustomValorTecnico, setComissaoCustomValorTecnico\] = useState.*?\n/g, '');
code = code.replace(/const \[comissaoCustomValorAuxiliar, setComissaoCustomValorAuxiliar\] = useState.*?\n/g, '');

fs.writeFileSync('src/components/OrdensServicoView.tsx', code);
