import { useEffect, useMemo, useState } from 'react'
import { getAdvisory } from './lib/advisoryApi'
import { supabase } from './lib/supabase'

function App() {
  const [session, setSession] = useState(null)
  const [crops, setCrops] = useState([])
  const [stages, setStages] = useState([])
  const [issues, setIssues] = useState([])
  const [advisories, setAdvisories] = useState([])
  const [cropId, setCropId] = useState('')
  const [stageId, setStageId] = useState('')
  const [issueType, setIssueType] = useState('')
  const [issueId, setIssueId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [loadingCrops, setLoadingCrops] = useState(true)
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [loadingAdvisory, setLoadingAdvisory] = useState(false)
  const [error, setError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [searched, setSearched] = useState(false)
  const [language, setLanguage] = useState('hi')

  const selectedCrop = useMemo(() => crops.find((crop) => String(crop.id) === String(cropId)), [crops, cropId])
  const selectedStage = useMemo(() => stages.find((stage) => String(stage.id) === String(stageId)), [stages, stageId])
  const selectedIssue = useMemo(() => issues.find((issue) => String(issue.id) === String(issueId)), [issues, issueId])

  useEffect(() => {
    let mounted = true
    async function init() {
      const [{ data: sessionData }, { data: cropData, error: cropError }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from('crops').select('id,name_en,name_hi,scientific_name,season,crop_category').order('name_en'),
      ])
      if (!mounted) return
      setSession(sessionData.session)
      if (cropError) setError(cropError.message)
      setCrops(cropData ?? [])
      setLoadingCrops(false)
    }
    init()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  async function signIn(event) {
    event.preventDefault()
    setAuthBusy(true)
    setAuthMessage('')
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setAuthMessage(signInError.message)
    else setAuthMessage(language === 'hi' ? 'Sign in सफल रहा।' : 'Signed in successfully.')
    setAuthBusy(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAdvisories([])
    setSearched(false)
  }

  async function loadStages(nextCropId) {
    setStages([])
    setStageId('')
    if (!nextCropId) return
    const { data, error: queryError } = await supabase.from('crop_stages')
      .select('id,crop_id,stage_name_en,stage_name_hi,days_from_sowing_min,days_from_sowing_max,description')
      .eq('crop_id', nextCropId)
      .order('stage_order', { ascending: true })
    if (queryError) setError(queryError.message)
    setStages(data ?? [])
  }

  async function loadIssues(nextCropId, nextType) {
    setIssues([])
    setIssueId('')
    if (!nextCropId || !nextType) return
    setLoadingIssues(true)
    setError('')

    if (nextType === 'deficiency') {
      const { data, error: queryError } = await supabase.from('nutrient_deficiencies')
        .select('id,nutrient_id,name_en,name_hi,standard_identifier,description,common_symptoms,verification_status')
        .eq('verification_status', 'verified').eq('active', true).order('name_en')
      if (queryError) setError(queryError.message)
      setIssues((data ?? []).map((item) => ({ ...item, type: nextType })))
      setLoadingIssues(false)
      return
    }

    const table = nextType === 'disease' ? 'diseases' : nextType === 'pest' ? 'pests' : 'weeds'
    const select = nextType === 'weed'
      ? 'id,crop_id,name_en,name_hi,scientific_name,description,verification_status'
      : 'id,crop_id,name_en,name_hi,scientific_name,symptoms,verification_status'
    const { data, error: queryError } = await supabase.from(table).select(select)
      .eq('crop_id', nextCropId).eq('verification_status', 'verified').order('name_en')
    if (queryError) setError(queryError.message)
    setIssues((data ?? []).map((item) => ({ ...item, type: nextType })))
    setLoadingIssues(false)
  }

  async function findAdvisories() {
    setSearched(true)
    setAdvisories([])
    setError('')
    if (!session) {
      setError(language === 'hi' ? 'पहले Supabase Auth से sign in करें।' : 'Please sign in with Supabase Auth first.')
      return
    }
    if (!selectedCrop || !issueType || !issueId) {
      setError(language === 'hi' ? 'फसल, समस्या प्रकार और समस्या चुनें।' : 'Select crop, issue type and issue.')
      return
    }
    setLoadingAdvisory(true)
    try {
      const data = await getAdvisory({ crop: selectedCrop.name_en, issueType, issueId, stageId })
      setAdvisories(Array.isArray(data?.results) ? data.results : [])
    } catch (requestError) {
      setError(requestError?.message || 'Advisory service is unavailable.')
    } finally {
      setLoadingAdvisory(false)
    }
  }

  function handleCropChange(value) {
    setCropId(value); setIssueType(''); setIssueId(''); setIssues([]); setAdvisories([]); setSearched(false); loadStages(value)
  }
  function handleIssueTypeChange(value) {
    setIssueType(value); setIssueId(''); setAdvisories([]); setSearched(false); loadIssues(cropId, value)
  }

  const cropLabel = (crop) => language === 'hi' ? (crop?.name_hi || crop?.name_en) : crop?.name_en
  const stageLabel = (stage) => language === 'hi' ? (stage?.stage_name_hi || stage?.stage_name_en) : stage?.stage_name_en
  const issueLabel = (issue) => language === 'hi' ? (issue?.name_hi || issue?.name_en) : issue?.name_en

  return (
    <main className="app-shell"><div className="app-container">
      <header className="topbar"><div className="brand"><div className="brand-mark">🌱</div><div><div className="brand-name">CropCare AI</div><div className="brand-tag">Source-backed crop advisory</div></div></div><div className="topbar-actions">{session && <button className="secondary-button" onClick={signOut}>Sign out</button>}<button className="lang-toggle" onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}>{language === 'hi' ? 'EN' : 'हिं'}</button></div></header>
      <section className="hero-panel"><div className="hero-copy"><span className="eyebrow">🌾 Verified agriculture knowledge</span><h1>{language === 'hi' ? 'फसल की समस्या का verified समाधान खोजें' : 'Find a verified solution for your crop problem'}</h1><p>{language === 'hi' ? 'परिणाम केवल verified advisory-api-v3 से आते हैं।' : 'Results come only from the verified advisory-api-v3 service.'}</p></div><div className="trust-strip"><span>✓ Verified-only</span><span>✓ Source tracked</span><span>✓ Weather context</span><span>✓ No AI-generated pesticide advice</span></div></section>

      {!session && <form className="auth-card" onSubmit={signIn}><div><span className="step-label">SECURE ACCESS</span><h2>{language === 'hi' ? 'Verified advisory के लिए sign in' : 'Sign in for verified advisories'}</h2><p>{language === 'hi' ? 'Backend advisory API JWT-protected है।' : 'The backend advisory API requires a valid Supabase session.'}</p></div><div className="form-grid"><label className="field"><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label className="field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label></div>{authMessage && <div className="info-state"><span>{authMessage}</span></div>}<button className="primary-action" type="submit" disabled={authBusy}>{authBusy ? 'Signing in…' : 'Sign in'}</button></form>}

      <section className="workflow-card"><div className="section-heading"><div><span className="step-label">STEP 1</span><h2>{language === 'hi' ? 'फसल चुनें' : 'Select crop'}</h2></div></div><div className="form-grid"><label className="field"><span>{language === 'hi' ? 'फसल' : 'Crop'}</span><select value={cropId} onChange={(e) => handleCropChange(e.target.value)} disabled={loadingCrops}><option value="">{loadingCrops ? 'Loading…' : language === 'hi' ? 'फसल चुनें' : 'Choose a crop'}</option>{crops.map((crop) => <option key={crop.id} value={crop.id}>{cropLabel(crop)}</option>)}</select></label><label className="field"><span>{language === 'hi' ? 'फसल अवस्था' : 'Crop stage'}</span><select value={stageId} onChange={(e) => { setStageId(e.target.value); setSearched(false) }} disabled={!cropId || stages.length === 0}><option value="">{language === 'hi' ? 'अवस्था चुनें (optional)' : 'Choose a stage (optional)'}</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stageLabel(stage)}</option>)}</select></label></div>
      <div className="section-heading spaced"><div><span className="step-label">STEP 2</span><h2>{language === 'hi' ? 'समस्या पहचानें' : 'Identify the issue'}</h2></div></div><div className="issue-types" role="group" aria-label="Issue type">{[['disease', language === 'hi' ? 'रोग' : 'Disease'], ['pest', language === 'hi' ? 'कीट' : 'Pest'], ['weed', language === 'hi' ? 'खरपतवार' : 'Weed'], ['deficiency', language === 'hi' ? 'पोषक कमी' : 'Nutrient deficiency']].map(([value, label]) => <button type="button" key={value} className={`issue-chip ${issueType === value ? 'active' : ''}`} onClick={() => handleIssueTypeChange(value)} disabled={!cropId}>{label}</button>)}</div>
      <label className="field full-width"><span>{language === 'hi' ? 'विशिष्ट समस्या' : 'Specific issue'}</span><select value={issueId} onChange={(e) => { setIssueId(e.target.value); setSearched(false) }} disabled={!issueType || loadingIssues || issues.length === 0}><option value="">{loadingIssues ? 'Loading…' : issues.length === 0 ? language === 'hi' ? 'Verified issue उपलब्ध नहीं' : 'No verified issue available' : language === 'hi' ? 'समस्या चुनें' : 'Choose an issue'}</option>{issues.map((issue) => <option key={issue.id} value={issue.id}>{issueLabel(issue)}</option>)}</select></label>
      <div className="location-note"><div className="location-icon">🌦️</div><div><strong>Weather</strong><span>{language === 'hi' ? 'Coordinates मिलने पर API cached weather context दे सकती है।' : 'The API can return cached weather context when coordinates are supplied.'}</span></div></div><button className="primary-action" type="button" onClick={findAdvisories} disabled={!session || loadingAdvisory || !cropId || !issueId}>{loadingAdvisory ? 'Searching…' : language === 'hi' ? 'Verified Advisory खोजें →' : 'Get Verified Advisory →'}</button></section>

      {error && <div className="error-state"><strong>Request error</strong><span>{error}</span></div>}
      {searched && !loadingAdvisory && advisories.length === 0 && !error && <div className="empty-state"><div className="empty-icon">🔎</div><h3>{language === 'hi' ? 'कोई approved advisory उपलब्ध नहीं है' : 'No approved advisory is currently available'}</h3><p>{language === 'hi' ? 'इस combination के लिए verified source-backed rule नहीं मिला।' : 'No verified, source-backed rule was found for this combination.'}</p></div>}

      {advisories.length > 0 && <section className="results-section"><div className="section-heading result-heading"><div><span className="step-label">VERIFIED RESULTS</span><h2>{language === 'hi' ? 'उपलब्ध Advisory' : 'Available advisories'}</h2></div><span className="result-count">{advisories.length}</span></div><div className="results-list">{advisories.map((advisory) => <article className="result-card" key={advisory.id}><div className="result-topline"><span className="verified-badge">✓ Verified</span><span className="trust-score">Source-backed</span></div><h3>{advisory.recommendation_text_hi || advisory.recommendation_text_en || 'Verified advisory'}</h3><div className="fact-grid"><Fact label="Crop" value={advisory.crop?.name_hi || advisory.crop?.name_en || cropLabel(selectedCrop)} /><Fact label="Stage" value={advisory.stage?.stage_name_hi || advisory.stage?.stage_name_en || stageLabel(selectedStage) || '—'} /><Fact label="Issue" value={selectedIssue ? issueLabel(selectedIssue) : advisory.issue_type} /><Fact label="Issue type" value={advisory.issue_type || issueType} /></div>{(advisory.chemical || advisory.fertilizer) && <div className="application-card">{advisory.chemical && <><div className="application-title">{advisory.chemical.chemical_type}</div><Fact label="Active ingredient" value={advisory.chemical.active_ingredient || advisory.chemical.name} /><Fact label="Formulation" value={advisory.chemical.formulation || '—'} /></>}{advisory.fertilizer && <><div className="application-title">Fertilizer</div><Fact label="Product" value={advisory.fertilizer.name} /></>}{advisory.dose && <Fact label="Dose" value={advisory.dose_unit ? `${advisory.dose} ${advisory.dose_unit}` : advisory.dose} />}{advisory.application_method && <Fact label="Application method" value={advisory.application_method} />}{advisory.application_timing && <Fact label="Timing" value={advisory.application_timing} />}{advisory.waiting_period && <Fact label="Waiting period / PHI" value={advisory.waiting_period} />}{advisory.safety_note && <div className="safety-note">⚠ {advisory.safety_note}</div>}</div>}{advisory.weather_risk?.length > 0 && <div className="weather-box"><strong>Weather risk</strong>{advisory.weather_risk.map((risk) => <div key={`${risk.type}-${risk.level}`}><b>{risk.type}</b> — {risk.level}. {risk.reason}</div>)}</div>}{advisory.weather && <div className="weather-box"><strong>Weather context</strong><span>{advisory.weather.temperature ?? '—'}° · humidity {advisory.weather.humidity ?? '—'}% · rain {advisory.weather.rainfall ?? '—'} · wind {advisory.weather.wind_speed ?? '—'}</span></div>}<div className="source-row"><div><span className="source-label">Source</span><strong>{advisory.source?.source_name || '—'}</strong></div>{advisory.source?.source_url && <a href={advisory.source.source_url} target="_blank" rel="noreferrer">View source ↗</a>}</div></article>)}</div></section>}
      <footer className="footer"><span>CropCare AI</span><span>•</span><span>Source-backed only</span><span>•</span><span>Verified records only</span></footer>
    </div></main>
  )
}

function Fact({ label, value }) { return <div className="fact"><span>{label}</span><strong>{value || '—'}</strong></div> }
export default App
