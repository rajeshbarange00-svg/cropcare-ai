import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const TABS = [
  ['overview', 'Overview'],
  ['crops', 'Crops & Stages'],
  ['issues', 'Issues'],
  ['inputs', 'Fertilizer & Chemicals'],
  ['sources', 'Sources'],
  ['review', 'Review Queue'],
]

const ISSUE_TABLES = {
  disease: { table: 'diseases', label: 'Disease' },
  pest: { table: 'pests', label: 'Pest' },
  weed: { table: 'weeds', label: 'Weed' },
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey((value) => value + 1)

  return (
    <section className="admin-page">
      <div className="admin-header">
        <div>
          <span className="step-label">SECURE CMS</span>
          <h1>CropCare AI Admin</h1>
          <p>Source-backed agriculture data management. Database RLS enforces admin access.</p>
        </div>
        <span className="admin-status">Admin CMS</span>
      </div>

      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map(([value, label]) => (
          <button type="button" key={value} className={tab === value ? 'admin-tab active' : 'admin-tab'} onClick={() => setTab(value)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <Overview refreshKey={refreshKey} />}
      {tab === 'crops' && <CropsManager refresh={refresh} />}
      {tab === 'issues' && <IssuesManager refresh={refresh} />}
      {tab === 'inputs' && <InputsManager refresh={refresh} />}
      {tab === 'sources' && <SourcesManager refresh={refresh} />}
      {tab === 'review' && <ReviewQueue refresh={refresh} />}
    </section>
  )
}

function useCount(table, refreshKey = 0) {
  const [state, setState] = useState({ count: 0, error: '' })
  useEffect(() => {
    let active = true
    supabase.from(table).select('*', { count: 'exact', head: true }).then(({ count, error }) => {
      if (!active) return
      setState({ count: count ?? 0, error: error?.message ?? '' })
    })
    return () => { active = false }
  }, [table, refreshKey])
  return state
}

function Overview({ refreshKey }) {
  const cards = [
    ['crops', 'Crops'], ['diseases', 'Diseases'], ['pests', 'Pests'], ['weeds', 'Weeds'],
    ['fertilizers', 'Fertilizers'], ['chemicals', 'Chemicals'], ['sources', 'Sources'],
    ['advisory_rules', 'Advisory Rules'], ['source_claims', 'Source Claims'], ['advisory_review_queue', 'Review Queue'],
  ]
  return <div className="admin-grid">{cards.map(([table, label]) => <CountCard key={table} table={table} label={label} refreshKey={refreshKey} />)}</div>
}

function CountCard({ table, label, refreshKey }) {
  const { count, error } = useCount(table, refreshKey)
  return <article className="admin-card"><span>{label}</span><strong>{error ? '!' : count}</strong>{error && <small>{error}</small>}</article>
}

function CropsManager({ refresh }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name_en: '', name_hi: '', scientific_name: '', crop_category: '', season: '' })
  const [error, setError] = useState('')
  const load = async () => { const { data, error } = await supabase.from('crops').select('id,name_en,name_hi,scientific_name,crop_category,season').order('name_en'); setRows(data ?? []); setError(error?.message ?? '') }
  useEffect(() => { load() }, [])
  async function addCrop(e) {
    e.preventDefault(); setError('')
    const { error } = await supabase.from('crops').insert(form)
    if (error) setError(error.message); else { setForm({ name_en: '', name_hi: '', scientific_name: '', crop_category: '', season: '' }); await load(); refresh() }
  }
  return <div className="cms-section">
    <SectionTitle title="Crops" subtitle="Add or review crop master records." />
    <form className="cms-form" onSubmit={addCrop}>{['name_en','name_hi','scientific_name','crop_category','season'].map((key) => <input key={key} value={form[key]} required={key === 'name_en'} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={key.replaceAll('_', ' ')} />)}<button className="primary-action" type="submit">Add crop</button></form>
    {error && <div className="error-state"><span>{error}</span></div>}
    <div className="cms-table">{rows.map((row) => <div className="cms-row" key={row.id}><div><strong>{row.name_en}</strong><span>{row.name_hi || '—'} · {row.scientific_name || 'Scientific name pending'}</span></div><span>{row.season || '—'}</span></div>)}</div>
  </div>
}

function IssuesManager({ refresh }) {
  const [type, setType] = useState('disease')
  const [cropId, setCropId] = useState('')
  const [crops, setCrops] = useState([])
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name_en: '', name_hi: '', scientific_name: '', symptoms: '', description: '' })
  const [error, setError] = useState('')
  useEffect(() => { supabase.from('crops').select('id,name_en,name_hi').order('name_en').then(({ data }) => { setCrops(data ?? []); if (!cropId && data?.[0]?.id) setCropId(data[0].id) }) }, [])
  const config = ISSUE_TABLES[type]
  async function load() {
    if (!cropId) return
    const { data, error } = await supabase.from(config.table).select('id,crop_id,name_en,name_hi,scientific_name,verification_status').eq('crop_id', cropId).order('name_en')
    setRows(data ?? []); setError(error?.message ?? '')
  }
  useEffect(() => { load() }, [type, cropId])
  async function addIssue(e) {
    e.preventDefault(); setError('')
    const payload = { crop_id: cropId, name_en: form.name_en, name_hi: form.name_hi || null, scientific_name: form.scientific_name || null, verification_status: 'pending', validation_status: 'draft' }
    if (type === 'disease') payload.symptoms = form.symptoms || null
    if (type === 'weed') payload.description = form.description || null
    const { error } = await supabase.from(config.table).insert(payload)
    if (error) setError(error.message); else { setForm({ name_en: '', name_hi: '', scientific_name: '', symptoms: '', description: '' }); await load(); refresh() }
  }
  return <div className="cms-section">
    <SectionTitle title="Issues" subtitle="Disease, pest and weed master records." />
    <div className="cms-toolbar"><select value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(ISSUE_TABLES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select><select value={cropId} onChange={(e) => setCropId(e.target.value)}>{crops.map((crop) => <option key={crop.id} value={crop.id}>{crop.name_en}</option>)}</select></div>
    <form className="cms-form" onSubmit={addIssue}><input required value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="name en" /><input value={form.name_hi} onChange={(e) => setForm({ ...form, name_hi: e.target.value })} placeholder="name hi" /><input value={form.scientific_name} onChange={(e) => setForm({ ...form, scientific_name: e.target.value })} placeholder="scientific name" />{type === 'disease' && <input value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} placeholder="symptoms" />}{type === 'weed' && <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="description" />}<button className="primary-action" type="submit">Add {config.label.toLowerCase()}</button></form>
    {error && <div className="error-state"><span>{error}</span></div>}
    <div className="cms-table">{rows.map((row) => <div className="cms-row" key={row.id}><div><strong>{row.name_en}</strong><span>{row.name_hi || '—'} · {row.scientific_name || 'Scientific name pending'}</span></div><span>{row.verification_status || 'pending'}</span></div>)}</div>
  </div>
}

function InputsManager({ refresh }) {
  const [tab, setTab] = useState('fertilizer')
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name: '', active_ingredient: '', chemical_type: 'fungicide', formulation: '', nutrient_type: '', npk_ratio: '' })
  const [error, setError] = useState('')
  const table = tab === 'fertilizer' ? 'fertilizers' : 'chemicals'
  async function load() { const { data, error } = await supabase.from(table).select(tab === 'fertilizer' ? 'id,name,nutrient_type,npk_ratio,verification_status' : 'id,name,active_ingredient,chemical_type,formulation,verification_status').order('name'); setRows(data ?? []); setError(error?.message ?? '') }
  useEffect(() => { load() }, [tab])
  async function add(e) {
    e.preventDefault(); setError('')
    const payload = tab === 'fertilizer' ? { name: form.name, nutrient_type: form.nutrient_type || null, npk_ratio: form.npk_ratio || null, verification_status: 'pending' } : { name: form.name, active_ingredient: form.active_ingredient || null, chemical_type: form.chemical_type, formulation: form.formulation || null, verification_status: 'pending' }
    const { error } = await supabase.from(table).insert(payload)
    if (error) setError(error.message); else { setForm({ name: '', active_ingredient: '', chemical_type: 'fungicide', formulation: '', nutrient_type: '', npk_ratio: '' }); await load(); refresh() }
  }
  return <div className="cms-section">
    <SectionTitle title="Fertilizer & Chemicals" subtitle="Create master records only; keep new entries pending until verified." />
    <div className="cms-toolbar"><button type="button" className={tab === 'fertilizer' ? 'admin-tab active' : 'admin-tab'} onClick={() => setTab('fertilizer')}>Fertilizers</button><button type="button" className={tab === 'chemical' ? 'admin-tab active' : 'admin-tab'} onClick={() => setTab('chemical')}>Chemicals</button></div>
    <form className="cms-form" onSubmit={add}><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="name" />{tab === 'chemical' ? <><input value={form.active_ingredient} onChange={(e) => setForm({ ...form, active_ingredient: e.target.value })} placeholder="active ingredient" /><select value={form.chemical_type} onChange={(e) => setForm({ ...form, chemical_type: e.target.value })}><option value="fungicide">Fungicide</option><option value="insecticide">Insecticide</option><option value="herbicide">Herbicide</option><option value="other">Other</option></select><input value={form.formulation} onChange={(e) => setForm({ ...form, formulation: e.target.value })} placeholder="formulation" /></> : <><input value={form.nutrient_type} onChange={(e) => setForm({ ...form, nutrient_type: e.target.value })} placeholder="nutrient type" /><input value={form.npk_ratio} onChange={(e) => setForm({ ...form, npk_ratio: e.target.value })} placeholder="NPK ratio" /></>}<button className="primary-action" type="submit">Add record</button></form>
    {error && <div className="error-state"><span>{error}</span></div>}
    <div className="cms-table">{rows.map((row) => <div className="cms-row" key={row.id}><div><strong>{row.name}</strong><span>{row.active_ingredient || row.nutrient_type || '—'}{row.formulation ? ` · ${row.formulation}` : ''}</span></div><span>{row.verification_status || 'pending'}</span></div>)}</div>
  </div>
}

function SourcesManager({ refresh }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ source_name: '', source_type: '', source_url: '', license_type: '', trust_score: '5', description: '' })
  const [error, setError] = useState('')
  async function load() { const { data, error } = await supabase.from('sources').select('id,source_name,source_type,source_url,license_type,trust_score,verification_status,is_active').order('source_name'); setRows(data ?? []); setError(error?.message ?? '') }
  useEffect(() => { load() }, [])
  async function add(e) { e.preventDefault(); setError(''); const { error } = await supabase.from('sources').insert({ ...form, trust_score: Number(form.trust_score) || 5, verification_status: 'pending', is_active: true }); if (error) setError(error.message); else { setForm({ source_name: '', source_type: '', source_url: '', license_type: '', trust_score: '5', description: '' }); await load(); refresh() } }
  return <div className="cms-section">
    <SectionTitle title="Sources" subtitle="Register traceable data sources. Source verification stays separate." />
    <form className="cms-form" onSubmit={add}><input required value={form.source_name} onChange={(e) => setForm({ ...form, source_name: e.target.value })} placeholder="source name" /><input value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} placeholder="source type" /><input type="url" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="source URL" /><input value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value })} placeholder="license" /><input type="number" min="1" max="10" value={form.trust_score} onChange={(e) => setForm({ ...form, trust_score: e.target.value })} placeholder="trust score" /><button className="primary-action" type="submit">Add source</button></form>
    {error && <div className="error-state"><span>{error}</span></div>}
    <div className="cms-table">{rows.map((row) => <div className="cms-row" key={row.id}><div><strong>{row.source_name}</strong><span>{row.source_type || '—'} · {row.source_url || 'No URL'}</span></div><span>{row.verification_status || 'pending'}</span></div>)}</div>
  </div>
}

function ReviewQueue({ refresh }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  async function load() {
    const { data, error } = await supabase.from('advisory_review_queue').select('id,source_claim_id,chemical_match_candidate_id,regulatory_evidence_record_id,review_status,reviewer_notes,created_at').order('created_at', { ascending: true })
    setRows(data ?? []); setError(error?.message ?? '')
  }
  useEffect(() => { load() }, [])
  async function review(row, status) {
    setBusy(row.id); setError('')
    const { error } = await supabase.rpc('review_advisory_claim', { p_queue_id: row.id, p_new_status: status, p_notes: `Admin CMS action: ${status}` })
    if (error) setError(error.message); else { await load(); refresh() }
    setBusy(null)
  }
  return <div className="cms-section">
    <SectionTitle title="Advisory Review Queue" subtitle="Approval actions are database-gated and audited. No automatic pesticide approval occurs." />
    {error && <div className="error-state"><span>{error}</span></div>}
    <div className="cms-table">{rows.length === 0 && <div className="empty-state"><h3>No review items</h3><p>The queue is empty.</p></div>}{rows.map((row) => <div className="review-row" key={row.id}><div><strong>Claim #{row.source_claim_id}</strong><span>Status: {row.review_status}</span><small>Created {new Date(row.created_at).toLocaleString()}</small></div><div className="review-actions"><button type="button" disabled={busy === row.id} onClick={() => review(row, 'approved')}>Approve</button><button type="button" disabled={busy === row.id} onClick={() => review(row, 'rejected')}>Reject</button><button type="button" disabled={busy === row.id} onClick={() => review(row, 'needs_more_evidence')}>Need evidence</button></div></div>)}</div>
  </div>
}

function SectionTitle({ title, subtitle }) { return <div className="cms-title"><div><span className="step-label">CMS</span><h2>{title}</h2><p>{subtitle}</p></div></div> }
