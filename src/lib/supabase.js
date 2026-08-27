import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cxradaaovapwvaloqtka.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is missing. Configure it in Vercel environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
