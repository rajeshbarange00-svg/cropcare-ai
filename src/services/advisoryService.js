import { supabase } from '../lib/supabase'

/**
 * Public advisory data access.
 * The browser only calls the verified-only Edge Function and uses the
 * browser-safe Supabase key from VITE_SUPABASE_*.
 */
export async function getAdvisoryContext({
  crop,
  issueType,
  issueId,
  stageId,
  state,
  district,
  latitude,
  longitude,
}) {
  if (!crop) throw new Error('Crop is required.')

  const body = {
    crop,
    issue_type: issueType || undefined,
    issue_id: issueId || undefined,
    stage_id: stageId || undefined,
    state: state || undefined,
    district: district || undefined,
    ...(Number.isFinite(latitude) ? { latitude } : {}),
    ...(Number.isFinite(longitude) ? { longitude } : {}),
  }

  const { data, error } = await supabase.functions.invoke('advisory-api-v3', {
    body,
  })

  if (error) throw new Error(error.message || 'Unable to reach advisory service.')
  if (!data || typeof data !== 'object') throw new Error('Advisory service returned an invalid response.')
  if (data.error) throw new Error(String(data.error))

  return data
}

export async function listVerifiedCrops() {
  const { data, error } = await supabase
    .from('crops')
    .select('id,name_en,name_hi,scientific_name,season,crop_category')
    .order('name_en')

  if (error) throw error
  return data ?? []
}

export async function listCropStages(cropId) {
  if (!cropId) return []

  const { data, error } = await supabase
    .from('crop_stages')
    .select('id,crop_id,stage_name_en,stage_name_hi,days_from_sowing_min,days_from_sowing_max,description')
    .eq('crop_id', cropId)
    .order('stage_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function listVerifiedIssues(cropId, issueType) {
  if (!cropId || !issueType) return []

  if (issueType === 'deficiency') {
    const { data, error } = await supabase
      .from('nutrient_deficiencies')
      .select('id,nutrient_id,name_en,name_hi,standard_identifier,description,common_symptoms,verification_status')
      .eq('verification_status', 'verified')
      .eq('active', true)
      .order('name_en')

    if (error) throw error
    return (data ?? []).map((item) => ({ ...item, type: issueType }))
  }

  const table = issueType === 'disease' ? 'diseases' : issueType === 'pest' ? 'pests' : 'weeds'
  const select = issueType === 'weed'
    ? 'id,crop_id,name_en,name_hi,scientific_name,description,verification_status'
    : 'id,crop_id,name_en,name_hi,scientific_name,symptoms,verification_status'

  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('crop_id', cropId)
    .eq('verification_status', 'verified')
    .order('name_en')

  if (error) throw error
  return (data ?? []).map((item) => ({ ...item, type: issueType }))
}
