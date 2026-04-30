// ============================================================
// Supabase client setup
// ------------------------------------------------------------
// `supabase` — full client (auth, storage, RPC).
// `db`       — same client scoped to the `consulting` schema.
//              Use for all app data: db.from('workspaces'), etc.
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  ((import.meta as any).env?.VITE_SUPABASE_URL ?? undefined) as string | undefined;
const supabaseAnonKey =
  ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? undefined) as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export const supabase: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : (null as unknown as SupabaseClient);

/**
 * Schema-scoped client for app tables. All consulting.* tables
 * are reached via this. Auth, storage, and RPC still use `supabase`.
 *
 * Note: RPCs registered in the `consulting` schema must be invoked
 * via `supabase.schema('consulting').rpc(...)` — RPCs go through the
 * top-level client, not `db`.
 */
export const db = isSupabaseConfigured()
  ? supabase.schema("consulting")
  : (null as any);
