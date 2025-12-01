import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // For prototype: use service role key to bypass RLS
  // WARNING: In production, never expose service role key to client!
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createBrowserClient(supabaseUrl, supabaseKey);
}
