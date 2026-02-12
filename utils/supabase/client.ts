import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // We use the "!" to tell TypeScript we are sure these exist
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
