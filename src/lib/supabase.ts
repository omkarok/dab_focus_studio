// ============================================================
// Supabase client setup
// ------------------------------------------------------------
// DEPENDENCY: @supabase/supabase-js must be installed:
//   npm install @supabase/supabase-js
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Use the same (import.meta as any) pattern as the rest of the codebase
// so TypeScript compiles without a vite-env.d.ts reference.
const supabaseUrl =
  ((import.meta as any).env?.VITE_SUPABASE_URL ?? undefined) as string | undefined;
const supabaseAnonKey =
  ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? undefined) as string | undefined;

/**
 * Returns true when both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.
 * When false the app falls back to pure localStorage mode.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Singleton Supabase client.
 * Safe to reference even when env vars are missing — callers should
 * gate on `isSupabaseConfigured()` before making actual requests.
 */
export const supabase: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : (null as unknown as SupabaseClient);
