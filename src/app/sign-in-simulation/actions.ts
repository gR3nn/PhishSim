'use server'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export async function recordSimulationSubmission(formData: FormData) {
    // Credential fields are intentionally ignored and never stored.
    const campaignId = formData.get('campaignId') as string
    const targetEmail = formData.get('targetEmail') as string

    if (!campaignId || !targetEmail) {
        throw new Error('Missing campaign tracking data')
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase.from('events').insert({
        campaign_id: campaignId,
        target_email: decodeURIComponent(targetEmail),
        event_type: 'compromised',
        user_agent: 'submitted-via-simulation-form',
    })

    if (error) {
        console.error('Error recording simulation event:', error)
        throw new Error('Failed to record the simulation event')
    }

    redirect('/training-result?email=' + encodeURIComponent(targetEmail))
}
