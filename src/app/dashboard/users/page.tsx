import { redirect } from 'next/navigation'
import { Ban, CheckCircle2, ShieldCheck, UserRound, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_EMAILS, isAdmin } from '@/lib/authz'
import { deleteAccount, setUserBan, updateUserRole } from './actions'
import AccountActionButton from './AccountActionButton'
import { SubmitButton } from '@/components/submit-button'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentProfile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() : { data: null }
  if (!user || !isAdmin(user.email, currentProfile?.role)) redirect('/dashboard')

  const admin = createAdminClient()
  const [{ data: authData }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from('profiles').select('id,email,full_name,role,created_at'),
  ])
  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))
  type ManagedUser = (typeof authData.users)[number] & { banned_until?: string }
  const users = authData.users.map((authUser) => ({ authUser: authUser as ManagedUser, profile: profileMap.get(authUser.id) }))
  const adminCount = users.filter(({ authUser, profile }) => isAdmin(authUser.email, profile?.role)).length
  const bannedCount = users.filter(({ authUser }) => authUser.banned_until && new Date(authUser.banned_until) > new Date()).length

  return <div className="content-page">
    <section className="page-heading"><div><p className="eyebrow">Administrator</p><h1>Account management</h1><p>Review every registered account, change access roles, suspend sign-in, or permanently remove an account.</p></div></section>
    <section className="admin-user-stats"><div><Users size={18}/><span><strong>{users.length}</strong>Total accounts</span></div><div><ShieldCheck size={18}/><span><strong>{adminCount}</strong>Administrators</span></div><div><Ban size={18}/><span><strong>{bannedCount}</strong>Suspended</span></div></section>
    <section className="data-panel"><div className="data-panel-head"><div><h2>Registered accounts</h2><p>Authentication and profile data from Supabase</p></div></div><div className="table-scroll"><table className="app-table account-table"><thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Created</th><th>Controls</th></tr></thead><tbody>{users.map(({ authUser, profile }) => {
      const email = authUser.email || ''
      const protectedAdmin = ADMIN_EMAILS.includes(email.toLowerCase() as (typeof ADMIN_EMAILS)[number])
      const role = isAdmin(email, profile?.role) ? 'admin' : 'client'
      const banned = Boolean(authUser.banned_until && new Date(authUser.banned_until) > new Date())
      return <tr key={authUser.id}><td><div className="table-user"><span><UserRound size={15}/></span><div><strong>{profile?.full_name || authUser.user_metadata?.full_name || 'Workspace user'}</strong><small>{email}</small></div></div></td><td>{protectedAdmin ? <span className="role-pill admin"><span/>Admin</span> : <form action={updateUserRole} className="role-form"><input type="hidden" name="userId" value={authUser.id}/><input type="hidden" name="email" value={email}/><select name="role" defaultValue={role}><option value="client">Client</option><option value="admin">Admin</option></select><SubmitButton className="mini-button approve" label="Save" pendingLabel="…" /></form>}</td><td><span className={`account-status ${banned ? 'banned' : 'active'}`}>{banned ? <Ban size={12}/> : <CheckCircle2 size={12}/>} {banned ? 'Suspended' : 'Active'}</span></td><td>{new Date(authUser.created_at).toLocaleDateString()}</td><td>{protectedAdmin ? <span className="muted">Protected owner</span> : <div className="account-actions"><form action={setUserBan}><input type="hidden" name="userId" value={authUser.id}/><input type="hidden" name="email" value={email}/><input type="hidden" name="ban" value={String(!banned)}/><AccountActionButton action={banned ? 'restore' : 'ban'}/></form><form action={deleteAccount}><input type="hidden" name="userId" value={authUser.id}/><input type="hidden" name="email" value={email}/><AccountActionButton action="delete"/></form></div>}</td></tr>
    })}</tbody></table></div></section>
  </div>
}
