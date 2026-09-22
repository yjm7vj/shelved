"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Browser client, used only to watch `sync_jobs` over Realtime.
 *
 * It holds the publishable key, so row level security applies: the single
 * permitted read is a sync job looked up by its random id.
 */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
