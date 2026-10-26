import { redirect } from 'next/navigation'
import { Activity, Filter, MousePointerClick, Route, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canManageCampaigns, getRole } from '@/lib/authz'

export default async function ActivityLogsPage({ searchParams }: { searchParams: Promise<{ action?: string; user?: string }> }) {
  const filters = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() : { data: null }
  if (!user || !canManageCampaigns(getRole(user.email, profile?.role))) redirect('/dashboard')
  const admin = createAdminClient()
  if (!admin) return <div className="panel empty-state"><h2>Activity history unavailable</h2><p>Please try again later or contact platform support.</p></div>
  let query = admin.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500)
  if (filters.action) query = query.eq('action', filters.action)
  if (filters.user) query = query.eq('user_id', filters.user)
  const { data: logs } = await query
  const userIds = [...new Set((logs || []).map((log) => log.user_id))]
  const { data: people } = userIds.length ? await admin.from('profiles').select('id,email,full_name').in('id', userIds) : { data: [] }
  const names = new Map((people || []).map((person) => [person.id, person]))

  return <div className="content-page">
    <section className="page-heading"><div><p className="eyebrow">Administrator audit</p><h1>User activity logs</h1><p>A chronological record of page visits and important clicks across every account.</p></div></section>
    <section className="audit-stats"><div><Activity size={18}/><span><strong>{logs?.length || 0}</strong>Recent events</span></div><div><UserRound size={18}/><span><strong>{userIds.length}</strong>Active users</span></div><div><MousePointerClick size={18}/><span><strong>{(logs || []).filter((log) => log.action === 'click').length}</strong>Clicks</span></div></section>
    <section className="data-panel"><div className="data-panel-head"><div><h2>Audit trail</h2><p>Showing the latest 500 matching events</p></div><form className="audit-filters"><Filter size={14}/><select name="action" defaultValue={filters.action || ''}><option value="">All actions</option><option value="page_view">Page views</option><option value="click">Clicks</option></select><select name="user" defaultValue={filters.user || ''}><option value="">All users</option>{(people || []).map((person) => <option value={person.id} key={person.id}>{person.full_name || person.email}</option>)}</select><button className="button secondary">Apply</button></form></div><div className="table-scroll"><table className="app-table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Destination</th><th>Control</th></tr></thead><tbody>{(logs || []).map((log) => { const person = names.get(log.user_id); return <tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td><strong>{person?.full_name || 'User'}</strong><br/><span className="muted">{person?.email}</span></td><td><span className="audit-action">{log.action === 'page_view' ? <Route size={13}/> : <MousePointerClick size={13}/>} {log.action.replace('_',' ')}</span></td><td><code>{log.path}</code></td><td>{log.label || '—'}</td></tr> })}</tbody></table></div></section>
  </div>
}
