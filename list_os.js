
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vqrhkyhcmgpyplwhaefb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xtsn7-59GKb2Fx8eCQSmGw_tF8kkl53";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listOS() {
  const { data, error } = await supabase.from("ordens_servico").select("id, numero_os");
  if (error) {
    console.error("Erro ao listar OS:", error.message);
  } else {
    console.log(`Existem ${data.length} Ordens de Serviço no banco.`);
    data.forEach(os => console.log(`- ID: ${os.id}, Número: ${os.numero_os}`));
  }
}

listOS();
