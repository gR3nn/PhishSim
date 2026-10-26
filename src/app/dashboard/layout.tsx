import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard-shell'
import { getRole } from '@/lib/authz'
import { getCreditBalance } from '@/lib/credits'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase.from('profiles').select('full_name,role').eq('id', user.id).maybeSingle()
    const email = user.email ?? 'user@phishsafe.app'
    const fallbackName = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    const role = getRole(email, profile?.role)
    const creditCents = role === 'client' ? await getCreditBalance(user.id) : 0
    let campaignsQuery = supabase.from('campaigns').select('id,title,status,created_at,rejection_reason').in('status', ['pending_approval', 'sent', 'rejected']).order('created_at', { ascending: false }).limit(6)
    if (role === 'admin' || role === 'campaign_manager') campaignsQuery = campaignsQuery.eq('status', 'pending_approval')
    const { data: campaignUpdates } = await campaignsQuery
    const notifications = (campaignUpdates || []).map((campaign) => ({
      id: campaign.id,
      title: role === 'admin' || role === 'campaign_manager' ? 'New campaign order' : campaign.status === 'sent' ? 'Campaign approved' : campaign.status === 'rejected' ? 'Changes requested' : 'Waiting for approval',
      detail: campaign.status === 'rejected' && campaign.rejection_reason ? campaign.rejection_reason : campaign.title,
      createdAt: campaign.created_at,
      type: campaign.status === 'sent' ? 'approved' as const : campaign.status === 'rejected' ? 'rejected' as const : 'pending' as const,
    }))

    return <DashboardShell email={email} name={profile?.full_name || fallbackName} role={role} notifications={notifications} creditCents={creditCents}>{children}</DashboardShell>
}
