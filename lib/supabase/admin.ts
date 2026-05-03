import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { SUPABASE_URL } from "@/lib/supabase/env";

export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
