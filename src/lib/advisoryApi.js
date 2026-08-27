import { supabase } from './supabase'

export async function ensureSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (sessionData?.session) return sessionData.session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  if (!data?.session?.access_token) throw new Error('Unable to create a valid Supabase session')
  return data.session
}

export async function getAdvisory({ crop, issueType = '', issueId = '', stageId = '', state = '', district = '', latitude, longitude } = {}) {
  if (!crop) throw new Error('crop is required')
  const session = await ensureSession()
  if (!session?.access_token) throw new Error('Unable to create a valid Supabase session')

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

  const { data, error } = await supabase.functions.invoke('advisory-api-v3', { body: payload })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
