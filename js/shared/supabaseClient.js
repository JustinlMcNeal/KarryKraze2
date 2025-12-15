export function getSupabaseClient() {
  if (!window.supabase) throw new Error("supabase-js not loaded");
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY");
  }
  if (!window.__kk_supabase_client) {
    window.__kk_supabase_client = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
  }
  return window.__kk_supabase_client;
}
