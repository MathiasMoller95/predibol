import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/** Anon client without cookies — for edge routes (OG crawlers) and public RPCs. */
export function createAnonClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
