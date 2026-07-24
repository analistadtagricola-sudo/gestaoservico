const fs = require('fs');
let code = fs.readFileSync('src/components/OrdensServicoView.tsx', 'utf8');

code = code.replace(/\}, \[isFormOpen\]\);/g, '}, []);');

fs.writeFileSync('src/components/OrdensServicoView.tsx', code);
