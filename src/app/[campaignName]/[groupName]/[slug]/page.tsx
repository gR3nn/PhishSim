import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import FakeLoginPage from '@/app/fake-login/page'

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

    // Initialize Supabase Admin Client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Find Campaign by Name
    const decodedCampaignName = decodeURIComponent(campaignName)

    // We'll select the ID. If duplicate names exist, we take the most recent one.
    const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('id,user_id')
        .eq('title', decodedCampaignName)
        .order('created_at', { ascending: false })
        .limit(1)

    const campaignId = campaigns?.[0]?.id
    const campaignOwnerId = campaigns?.[0]?.user_id

    // Check for 'fake-login' special slug
    if (slug === 'fake-login') {
        if (!campaignId) {
            // If we can't find campaign, maybe standard 404 or just render valid login without tracking context?
            // Better to 404 since likely malformed URL
            notFound()
        }

        // Track the click/open here as well since we are intercepting the route
        if (campaignId && targetEmail) {
            const decodedEmail = decodeURIComponent(targetEmail)
            await supabase.from('events').insert([
                {
                    campaign_id: campaignId,
                    target_email: decodedEmail,
                    event_type: 'clicked',
                    user_agent: 'Landing Page Direct Visit'
                },
                {
                    campaign_id: campaignId,
                    target_email: decodedEmail,
                    event_type: 'opened',
                    user_agent: 'Landing Page Triggered'
                }
            ])
        }

        // Render the Fake Login Page
        // Construct the promise it expects
        const fakeLoginParams = Promise.resolve({
            campaignId: campaignId,
            email: targetEmail ? decodeURIComponent(targetEmail) : ''
        })

        return <FakeLoginPage searchParams={fakeLoginParams} />
    }

    // 2. Find Landing Page by Slug (Standard Logic)
    // Landing pages are global or user-specific?
    // The prompt implies generic or user defined.
    // We look up by url_slug.
    const { data: landingPage, error: pageError } = await supabase
        .from('landing_pages')
        .select('html_content')
        .eq('url_slug', slug)
        .eq('user_id', campaignOwnerId || '')
        .limit(1)
        .maybeSingle()

    if (campaignError || pageError || !landingPage) {
        console.error('Landing page or campaign not found:', { campaignError, pageError })
        // Fallback or 404. 
        // If it's a real phishing sim, we might want to fail silently or redirect, but 404 is standard for missing pages.
        notFound()
    }

    // 3. Track Events if target is identified
    if (campaignId && targetEmail) {
        const decodedEmail = decodeURIComponent(targetEmail)

        // We record 'clicked'
        // We also record 'opened' just in case the pixel was blocked.
        // It's safe to fire-and-forget these inserts to not block rendering too much, 
        // but await is safer to ensure they happen.

        // Insert 'clicked'
        const { error: clickError } = await supabase.from('events').insert({
            campaign_id: campaignId,
            target_email: decodedEmail,
            event_type: 'clicked',
            user_agent: 'Landing Page Direct Visit', // We can't easily get headers in Server Component without headers() function, but that makes it dynamic.
            // For sim plicity we leave UA generic or use headers() if strictly needed,
            // but let's keep it simple for now.
        })

        // Insert 'opened' (only if we want to enforce it. Duplicate opened events are usually fine or deduped by analytics, 
        // but here we just append logic).
        await supabase.from('events').insert({
            campaign_id: campaignId,
            target_email: decodedEmail,
            event_type: 'opened',
            user_agent: 'Landing Page Triggered',
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
