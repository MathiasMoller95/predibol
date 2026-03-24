import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

export function createClient(): SupabaseClient<Database> {
  // @supabase/ssr ships untyped JS; assert so query builders use Database.
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY) as SupabaseClient<Database>;
}
