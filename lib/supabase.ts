import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function isDemoModeEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true" ||
    (!isSupabaseConfigured() && process.env.NODE_ENV !== "production");
}

export function getSupabaseConfigurationError() {
  if (isSupabaseConfigured() || isDemoModeEnabled()) return "";
  return "Configura??o de produ??o incompleta. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY na Vercel e fa?a um novo deploy.";
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(supabaseUrl!, supabaseKey!);
  }
  return client;
}
