import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { requiredEnv } from "@/lib/utils";

export function createClient() {
  return createBrowserClient<Database>(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}
