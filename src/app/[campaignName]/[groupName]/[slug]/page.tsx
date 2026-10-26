import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import SignInSimulationPage from '@/app/sign-in-simulation/page'

export default async function LandingPage({
    params,
    searchParams,
}: {
    params: Promise<{ campaignName: string; groupName: string; slug: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { campaignName, slug } = await params
    const resolvedSearchParams = await searchParams
    const targetEmail = resolvedSearchParams.t as string | undefined
    const campaignIdParam = resolvedSearchParams.c as string | undefined

    // Service-role client (bypasses RLS). If it isn't configured, the page
    // can't resolve its content, so 404 cleanly rather than throwing a 500.
    const supabase = createAdminClient()
    if (!supabase) {
        notFound()
    }

    // 1. Resolve the campaign.
    // Prefer the stable campaign id carried on the link (`c`). Fall back to the
    // legacy title lookup so links already sitting in inboxes keep working.
    const decodedCampaignName = decodeURIComponent(campaignName)

    let campaignId: string | undefined
    let campaignOwnerId: string | undefined
    let campaignError: unknown = null

    if (campaignIdParam) {
        const { data: campaign, error } = await supabase
            .from('campaigns')
            .select('id,user_id')
            .eq('id', campaignIdParam)
            .maybeSingle()
        campaignId = campaign?.id
        campaignOwnerId = campaign?.user_id
        campaignError = error
    } else {
        // Legacy fallback: resolve by title. If duplicate titles exist, take the most recent.
        const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('id,user_id')
            .eq('title', decodedCampaignName)
            .order('created_at', { ascending: false })
            .limit(1)
        campaignId = campaigns?.[0]?.id
        campaignOwnerId = campaigns?.[0]?.user_id
        campaignError = error
    }

    // The built-in sign-in scenario records form submission without retaining credentials.
    if (slug === 'sign-in-simulation') {
        if (!campaignId) {
            // If we can't find campaign, maybe standard 404 or just render valid login without tracking context?
            // Better to 404 since likely malformed URL
            notFound()
        }

        // Log a single 'clicked' event for this landing visit.
        // 'opened' is logged exclusively by the tracking pixel route.
        if (campaignId && targetEmail) {
            const decodedEmail = decodeURIComponent(targetEmail)
            await supabase.from('events').insert({
                campaign_id: campaignId,
                target_email: decodedEmail,
                event_type: 'clicked',
                user_agent: 'Landing Page Direct Visit',
            })
        }

        const simulationParams = Promise.resolve({
            campaignId: campaignId,
            email: targetEmail ? decodeURIComponent(targetEmail) : ''
        })

        return <SignInSimulationPage searchParams={simulationParams} />
    }

    // 2. Find Landing Page by Slug (Standard Logic)
    // Landing pages are global or user-specific?
    // The prompt implies generic or user defined.
    // We look up by url_slug.
    const { data: landingPages, error: pageError } = await supabase
        .from('landing_pages')
        .select('html_content,user_id,is_default')
        .eq('url_slug', slug)
        .limit(20)
    const landingPage = landingPages?.find((page) => page.user_id === campaignOwnerId) || landingPages?.find((page) => page.is_default)

    if (campaignError || pageError || !landingPage) {
        console.error('Landing page or campaign not found:', { campaignError, pageError })
        // Fallback or 404. 
        // If it's a real phishing sim, we might want to fail silently or redirect, but 404 is standard for missing pages.
        notFound()
    }

    // 3. Track a single 'clicked' event if the target is identified.
    // 'opened' is logged exclusively by the tracking pixel route, so we no longer
    // double-insert an 'opened' here (that caused analytics to over-count).
    if (campaignId && targetEmail) {
        const decodedEmail = decodeURIComponent(targetEmail)

        const { error: clickError } = await supabase.from('events').insert({
            campaign_id: campaignId,
            target_email: decodedEmail,
            event_type: 'clicked',
            user_agent: 'Landing Page Direct Visit',
        })

        if (clickError) {
            console.error('Error tracking click:', clickError)
        }
    }

    // 4. Render Content
    // WARNING: This is a phishing simulator. We are intentionally rendering arbitrary HTML.
    // In a real app this is XSS central.

    return (
        <div
            dangerouslySetInnerHTML={{ __html: landingPage.html_content }}
            className="w-full h-full"
        />
    )
}
