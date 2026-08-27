import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

function App() {
  const [crops, setCrops] = useState([])
  const [stages, setStages] = useState([])
  const [issues, setIssues] = useState([])
  const [advisories, setAdvisories] = useState([])
  const [cropId, setCropId] = useState('')
  const [stageId, setStageId] = useState('')
  const [issueType, setIssueType] = useState('')
  const [issueId, setIssueId] = useState('')
  const [loadingCrops, setLoadingCrops] = useState(true)
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [loadingAdvisory, setLoadingAdvisory] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [language, setLanguage] = useState('hi')

  const selectedCrop = useMemo(() => crops.find((crop) => crop.id === cropId), [crops, cropId])
  const selectedStage = useMemo(() => stages.find((stage) => stage.id === stageId), [stages, stageId])
  const selectedIssue = useMemo(() => issues.find((issue) => issue.id === issueId), [issues, issueId])

  useEffect(() => {
    loadCrops()
  }, [])

  async function loadCrops() {
    setLoadingCrops(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('crops')
      .select('id,name_en,name_hi,scientific_name,season,crop_category')
      .order('name_en')

    if (queryError) setError(queryError.message)
    setCrops(data ?? [])
    setLoadingCrops(false)
  }

  async function loadStages(nextCropId) {
    setStages([])
    setStageId('')
    if (!nextCropId) return

    const { data, error: queryError } = await supabase
      .from('crop_stages')
      .select('id,crop_id,stage_name_en,stage_name_hi,days_from_sowing_min,days_from_sowing_max')
      .eq('crop_id', nextCropId)
      .order('stage_name_en')

    if (queryError) setError(queryError.message)
    setStages(data ?? [])
  }

  async function loadIssues(nextCropId, nextType) {
    setIssues([])
    setIssueId('')
    if (!nextCropId || !nextType || nextType === 'deficiency') return

    setLoadingIssues(true)
    setError('')

    const table = nextType === 'disease' ? 'diseases' : nextType === 'pest' ? 'pests' : 'weeds'
    const select = table === 'weeds'
      ? 'id,crop_id,name_en,name_hi,scientific_name,description,verification_status'
      : 'id,crop_id,name_en,name_hi,scientific_name,symptoms,verification_status'

    const { data, error: queryError } = await supabase
      .from(table)
      .select(select)
      .eq('crop_id', nextCropId)
      .eq('verification_status', 'verified')
      .order('name_en')

    if (queryError) setError(queryError.message)
    setIssues((data ?? []).map((item) => ({ ...item, type: nextType })))
    setLoadingIssues(false)
  }

  async function findAdvisories() {
    setSearched(true)
    setAdvisories([])
    setError('')

    if (!cropId || !issueType || !issueId) {
      setError(language === 'hi' ? 'फसल, समस्या प्रकार और समस्या चुनें।' : 'Select crop, issue type and specific issue.')
      return
    }

    setLoadingAdvisory(true)

    let query = supabase
      .from('advisories')
      .select('id,crop_id,issue_type,title,description,crop_stage_id,state,district,source_id,trust_score,verification_status,verified_at,recommendation_basis,regulatory_basis,safety_notes,evidence_url,last_reviewed_at')
      .eq('crop_id', cropId)
      .eq('issue_type', issueType)
      .eq('verification_status', 'verified')

    if (stageId) query = query.eq('crop_stage_id', stageId)

    const { data: advisoryRows, error: advisoryError } = await query.order('trust_score', { ascending: false })

    if (advisoryError) {
      setError(advisoryError.message)
      setLoadingAdvisory(false)
      return
    }

    const matches = []

    for (const advisory of advisoryRows ?? []) {
      const { data: targets, error: targetError } = await supabase
        .from('advisory_targets')
        .select('id,disease_id,pest_id,weed_id,fertilizer_id,notes')
        .eq('advisory_id', advisory.id)

      if (targetError) continue

      const targetMatch = (targets ?? []).some((target) =>
        (issueType === 'disease' && target.disease_id === issueId) ||
        (issueType === 'pest' && target.pest_id === issueId) ||
        (issueType === 'weed' && target.weed_id === issueId)
      )

      if (!targetMatch) continue

      const { data: applications } = await supabase
        .from('advisory_applications')
        .select('id,chemical_id,fertilizer_id,dose,dose_unit,application_method,spray_timing,frequency,waiting_period,safety_note,notes')
        .eq('advisory_id', advisory.id)

      const applicationDetails = []
      for (const application of applications ?? []) {
        let chemical = null
        let fertilizer = null

        if (application.chemical_id) {
          const { data } = await supabase
            .from('chemicals')
            .select('id,name,active_ingredient,chemical_type,formulation,verification_status')
            .eq('id', application.chemical_id)
            .eq('verification_status', 'verified')
            .maybeSingle()
          chemical = data
        }

        if (application.fertilizer_id) {
          const { data } = await supabase
            .from('fertilizers')
            .select('id,name,nutrient_type,npk_ratio,verification_status')
            .eq('id', application.fertilizer_id)
            .eq('verification_status', 'verified')
            .maybeSingle()
          fertilizer = data
        }

        if (chemical || fertilizer) applicationDetails.push({ ...application, chemical, fertilizer })
      }

      let source = null
      if (advisory.source_id) {
        const { data } = await supabase
          .from('sources')
          .select('id,source_name,source_url,source_type,trust_score')
          .eq('id', advisory.source_id)
          .maybeSingle()
        source = data
      }

      matches.push({ ...advisory, applications: applicationDetails, source })
    }

    setAdvisories(matches)
    setLoadingAdvisory(false)
  }

  function handleCropChange(value) {
    setCropId(value)
    setIssueType('')
    setIssueId('')
    setIssues([])
    setSearched(false)
    loadStages(value)
  }

  function handleIssueTypeChange(value) {
    setIssueType(value)
    setIssueId('')
    setSearched(false)
    loadIssues(cropId, value)
  }

  const cropLabel = (crop) => language === 'hi' ? (crop?.name_hi || crop?.name_en) : crop?.name_en
  const stageLabel = (stage) => language === 'hi' ? (stage?.stage_name_hi || stage?.stage_name_en) : stage?.stage_name_en
  const issueLabel = (issue) => language === 'hi' ? (issue?.name_hi || issue?.name_en) : issue?.name_en

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">🌱</div>
            <div>
              <div className="brand-name">CropCare AI</div>
              <div className="brand-tag">Source-backed crop advisory</div>
            </div>
          </div>
          <button className="lang-toggle" onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}>{language === 'hi' ? 'EN' : 'हिं'}</button>
        </header>

        <section className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">🌾 Verified agriculture knowledge</span>
            <h1>{language === 'hi' ? 'फसल की समस्या का verified समाधान खोजें' : 'Find a verified solution for your crop problem'}</h1>
            <p>{language === 'hi' ? 'फसल, अवस्था और समस्या चुनें। सिस्टम केवल Supabase में उपलब्ध verified advisory records दिखाएगा।' : 'Choose a crop, stage and issue. The system shows only verified advisory records available in Supabase.'}</p>
          </div>
          <div className="trust-strip"><span>✓ Verified-only</span><span>✓ Source tracked</span><span>✓ No AI-generated pesticide advice</span></div>
        </section>

        <section className="workflow-card">
          <div className="section-heading"><div><span className="step-label">STEP 1</span><h2>{language === 'hi' ? 'फसल चुनें' : 'Select crop'}</h2></div></div>
          <div className="form-grid">
            <label className="field"><span>{language === 'hi' ? 'फसल' : 'Crop'}</span><select value={cropId} onChange={(event) => handleCropChange(event.target.value)} disabled={loadingCrops}><option value="">{loadingCrops ? 'Loading…' : language === 'hi' ? 'फसल चुनें' : 'Choose a crop'}</option>{crops.map((crop) => <option key={crop.id} value={crop.id}>{cropLabel(crop)}</option>)}</select></label>
            <label className="field"><span>{language === 'hi' ? 'फसल अवस्था' : 'Crop stage'}</span><select value={stageId} onChange={(event) => { setStageId(event.target.value); setSearched(false) }} disabled={!cropId || stages.length === 0}><option value="">{language === 'hi' ? 'अवस्था चुनें (optional)' : 'Choose a stage (optional)'}</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stageLabel(stage)}</option>)}</select></label>
          </div>

          <div className="section-heading spaced"><div><span className="step-label">STEP 2</span><h2>{language === 'hi' ? 'समस्या पहचानें' : 'Identify the issue'}</h2></div></div>
          <div className="issue-types" role="group" aria-label="Issue type">
            {[['disease', language === 'hi' ? 'रोग' : 'Disease'], ['pest', language === 'hi' ? 'कीट' : 'Pest'], ['weed', language === 'hi' ? 'खरपतवार' : 'Weed'], ['deficiency', language === 'hi' ? 'पोषक कमी' : 'Nutrient deficiency']].map(([value, label]) => <button key={value} className={`issue-chip ${issueType === value ? 'active' : ''}`} onClick={() => handleIssueTypeChange(value)} disabled={!cropId}>{label}</button>)}
          </div>

          {issueType === 'deficiency' ? (
            <div className="info-state"><strong>{language === 'hi' ? 'पोषक-कमी master data अभी उपलब्ध नहीं है।' : 'Nutrient-deficiency master data is not available yet.'}</strong><span>{language === 'hi' ? 'इसलिए कोई अनुमानित recommendation नहीं दिखाई जाएगी।' : 'No inferred recommendation will be shown.'}</span></div>
          ) : (
            <label className="field full-width"><span>{language === 'hi' ? 'विशिष्ट समस्या' : 'Specific issue'}</span><select value={issueId} onChange={(event) => { setIssueId(event.target.value); setSearched(false) }} disabled={!issueType || loadingIssues || issues.length === 0}><option value="">{loadingIssues ? 'Loading…' : issues.length === 0 ? language === 'hi' ? 'Verified issue उपलब्ध नहीं' : 'No verified issue available' : language === 'hi' ? 'समस्या चुनें' : 'Choose an issue'}</option>{issues.map((issue) => <option key={issue.id} value={issue.id}>{issueLabel(issue)}</option>)}</select></label>
          )}

          <div className="location-note"><div className="location-icon">📍</div><div><strong>Location (optional)</strong><span>{language === 'hi' ? 'State/district-aware advisory records backend में supported हैं।' : 'State/district-aware advisory records are supported in the backend.'}</span></div></div>
          <button className="primary-action" onClick={findAdvisories} disabled={loadingAdvisory || issueType === 'deficiency' || !cropId || !issueId}>{loadingAdvisory ? 'Searching…' : language === 'hi' ? 'Verified Advisory खोजें →' : 'Get Verified Advisory →'}</button>
        </section>

        {error && <div className="error-state"><strong>Database error</strong><span>{error}</span></div>}
        {searched && !loadingAdvisory && advisories.length === 0 && !error && issueType !== 'deficiency' && <div className="empty-state"><div className="empty-icon">🔎</div><h3>{language === 'hi' ? 'कोई approved advisory उपलब्ध नहीं है' : 'No approved advisory is currently available'}</h3><p>{language === 'hi' ? 'इस crop + issue combination के लिए verified source-backed record नहीं मिला। कोई recommendation invent नहीं की गई।' : 'No verified, source-backed record was found for this crop + issue combination. No recommendation was invented.'}</p></div>}

        {advisories.length > 0 && <section className="results-section"><div className="section-heading result-heading"><div><span className="step-label">VERIFIED RESULTS</span><h2>{language === 'hi' ? 'उपलब्ध Advisory' : 'Available advisories'}</h2></div><span className="result-count">{advisories.length}</span></div><div className="results-list">{advisories.map((advisory) => <article className="result-card" key={advisory.id}>
          <div className="result-topline"><span className="verified-badge">✓ Verified</span><span className="trust-score">Trust {advisory.trust_score ?? '—'}/10</span></div>
          <h3>{advisory.title}</h3><p className="result-description">{advisory.description}</p>
          <div className="fact-grid"><Fact label="Crop" value={cropLabel(selectedCrop)} /><Fact label="Stage" value={stageLabel(selectedStage) || '—'} /><Fact label="Issue" value={issueLabel(selectedIssue)} /><Fact label="Issue type" value={issueType} /></div>
          {advisory.applications?.map((application) => <div className="application-card" key={application.id}>{application.chemical && <><div className="application-title">{application.chemical.chemical_type}</div><Fact label="Active ingredient" value={application.chemical.active_ingredient || application.chemical.name} /><Fact label="Formulation" value={application.chemical.formulation || '—'} /></>}{application.fertilizer && <><div className="application-title">Fertilizer</div><Fact label="Product" value={application.fertilizer.name} /><Fact label="NPK" value={application.fertilizer.npk_ratio || '—'} /></>}{application.dose && <Fact label="Dose" value={application.dose_unit ? `${application.dose} ${application.dose_unit}` : application.dose} />}{application.application_method && <Fact label="Application method" value={application.application_method} />}{application.spray_timing && <Fact label="Timing" value={application.spray_timing} />}{application.waiting_period && <Fact label="Waiting period / PHI" value={application.waiting_period} />}{application.safety_note && <div className="safety-note">⚠ {application.safety_note}</div>}</div>)}
          <div className="source-row"><div><span className="source-label">Source</span><strong>{advisory.source?.source_name || '—'}</strong></div>{advisory.evidence_url && <a href={advisory.evidence_url} target="_blank" rel="noreferrer">View evidence ↗</a>}</div>
        </article>)}</div></section>}

        <footer className="footer"><span>CropCare AI</span><span>•</span><span>Source-backed only</span><span>•</span><span>Verified records only</span></footer>
      </div>
    </main>
  )
}

function Fact({ label, value }) {
  return <div className="fact"><span>{label}</span><strong>{value || '—'}</strong></div>
}

export default App
