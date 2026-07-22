import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://vqrhkyhcmgpyplwhaefb.supabase.co", "sb_publishable_xtsn7-59GKb2Fx8eCQSmGw_tF8kkl53");
async function run() {
  const payload1 = { razao_social: "TEST A", cidade: "A", uf: "RO" };
  const payload2 = { razao_social: "TEST A", cidade: "A", uf: "RO" };
  const r1 = await supabase.from('clientes').insert(payload1).select();
  const r2 = await supabase.from('clientes').insert(payload2).select();
  console.log('Result 1:', r1);
  console.log('Result 2:', r2);
}
run();
