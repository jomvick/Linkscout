import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    db: { schema: "public" },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
