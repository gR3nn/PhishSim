import { redirect } from 'next/navigation'
import { AtSign, CalendarDays, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getRole, ROLE_LABELS } from '@/lib/authz'
import AccountSettings from './AccountSettings'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('full_name,role,created_at').eq('id', user.id).maybeSingle()
  const email = user.email || ''
  const role = getRole(email, profile?.role)
  const name = profile?.full_name || email.split('@')[0]

  return <div className="content-page">
    <section className="page-heading"><div><p className="eyebrow">Account settings</p><h1>Your profile</h1><p>Review your account information and manage your sign-in password.</p></div></section>
    <section className="profile-hero"><div className="profile-avatar">{name.charAt(0).toUpperCase()}</div><div className="profile-identity"><h2>{name}</h2><p><AtSign size={13}/>{email}</p></div><div className="profile-facts"><span><ShieldCheck size={15}/><strong>{ROLE_LABELS[role]}</strong>Access level</span><span><CalendarDays size={15}/><strong>{new Date(profile?.created_at || user.created_at).toLocaleDateString()}</strong>Member since</span></div></section>
    <AccountSettings id={user.id} initialName={name}/>
  </div>
}
