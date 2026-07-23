import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vqrhkyhcmgpyplwhaefb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xtsn7-59GKb2Fx8eCQSmGw_tF8kkl53";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
