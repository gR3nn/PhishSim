import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ campaignId: string; email: string }> }
) {
    const { campaignId, email } = await params

    // Use the service-role client to bypass RLS for tracking. If it's not
    // configured, skip logging but STILL return the pixel so the email renders.
    const supabase = createAdminClient()
    if (supabase) {
        const userAgent = request.headers.get('user-agent') || 'unknown'
        const ip = request.headers.get('x-forwarded-for') || 'unknown'

        // Log 'opened' event (best-effort — never block the pixel on a DB error).
        try {
            await supabase.from('events').insert({
                campaign_id: campaignId,
                target_email: decodeURIComponent(email),
                event_type: 'opened',
                user_agent: userAgent,
                ip_address: ip,
            })
        } catch (error) {
            console.error('Failed to log pixel open event:', error)
        }
    }

    // Return 1x1 transparent PNG
    const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64'
    )

    return new NextResponse(pixel, {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
        },
    })
}
