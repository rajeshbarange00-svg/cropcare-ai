import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cxradaaovapwvaloqtka.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4cmFkYWFvdmFwd3ZhbG9xdGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NDA3NTUsImV4cCI6MjEwMzQxNjc1NX0.K09hTYwiHDOOVbPo0-VvlBo-uzXjLER3VBgEk6IFpRI'

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase frontend configuration is missing')
}

const client = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Keep Supabase methods bound to the real client instance.
// This prevents minified/runtime contexts from losing `.from()`'s receiver.
export const supabase = new Proxy(client, {
  get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver)
    return typeof value === 'function' ? value.bind(target) : value
  },
})
