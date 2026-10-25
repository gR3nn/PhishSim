import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CampaignDetailsClient from './CampaignDetailsClient'

export default async function CampaignDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // 1. Fetch Campaign
    const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

    if (!campaign) {
        notFound()
    }

    // 2. Fetch Events
    const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })

    // 3. Fetch Targets
    const { data: targets } = await supabase
        .from('targets')
        .select('*')
        .eq('group_id', campaign.group_id)

    return (
        <CampaignDetailsClient
            campaign={campaign}
            initialEvents={events || []}
            targets={targets || []}
        />
    )
}
