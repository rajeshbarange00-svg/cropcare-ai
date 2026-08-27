import { createClient } from '@supabase/supabase-js'

// Vercel/Vite should normally provide these as environment variables.
// The publishable key is browser-safe; never use service_role/secret keys here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cxradaaovapwvaloqtka.supabase.co'
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UZOPKE8Mkz0MdfQNjL37hA_sc-v0uSP'

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Supabase frontend configuration is missing')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
