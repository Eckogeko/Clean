import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient(getToken: () => Promise<string | null>) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      accessToken: getToken,
    }
  );
}
