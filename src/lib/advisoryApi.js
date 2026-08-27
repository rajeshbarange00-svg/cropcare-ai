import { supabase } from './supabase'

/**
 * Call the verified-only advisory API.
 *
 * The Edge Function requires a valid Supabase JWT. This helper intentionally
 * does not accept or expose service-role/secret keys.
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
