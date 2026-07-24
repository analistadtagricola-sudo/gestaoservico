/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vdfhvzuxolgdkvbauypn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_V4RiLFFvmR8NUlwlqTwg1Q_wNGu2Wde";

let fetchCount = 0;
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false
  },
  global: {
    fetch: async (url, options) => {
      fetchCount++;
      console.log(`[Supabase Fetch] Request #${fetchCount} to:`, url);
      const serializedHeaders: Record<string, string> = {};
      if (options?.headers) {
        if (options.headers instanceof Headers) {
          options.headers.forEach((value, key) => {
            serializedHeaders[key] = value;
          });
        } else if (Array.isArray(options.headers)) {
          options.headers.forEach(([key, value]) => {
            serializedHeaders[key] = value;
          });
        } else {
          Object.assign(serializedHeaders, options.headers);
        }
      }

      const response = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url.toString(),
          method: options?.method || 'GET',
          headers: serializedHeaders,
          body: options?.body ? String(options.body) : undefined
        })
      });

      return response;
    }
  }
});

// Diagnóstico de conexão solicitado
(async () => {
  console.log("[Supabase Diagnostic] URL utilizada:", SUPABASE_URL);
  try {
    const { data, error } = await supabase.from('clientes').select('*').limit(1);
    console.log("[Supabase Diagnostic] Resultado da consulta (data):", data);
    if (error) {
      console.error("[Supabase Diagnostic] error.message:", error.message);
      console.error("[Supabase Diagnostic] error.details:", error.details);
      console.error("[Supabase Diagnostic] error.hint:", error.hint);
      console.error("[Supabase Diagnostic] error.code:", error.code);
    } else {
      console.log("[Supabase Diagnostic] Conexão bem-sucedida! Nenhum erro retornado.");
    }
  } catch (err: any) {
    console.error("[Supabase Diagnostic] Erro catastrófico no fetch:", err?.message || err);
  }
})();


