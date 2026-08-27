import { useEffect, useMemo, useState } from 'react'
import { ensureSession, getAdvisory } from './lib/advisoryApi'
import { supabase } from './lib/supabase'

const ISSUE_TYPES = [
  ['disease', 'रोग', 'Disease'],
  ['pest', 'कीट', 'Pest'],
  ['weed', 'खरपतवार', 'Weed'],
  ['deficiency', 'पोषक कमी', 'Nutrient deficiency'],
]

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
  const [loading, setLoading] = useState(true)
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [loadingAdvisory, setLoadingAdvisory] = useState(false)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('hi')
  const [searched, setSearched] = useState(false)

  const selectedCrop = useMemo(() => crops.find((c) => String(c.id) === String(cropId)), [crops, cropId])

  useEffect(() => {
    let mounted = true
    async function init() {
      setLoading(true)
      try {
        const [sessionResult, cropResult] = await Promise.all([
          ensureSession(),
          supabase.from('crops').select('id,name_en,name_hi,scientific_name,season,crop_category').order('name_en'),
        ])
        if (!mounted) return
        setSession(sessionResult)
        if (cropResult.error) throw cropResult.error
        setCrops(cropResult.data ?? [])
      } catch (e) {
        if (mounted) setError(e?.message || 'Secure session could not be created.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  async function loadStages(nextCropId) {
    setStages([]); setStageId(''); setIssues([]); setIssueId(''); setAdvisories([]); setSearched(false); setError('')
    if (!nextCropId) return
    const { data, error: queryError } = await supabase.from('crop_stages')
      .select('id,crop_id,stage_name,stage_order')
      .eq('crop_id', nextCropId).order('stage_order')
    if (queryError) setError(queryError.message)
    setStages(data ?? [])
  }

  async function loadIssues(nextCropId, nextType) {
    setIssues([]); setIssueId(''); setAdvisories([]); setSearched(false); setError('')
    if (!nextCropId || !nextType) return
    setLoadingIssues(true)
    try {
      if (nextType === 'deficiency') {
        const { data, error: e } = await supabase.from('nutrient_deficiencies')
          .select('id,nutrient_id,name,description,common_symptoms,verification_status,active')
          .eq('verification_status', 'verified').eq('active', true).order('name')
        if (e) throw e
        setIssues((data ?? []).map((x) => ({ ...x, name_en: x.name, name_hi: x.name, type: nextType })))
      } else {
        const table = nextType === 'disease' ? 'diseases' : nextType === 'pest' ? 'pests' : 'weeds'
        const select = nextType === 'weed'
          ? 'id,crop_id,name_en,name_hi,scientific_name,description,verification_status'
          : 'id,crop_id,name_en,name_hi,scientific_name,symptoms,verification_status'
        const { data, error: e } = await supabase.from(table).select(select)
          .eq('crop_id', nextCropId).eq('verification_status', 'verified').order('name_en')
        if (e) throw e
        setIssues((data ?? []).map((x) => ({ ...x, type: nextType })))
      }
    } catch (e) {
      setError(e?.message || 'Issues could not be loaded.')
    } finally {
      setLoadingIssues(false)
    }
  }

  async function findAdvisaries() {
    setSearched(true); setAdvisories([]); setError('')
    try {
      const activeSession = session ?? await ensureSession()
      setSession(activeSession)
      if (!selectedCrop || !issueType || !issueId) {
        setError(language === 'hi' ? 'फसल, समस्या प्रकार और समस्या चुनें।' : 'Select crop, issue type and issue.')
        return
      }
      setLoadingAdvisory(true)
      const data = await getAdvisory({ crop: selectedCrop.name_en, issueType, issueId, stageId })
      setAdvisories(Array.isArray(data?.results) ? data.results : [])
    } catch (e) {
      setError(e?.message || 'Advisory service is unavailable.')
    } finally {
      setLoadingAdvisory(false)
    }
  }

  const label = (item) => language === 'hi' ? (item?.name_hi || item?.name_en) : item?.name_en
  const stageLabel = (item) => language === 'hi' ? (item?.stage_name_hi || item?.stage_name_en || item?.stage_name) : (item?.stage_name_en || item?.stage_name)
  const cropLabel = (item) => language === 'hi' ? (item?.name_hi || item?.name_en) : item?.name_en

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="topbar">
          <div className="brand"><div className="brand-mark">🌱</div><div><div className="brand-name">CropCare AI</div><div className="brand-tag">Source-backed crop advisory</div></div></div>
          <div className="topbar-actions"><span className="admin-status-dot" title={session ? 'Secure session active' : 'Preparing secure session'} /> <button className="lang-toggle" onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}>{language === 'hi' ? 'EN' : 'हिं'}</button></div>
        </header>

        <section className="hero-panel"><div className="hero-copy"><span className="eyebrow">🌾 Verified agriculture knowledge</span><h1>{language === 'hi' ? 'फसल की समस्या का verified समाधान खोजें' : 'Find a verified solution for your crop problem'}</h1><p>{language === 'hi' ? 'सिस्टम केवल verified, source-backed advisory data दिखाता है।' : 'Only verified, source-backed advisory data is displayed.'}</p></div><div className="trust-strip"><span>✓ Verified-only</span><span>✓ Source tracked</span><span>✓ Weather context</span><span>✓ No AI pesticide generation</span></div></section>

        {loading && <div className="info-state"><strong>{language === 'hi' ? 'सुरक्षित session तैयार हो रहा है…' : 'Preparing secure session…'}</strong></div>}

        <section className="workflow-card">
          <div className="section-heading"><div><span className="step-label">STEP 1</span><h2>{language === 'hi' ? 'फसल चुनें' : 'Select crop'}</h2></div></div>
          <div className="form-grid">
            <label className="field"><span>{language === 'hi' ? 'फसल' : 'Crop'}</span><select value={cropId} onChange={(e) => { setCropId(e.target.value); loadStages(e.target.value) }} disabled={loading}><option value="">{language === 'hi' ? 'फसल चुनें' : 'Choose a crop'}</option>{crops.map((c) => <option key={c.id} value={c.id}>{cropLabel(c)}</option>)}</select></label>
            <label className="field"><span>{language === 'hi' ? 'फसल अवस्था' : 'Crop stage'}</span><select value={stageId} onChange={(e) => setStageId(e.target.value)} disabled={!cropId}><option value="">{language === 'hi' ? 'अवस्था चुनें (optional)' : 'Choose a stage (optional)'}</option>{stages.map((s) => <option key={s.id} value={s.id}>{stageLabel(s)}</option>)}</select></label>
          </div>

          <div className="section-heading spaced"><div><span className="step-label">STEP 2</span><h2>{language === 'hi' ? 'समस्या पहचानें' : 'Identify the issue'}</h2></div></div>
          <div className="issue-types">{ISSUE_TYPES.map(([v, hi, en]) => <button type="button" key={v} className={`issue-chip ${issueType === v ? 'active' : ''}`} onClick={() => { setIssueType(v); loadIssues(cropId, v) }} disabled={!cropId}>{language === 'hi' ? hi : en}</button>)}</div>
          <label className="field full-width"><span>{language === 'hi' ? 'विशिष्ट समस्या' : 'Specific issue'}</span><select value={issueId} onChange={(e) => setIssueId(e.target.value)} disabled={!issueType || loadingIssues}><option value="">{loadingIssues ? 'Loading…' : issues.length ? (language === 'hi' ? 'समस्या चुनें' : 'Choose an issue') : (language === 'hi' ? 'Verified issue उपलब्ध नहीं' : 'No verified issue available')}</option>{issues.map((i) => <option key={i.id} value={i.id}>{label(i)}</option>)}</select></label>
          <div className="location-note"><div className="location-icon">🌦️</div><div><strong>Weather context</strong><span>{language === 'hi' ? 'API cached weather मिले तो advisory के साथ context दे सकती है।' : 'Cached weather can be returned alongside the advisory when available.'}</span></div></div>
          <button className="primary-action" type="button" onClick={findAdvisaries} disabled={loadingAdvisory || !cropId || !issueId}>{loadingAdvisory ? 'Searching…' : language === 'hi' ? 'Verified Advisory खोजें →' : 'Get Verified Advisory →'}</button>
        </section>

        {error && <div className="error-state"><strong>{language === 'hi' ? 'समस्या' : 'Problem'}</strong><span>{error}</span></div>}
        {searched && !loadingAdvisory && !error && advisories.length === 0 && <div className="empty-state"><div className="empty-icon">🔎</div><h3>{language === 'hi' ? 'कोई approved advisory उपलब्ध नहीं है' : 'No approved advisory is currently available'}</h3><p>{language === 'hi' ? 'इस combination के लिए verified source-backed rule नहीं मिला।' : 'No verified, source-backed rule was found for this combination.'}</p></div>}
        {advisories.length > 0 && <section className="results-section"><div className="section-heading result-heading"><div><span className="step-label">VERIFIED RESULTS</span><h2>{language === 'hi' ? 'उपलब्ध Advisory' : 'Available advisories'}</h2></div><span className="result-count">{advisories.length}</span></div><div className="results-list">{advisories.map((a) => <article className="result-card" key={a.id}><div className="result-topline"><span className="verified-badge">✓ Verified</span><span className="trust-score">{a.source?.name || 'Source-backed'}</span></div><h3>{a.recommendation_text_hi || a.recommendation_text_en || 'Verified advisory'}</h3>{a.description && <p className="result-description">{a.description}</p>}<div className="fact-grid"><Fact label="Crop" value={a.crop?.name_hi || a.crop?.name_en || cropLabel(selectedCrop)} /><Fact label="Stage" value={a.stage?.stage_name_hi || a.stage?.stage_name_en || '—'} /><Fact label="Issue type" value={a.issue_type || issueType} /><Fact label="Source" value={a.source?.name || 'Verified source'} /></div>{a.chemical && <div className="application-card"><div className="application-title">{a.chemical.chemical_type || 'Chemical'}</div><Fact label="Active ingredient" value={a.chemical.active_ingredient || a.chemical.name} /><Fact label="Formulation" value={a.chemical.formulation || '—'} />{a.dose && <Fact label="Dose" value={a.dose_unit ? `${a.dose} ${a.dose_unit}` : a.dose} />} {a.application_method && <Fact label="Application" value={a.application_method} />}{a.waiting_period && <Fact label="Waiting period / PHI" value={a.waiting_period} />}{a.safety_note && <div className="safety-note">⚠ {a.safety_note}</div>}</div>}{a.weather_risk && <div className="weather-box"><div className="application-title">Weather risk</div><span>{JSON.stringify(a.weather_risk)}</span></div>}</article>)}</div></section>}
        <footer className="footer"><span>CropCare AI</span><span>•</span><span>{language === 'hi' ? 'Verified sources only' : 'Verified sources only'}</span></footer>
      </div>
    </main>
  )
}

function Fact({ label, value }) { return <div className="fact"><span>{label}</span><strong>{value || '—'}</strong></div> }

export default App
