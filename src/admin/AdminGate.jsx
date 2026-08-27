import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AdminDashboard from './AdminDashboard'

export default function AdminGate() {
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setState('denied'); setMessage('Please sign in to access admin.'); return }
      const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (error || data?.role !== 'admin') { setState('denied'); setMessage('Admin access is required.'); return }
      setState('allowed')
    }
    check()
  }, [])

  if (state === 'loading') return <main className="app-shell">Checking admin access…</main>
  if (state === 'denied') return <main className="app-shell"><section className="empty-state"><h2>Access denied</h2><p>{message}</p></section></main>
  return <main className="app-shell"><AdminDashboard /></main>
}
