import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vdfhvzuxolgdkvbauypn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_V4RiLFFvmR8NUlwlqTwg1Q_wNGu2Wde";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
