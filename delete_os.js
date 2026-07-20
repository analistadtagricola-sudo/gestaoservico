
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vqrhkyhcmgpyplwhaefb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xtsn7-59GKb2Fx8eCQSmGw_tF8kkl53";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deleteOS() {
  console.log("Iniciando limpeza profunda de Ordens de Serviço...");

  // Tabelas de detalhes primeiro
  const tablesToClear = [
    "os_apontamentos",
    "os_pecas",
    "ordens_servico"
  ];

  for (const table of tablesToClear) {
    const { error } = await supabase.from(table).delete().neq("id", 0);
    if (error) {
      if (error.code === "42P01") {
        console.log(`Tabela '${table}' não existe no banco, pulando...`);
      } else {
        console.error(`Erro ao limpar tabela '${table}':`, error.message);
      }
    } else {
      console.log(`Tabela '${table}' limpa com sucesso.`);
    }
  }
}

deleteOS();
