import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const tables = [
  ['crops', 'Crops'], ['diseases', 'Diseases'], ['pests', 'Pests'],
  ['weeds', 'Weeds'], ['fertilizers', 'Fertilizers'], ['chemicals', 'Chemicals'],
  ['advisories', 'Advisories'], ['sources', 'Sources'],
]

export default function AdminDashboard() {
  const [counts, setCounts] = useState({})
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    const next = {}
    for (const [table] of tables) {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
      if (!error) next[table] = count ?? 0
    }
    setCounts(next)
  }

  return <section className="admin-page">
    <h1>CropCare AI Admin</h1>
    <p>Manage source-backed agriculture data. Changes require an authenticated admin role.</p>
    {error && <p className="error-state">{error}</p>}
    <div className="admin-grid">{tables.map(([key,label]) => <article className="admin-card" key={key}><span>{label}</span><strong>{counts[key] ?? '—'}</strong></article>)}</div>
  </section>
}
