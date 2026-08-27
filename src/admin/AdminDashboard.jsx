import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const sections = [
  ['overview', 'Overview'],
  ['crops', 'Crops'],
  ['stages', 'Crop Stages'],
  ['issues', 'Diseases / Pests / Weeds'],
  ['fertilizers', 'Fertilizers'],
  ['chemicals', 'Chemicals'],
  ['sources', 'Sources'],
  ['reviews', 'Review Queue'],
]

const issueTabs = [
  ['diseases', 'Diseases'],
  ['pests', 'Pests'],
  ['weeds', 'Weeds'],
]

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {type === 'textarea' ? (
        <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} />
      ) : (
        <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  )
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="admin-section-header">
      <div><div className="admin-kicker">ADMIN CMS</div><h2>{title}</h2><p>{subtitle}</p></div>
      {action}
    </div>
  )
}

export default function AdminDashboard() {
  const [active, setActive] = useState('overview')
  const [counts, setCounts] = useState({})
  const [reloadKey, setReloadKey] = useState(0)

  const refresh = () => setReloadKey((v) => v + 1)

  return (
    <section className="admin-page">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-brand"><div className="admin-logo">🌱</div><div><strong>CropCare CMS</strong><span>Data Management</span></div></div>
          <nav className="admin-nav" aria-label="Admin sections">
            {sections.map(([key, label]) => <button key={key} className={active === key ? 'active' : ''} onClick={() => setActive(key)}>{label}</button>)}
          </nav>
        </aside>
        <div className="admin-main">
          <div className="admin-topbar"><div><span className="admin-status-dot" /> Admin mode</div><button className="admin-refresh" onClick={refresh}>Refresh</button></div>
          {active === 'overview' && <Overview refreshKey={reloadKey} setCounts={setCounts} counts={counts} />}
          {active === 'crops' && <CropsManager onChanged={refresh} />}
          {active === 'stages' && <StagesManager onChanged={refresh} />}
          {active === 'issues' && <IssuesManager onChanged={refresh} />}
          {active === 'fertilizers' && <SimpleManager key={reloadKey} table="fertilizers" title="Fertilizers" fields={[['name', 'Name'], ['nutrient_type', 'Nutrient type'], ['npk_ratio', 'NPK ratio'], ['description', 'Description']] } onChanged={refresh} />}
          {active === 'chemicals' && <SimpleManager key={reloadKey} table="chemicals" title="Chemicals" fields={[['name', 'Name'], ['active_ingredient', 'Active ingredient'], ['chemical_type', 'Type'], ['formulation', 'Formulation'], ['description', 'Description']] } onChanged={refresh} />}
          {active === 'sources' && <SourcesManager onChanged={refresh} />}
          {active === 'reviews' && <ReviewQueue />}
        </div>
      </div>
    </section>
  )
}

function Overview({ setCounts, counts }) {
  const tables = useMemo(() => [
    ['crops', 'Crops'], ['crop_stages', 'Stages'], ['diseases', 'Diseases'], ['pests', 'Pests'], ['weeds', 'Weeds'],
    ['fertilizers', 'Fertilizers'], ['chemicals', 'Chemicals'], ['source_claims', 'Claims'], ['advisory_review_queue', 'Pending Reviews'], ['advisory_rules', 'Rules'],
  ], [])
  useEffect(() => {
    let cancelled = false
    async function load() {
      const next = {}
      await Promise.all(tables.map(async ([table]) => {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
        if (!error) next[table] = count ?? 0
      }))
      if (!cancelled) setCounts(next)
    }
    load()
    return () => { cancelled = true }
  }, [setCounts, tables])

  return <div>
    <SectionHeader title="Database overview" subtitle="Manage source-backed agriculture data without bypassing database RLS." />
    <div className="admin-stat-grid">{tables.map(([key, label]) => <article className="admin-stat" key={key}><span>{label}</span><strong>{counts[key] ?? '—'}</strong></article>)}</div>
    <div className="admin-panel"><h3>Publication safety</h3><p>Only verified/approved records should reach the farmer API. Creating or editing master data here does not auto-publish an advisory.</p></div>
  </div>
}

function CropsManager({ onChanged }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name_en: '', name_hi: '', scientific_name: '', crop_category: '', season: '' })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const load = async () => {
    const { data, error: qError } = await supabase.from('crops').select('id,name_en,name_hi,scientific_name,crop_category,season').order('name_en')
    if (qError) setError(qError.message); else setRows(data ?? [])
  }
  useEffect(() => { load() }, [])
  const save = async (e) => {
    e.preventDefault(); setError('')
    const payload = { ...form }
    const result = editingId ? await supabase.from('crops').update(payload).eq('id', editingId) : await supabase.from('crops').insert(payload)
    if (result.error) return setError(result.error.message)
    setForm({ name_en: '', name_hi: '', scientific_name: '', crop_category: '', season: '' }); setEditingId(null); await load(); onChanged()
  }
  const deactivate = async (id) => {
    setError('')
    const { error: qError } = await supabase.from('crops').update({ active: false }).eq('id', id)
    if (qError) setError(qError.message); else { await load(); onChanged() }
  }
  return <div><SectionHeader title="Crops" subtitle="Add, edit and deactivate crop master records." />
    <form className="admin-form-grid" onSubmit={save}>{Object.entries({ name_en: 'English name', name_hi: 'Hindi name', scientific_name: 'Scientific name', crop_category: 'Category', season: 'Season' }).map(([k,l]) => <Field key={k} label={l} value={form[k]} onChange={(v) => setForm({ ...form, [k]: v })} required={false} />)}<div className="admin-actions"><button className="admin-primary" type="submit">{editingId ? 'Update crop' : 'Add crop'}</button>{editingId && <button type="button" className="admin-secondary" onClick={() => { setEditingId(null); setForm({ name_en: '', name_hi: '', scientific_name: '', crop_category: '', season: '' }) }}>Cancel</button>}</div></form>
    {error && <div className="admin-error">{error}</div>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Crop</th><th>Hindi</th><th>Scientific</th><th>Category</th><th>Season</th><th>Actions</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.name_en}</td><td>{r.name_hi || '—'}</td><td>{r.scientific_name || '—'}</td><td>{r.crop_category || '—'}</td><td>{r.season || '—'}</td><td><button onClick={() => { setEditingId(r.id); setForm({ name_en:r.name_en||'', name_hi:r.name_hi||'', scientific_name:r.scientific_name||'', crop_category:r.crop_category||'', season:r.season||'' }) }}>Edit</button><button className="danger" onClick={() => deactivate(r.id)}>Deactivate</button></td></tr>)}</tbody></table></div>
  </div>
}

function StagesManager({ onChanged }) {
  const [crops, setCrops] = useState([]); const [rows, setRows] = useState([]); const [form, setForm] = useState({ crop_id: '', stage_name_en: '', stage_name_hi: '', stage_order: 1 }); const [error, setError] = useState('')
  useEffect(() => { supabase.from('crops').select('id,name_en').order('name_en').then(({data}) => setCrops(data ?? [])); load() }, [])
  async function load() { const { data, error: qError } = await supabase.from('crop_stages').select('id,crop_id,stage_name_en,stage_name_hi,stage_order').order('stage_order'); if (qError) setError(qError.message); else setRows(data ?? []) }
  async function save(e) { e.preventDefault(); setError(''); const { error: qError } = await supabase.from('crop_stages').insert({ ...form, stage_order: Number(form.stage_order) }); if (qError) setError(qError.message); else { setForm({ crop_id:'', stage_name_en:'', stage_name_hi:'', stage_order:1 }); await load(); onChanged() } }
  return <div><SectionHeader title="Crop stages" subtitle="Maintain crop-stage reference data used by the advisory engine." /><form className="admin-form-grid" onSubmit={save}><label className="admin-field"><span>Crop</span><select value={form.crop_id} onChange={(e)=>setForm({...form,crop_id:e.target.value})} required><option value="">Choose crop</option>{crops.map(c=><option key={c.id} value={c.id}>{c.name_en}</option>)}</select></label><Field label="Stage name (English)" value={form.stage_name_en} onChange={(v)=>setForm({...form,stage_name_en:v})}/><Field label="Stage name (Hindi)" value={form.stage_name_hi} onChange={(v)=>setForm({...form,stage_name_hi:v})}/><Field label="Order" type="number" value={form.stage_order} onChange={(v)=>setForm({...form,stage_order:v})}/><div className="admin-actions"><button className="admin-primary">Add stage</button></div></form>{error&&<div className="admin-error">{error}</div>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Crop</th><th>Stage</th><th>Hindi</th><th>Order</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{crops.find(c=>String(c.id)===String(r.crop_id))?.name_en || r.crop_id}</td><td>{r.stage_name_en}</td><td>{r.stage_name_hi || '—'}</td><td>{r.stage_order}</td></tr>)}</tbody></table></div></div>
}

function IssuesManager({ onChanged }) {
  const [activeTab,setActiveTab] = useState('diseases'); const [rows,setRows]=useState([]); const [crops,setCrops]=useState([]); const [form,setForm]=useState({crop_id:'',name_en:'',name_hi:'',scientific_name:'',symptoms:'',description:''}); const [error,setError]=useState('')
  useEffect(()=>{supabase.from('crops').select('id,name_en').order('name_en').then(({data})=>setCrops(data??[])); load()},[activeTab])
  async function load(){const {data,error:qError}=await supabase.from(activeTab).select('id,crop_id,name_en,name_hi,scientific_name,symptoms,description,verification_status').order('name_en'); if(qError)setError(qError.message);else setRows(data??[])}
  async function save(e){e.preventDefault();setError('');const {error:qError}=await supabase.from(activeTab).insert({...form,verification_status:'pending',validation_status:'pending'});if(qError)setError(qError.message);else{setForm({crop_id:'',name_en:'',name_hi:'',scientific_name:'',symptoms:'',description:''});await load();onChanged()}}
  return <div><SectionHeader title="Issue master" subtitle="Maintain disease, pest and weed reference records. New records stay unverified." /><div className="admin-tabs">{issueTabs.map(([k,l])=><button className={activeTab===k?'active':''} key={k} onClick={()=>setActiveTab(k)}>{l}</button>)}</div><form className="admin-form-grid" onSubmit={save}><label className="admin-field"><span>Crop</span><select value={form.crop_id} onChange={(e)=>setForm({...form,crop_id:e.target.value})} required><option value="">Choose crop</option>{crops.map(c=><option key={c.id} value={c.id}>{c.name_en}</option>)}</select></label><Field label="English name" value={form.name_en} onChange={(v)=>setForm({...form,name_en:v})}/><Field label="Hindi name" value={form.name_hi} onChange={(v)=>setForm({...form,name_hi:v})}/><Field label="Scientific name" value={form.scientific_name} onChange={(v)=>setForm({...form,scientific_name:v})}/><Field label="Symptoms / description" type="textarea" value={form.symptoms} onChange={(v)=>setForm({...form,symptoms:v})}/><div className="admin-actions"><button className="admin-primary">Add {activeTab.slice(0,-1)}</button></div></form>{error&&<div className="admin-error">{error}</div>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Crop</th><th>Name</th><th>Scientific</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{crops.find(c=>String(c.id)===String(r.crop_id))?.name_en || r.crop_id}</td><td>{r.name_en}</td><td>{r.scientific_name||'—'}</td><td><span className="status-pill">{r.verification_status||'pending'}</span></td></tr>)}</tbody></table></div></div>
}

function SimpleManager({ table, title, fields, onChanged }) {
  const [rows,setRows]=useState([]); const [form,setForm]=useState({}); const [error,setError]=useState('')
  useEffect(()=>{load()},[table]); async function load(){const {data,error:qError}=await supabase.from(table).select('*').order('created_at',{ascending:false}).limit(100);if(qError)setError(qError.message);else setRows(data??[])}
  async function save(e){e.preventDefault();setError('');const {error:qError}=await supabase.from(table).insert(form);if(qError)setError(qError.message);else{setForm({});await load();onChanged()}}
  return <div><SectionHeader title={title} subtitle={`Manage ${title.toLowerCase()} without bypassing database validation.`}/><form className="admin-form-grid">{fields.map(([k,l])=><Field key={k} label={l} type={k==='description'?'textarea':'text'} value={form[k]||''} onChange={(v)=>setForm({...form,[k]:v})}/>)}<div className="admin-actions"><button className="admin-primary" type="button" onClick={save}>Add record</button></div></form>{error&&<div className="admin-error">{error}</div>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr>{fields.map(([k,l])=><th key={k}>{l}</th>)}<th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}>{fields.map(([k])=><td key={k}>{String(r[k] ?? '—')}</td>)}<td><span className="status-pill">{r.verification_status||'pending'}</span></td></tr>)}</tbody></table></div></div>
}

function SourcesManager({ onChanged }) {
  const [rows,setRows]=useState([]); const [form,setForm]=useState({source_name:'',source_url:'',source_type:'',license_type:'',description:''}); const [error,setError]=useState('')
  useEffect(()=>{load()},[]); async function load(){const {data,error:qError}=await supabase.from('sources').select('id,source_name,source_url,source_type,license_type,verification_status').order('source_name');if(qError)setError(qError.message);else setRows(data??[])}
  async function save(e){e.preventDefault();setError('');const {error:qError}=await supabase.from('sources').insert({...form,verification_status:'pending',is_active:true});if(qError)setError(qError.message);else{setForm({source_name:'',source_url:'',source_type:'',license_type:'',description:''});await load();onChanged()}}
  return <div><SectionHeader title="Sources" subtitle="Register authoritative documents and source metadata."/><form className="admin-form-grid">{Object.entries({source_name:'Source name',source_url:'URL',source_type:'Source type',license_type:'License',description:'Description'}).map(([k,l])=><Field key={k} label={l} type={k==='description'?'textarea':'text'} value={form[k]} onChange={(v)=>setForm({...form,[k]:v})}/>)}<div className="admin-actions"><button type="button" className="admin-primary" onClick={save}>Add source</button></div></form>{error&&<div className="admin-error">{error}</div>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Source</th><th>Type</th><th>URL</th><th>License</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.source_name}</td><td>{r.source_type||'—'}</td><td>{r.source_url||'—'}</td><td>{r.license_type||'—'}</td><td><span className="status-pill">{r.verification_status||'pending'}</span></td></tr>)}</tbody></table></div></div>
}

function ReviewQueue() {
  const [rows,setRows]=useState([]); const [error,setError]=useState(''); const [busy,setBusy]=useState(null)
  const load=async()=>{const {data,error:qError}=await supabase.from('advisory_review_queue').select('id,source_claim_id,chemical_match_candidate_id,regulatory_evidence_record_id,review_status,reviewer_notes,created_at').order('created_at',{ascending:false});if(qError)setError(qError.message);else setRows(data??[])}
  useEffect(()=>{load()},[])
  async function decide(id,status){setBusy(id);setError('');const {data:result,error:qError}=await supabase.rpc('review_advisory_claim',{p_queue_id:id,p_new_status:status,p_notes:`CMS action: ${status}`});if(qError)setError(qError.message);else if(!result) setError('Review action was not applied.');await load();setBusy(null)}
  return <div><SectionHeader title="Review Queue" subtitle="Review source claims before they can become farmer-facing advisory rules." />{error&&<div className="admin-error">{error}</div>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>Claim</th><th>Chemical match</th><th>Regulatory evidence</th><th>Status</th><th>Decision</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.source_claim_id}</td><td>{r.chemical_match_candidate_id||'—'}</td><td>{r.regulatory_evidence_record_id||'—'}</td><td><span className="status-pill">{r.review_status}</span></td><td><div className="row-actions"><button disabled={busy===r.id} onClick={()=>decide(r.id,'approved')}>Approve</button><button disabled={busy===r.id} onClick={()=>decide(r.id,'needs_more_evidence')}>Need evidence</button><button disabled={busy===r.id} className="danger" onClick={()=>decide(r.id,'rejected')}>Reject</button></div></td></tr>)}</tbody></table></div></div>
}
