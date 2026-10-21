'use server'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export async function captureCredentials(formData: FormData) {
    // Submitted credential fields are intentionally ignored and never stored.
    const campaignId = formData.get('campaignId') as string
    const targetEmail = formData.get('targetEmail') as string

    if (!campaignId || !targetEmail) {
        console.error('Missing campaignId or targetEmail')
        // In a real app, we might redirect to an an error page
        throw new Error('Missing tracking data')
    }

    // Use Service Role to bypass RLS
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Log 'compromised' event
    const { error } = await supabase.from('events').insert({
        campaign_id: campaignId,
        target_email: decodeURIComponent(targetEmail),
        event_type: 'compromised',
        user_agent: 'captured-via-form', // We could parse headers if we passed them, but this is simple
        // ip_address: ... (harder to get in Server Action without headers(), but we can try)
    })

    if (error) {
        console.error('Error logging compromise:', error)
        throw new Error('Failed to log event')
    }

    // Redirect to "You Failed" page or similar
    // For now, we'll redirect to a generic warning page or just back to home
    // The prompt says: "Redirects to 'You Failed' warning page"
    redirect('/failed?email=' + encodeURIComponent(targetEmail))
}
