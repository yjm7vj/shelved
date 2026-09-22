import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client.
 *
 * Uses the secret key, which bypasses row level security. The browser never
 * talks to Postgres directly, so every authorisation check lives in server
 * actions and server components instead of in policies.
 */
let client: SupabaseClient | null = null;

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY to .env.local.",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

export function db(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new SupabaseNotConfiguredError();
  client ??= createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  return client;
}
