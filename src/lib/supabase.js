import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cxradaaovapwvaloqtka.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4cmFkYWFvdmFwd3ZhbG9xdGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NDA3NTUsImV4cCI6MjEwMzQxNjc1NX0.K09hTYwiHDOOVbPo0-VvlBo-uzXjLER3VBgEk6IFpRI'

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase frontend configuration is missing')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
