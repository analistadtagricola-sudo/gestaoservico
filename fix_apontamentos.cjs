const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

// The block has:
//       for (const key in payload) {
//         if (payload[key] === "") payload[key] = null;
//       }
// 
//       {
//         const { data, error } = await supabase

code = code.replace(/for \(const key in payload\) \{\n\s*if \(payload\[key\] === ""\) payload\[key\] = null;\n\s*\}\n\n\s*\{\n\s*const \{ data, error \} = await supabase/g, 
`for (const key in payload) {
          if (payload[key] === "") payload[key] = null;
        }

        let attempt = 0;
        while (attempt < 15) {
          const { data, error } = await supabase`);
          
fs.writeFileSync('src/lib/api.ts', code);
