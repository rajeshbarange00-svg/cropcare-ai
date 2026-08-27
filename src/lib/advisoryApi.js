import { supabase } from './supabase'

/**
 * Ensure the browser has a Supabase session before calling JWT-protected
 * Edge Functions. Anonymous auth keeps the farmer flow frictionless while
 * still sending a valid JWT; no service-role key is ever exposed.
 */
async function ensureSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (sessionData?.session) return sessionData.session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  if (!data?.session) throw new Error('Unable to create a Supabase session')
  return data.session
}

/**
 * Call the verified-only advisory API.
 *
 * This helper intentionally does not accept or expose service-role/secret keys.
 */
export async function getAdvisory({
  crop,
  issueType = '',
  issueId = '',
  stageId = '',
  state = '',
  district = '',
  latitude,
  longitude,
} = {}) {
  if (!crop) throw new Error('crop is required')

  await ensureSession()

  const payload = {
    crop,
    issue_type: issueType || undefined,
    issue_id: issueId || undefined,
    stage_id: stageId || undefined,
    state: state || undefined,
    district: district || undefined,
    latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : undefined,
    longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : undefined,
  }

  const { data, error } = await supabase.functions.invoke('advisory-api-v3', {
    body: payload,
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return data
}
