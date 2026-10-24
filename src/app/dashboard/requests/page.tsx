import { redirect } from 'next/navigation'
import { Check, Clock3, Mail, ShieldCheck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/authz'
import { approveCampaign, rejectCampaign } from '../campaigns/actions'
import { SubmitButton } from '@/components/submit-button'

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() : { data: null }
  if (!user || !isAdmin(user.email, profile?.role)) redirect('/dashboard')

  const { data: requests } = await supabase.from('campaigns').select('id,title,status,created_at,user_id,groups(name,targets(count)),email_templates(name,subject)').order('created_at', { ascending: false })
  const queue = requests || []

  return <div className="content-page">
    <section className="page-heading"><div><p className="eyebrow">Pending Campaigns</p><h1>Pending campaigns</h1><p>Verify that each request has an authorized audience and suitable training content before delivery.</p></div></section>
    <section className="stat-grid compact-stats">
      <MiniStat icon={Clock3} label="Awaiting review" value={queue.filter((item) => item.status === 'pending_approval').length} />
      <MiniStat icon={Check} label="Approved" value={queue.filter((item) => item.status === 'sent').length} />
      <MiniStat icon={X} label="Needs changes" value={queue.filter((item) => item.status === 'rejected').length} />
      <MiniStat icon={ShieldCheck} label="Policy checks" value="Active" />
    </section>
    <section className="data-panel">
      <div className="data-panel-head"><div><h2>Review queue</h2><p>Newest requests appear first</p></div></div>
      {queue.length === 0 ? <div className="empty-state"><div><Mail size={24} /></div><h3>The queue is clear</h3><p>New client campaign requests will appear here.</p></div> : <div className="table-scroll"><table className="app-table"><thead><tr><th>Campaign</th><th>Template</th><th>Audience</th><th>Status</th><th>Requested</th><th>Decision</th></tr></thead><tbody>{queue.map((item) => {
        const template = Array.isArray(item.email_templates) ? item.email_templates[0] : item.email_templates as { name?: string; subject?: string } | null
        const group = Array.isArray(item.groups) ? item.groups[0] : item.groups as { name?: string } | null
        return <tr key={item.id}><td><strong>{item.title}</strong><br/><span className="muted">ID {item.id.slice(0,8)}</span></td><td>{template?.name || 'Custom'}<br/><span className="muted">{template?.subject}</span></td><td>{group?.name || 'Audience group'}</td><td><span className={`status-badge ${item.status}`}>{item.status.replace('_',' ')}</span></td><td>{new Date(item.created_at).toLocaleDateString()}</td><td>{item.status === 'pending_approval' ? <div className="decision-actions"><form action={approveCampaign.bind(null, item.id)}><SubmitButton className="mini-button approve" label="✓" pendingLabel="…" title="Approve campaign" confirmMessage="Approve and deliver this campaign to its authorized audience?" /></form><form action={rejectCampaign}><input type="hidden" name="campaignId" value={item.id}/><input type="hidden" name="reason" value="Please review the audience or campaign content."/><SubmitButton className="mini-button reject" label="×" pendingLabel="…" title="Request changes" confirmMessage="Reject this request and ask the client for changes?" /></form></div> : <span className="muted">Completed</span>}</td></tr>
      })}</tbody></table></div>}
    </section>
  </div>
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><div><Icon size={17}/></div></div><strong>{value}</strong></article>
}
