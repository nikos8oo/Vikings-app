import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Client serveur uniquement. La clé publishable seule ne donne accès à rien :
 * chaque table est protégée par RLS et n'ouvre ses lignes qu'aux requêtes portant
 * le secret serveur (en-tête x-va-secret, vérifié par empreinte SHA-256 en base).
 */
export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    const secret = process.env.SUPABASE_APP_SECRET;
    if (!url || !key || !secret) throw new Error("SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_APP_SECRET manquants");
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-va-secret": secret } },
    });
  }
  return client;
}

export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
