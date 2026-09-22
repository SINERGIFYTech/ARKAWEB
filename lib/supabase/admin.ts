import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SOLO usar dentro de Route Handlers / Server Actions. Nunca importar en un "use client".
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
