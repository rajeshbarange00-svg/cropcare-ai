import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cxradaaovapwvaloqtka.supabase.co'

// Vercel currently has no VITE_SUPABASE_ANON_KEY available to the Vite build.
// The Supabase publishable key is safe for browser use and is used only as a
// fallback so the production app does not crash at module initialization.
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_UZOPKE8Mkz0MdfQNjL37hA_sc-v0uSP'

if (!supabaseKey) {
  throw new Error('Supabase public key is not configured.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
