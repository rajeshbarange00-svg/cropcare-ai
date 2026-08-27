import { createClient } from '@supabase/supabase-js'

// Vercel/Vite should normally provide these as environment variables.
// The publishable key is browser-safe; never use service_role/secret keys here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cxradaaovapwvaloqtka.supabase.co'
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UZOPKE8Mkz0MdfQNjL37hA_sc-v0uSP'

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Supabase frontend configuration is missing')
}

const client = createClient(supabaseUrl, supabasePublishableKey)

let bootstrapPromise = null

async function ensureAnonymousSession() {
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  if (data?.session) return data.session

  const { data: anonData, error: anonError } = await client.auth.signInAnonymously()
  if (anonError) throw anonError
  if (!anonData?.session) throw new Error('Unable to create a Supabase session')
  return anonData.session
}

function bootstrap() {
  if (!bootstrapPromise) bootstrapPromise = ensureAnonymousSession().catch((error) => {
    bootstrapPromise = null
    throw error
  })
  return bootstrapPromise
}

// Keep the existing Supabase API surface while automatically creating a
// frictionless anonymous session for farmer-facing JWT-protected functions.
export const supabase = {
  ...client,
  auth: {
    ...client.auth,
    async getSession() {
      return { data: { session: await bootstrap() }, error: null }
    },
    async getUser() {
      await bootstrap()
      return client.auth.getUser()
    },
    onAuthStateChange(callback) {
      return client.auth.onAuthStateChange(callback)
    },
    async signOut() {
      bootstrapPromise = null
      return client.auth.signOut()
    },
    async signInWithPassword(credentials) {
      const result = await client.auth.signInWithPassword(credentials)
      if (!result.error) bootstrapPromise = Promise.resolve(result.data.session)
      return result
    },
    async signInAnonymously() {
      const result = await client.auth.signInAnonymously()
      if (!result.error) bootstrapPromise = Promise.resolve(result.data.session)
      return result
    },
  },
  functions: {
    ...client.functions,
    async invoke(...args) {
      await bootstrap()
      return client.functions.invoke(...args)
    },
  },
}
