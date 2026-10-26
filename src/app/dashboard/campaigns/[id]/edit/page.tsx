import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { updateCampaign } from '../../actions'
import Link from 'next/link'
import { SubmitButton } from '@/components/submit-button'
import { resolveUserLibrary } from '@/lib/resource-overrides'

export default async function EditCampaignPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (!campaign) {
        notFound()
    }

    if (campaign.status !== 'pending_approval' && campaign.status !== 'draft') {
        return (
            <div className="content-page">
                <section className="page-heading"><div><p className="eyebrow">Edit Campaign</p><h1>Edit a campaign</h1></div></section>
                <div className="panel empty-state">
                    <p className="eyebrow">Editing unavailable</p>
                    <h2>This campaign can no longer be edited</h2>
                    <p>Only campaigns that are awaiting approval can be edited. This one has already been sent or rejected.</p>
                    <Link href={`/dashboard/campaigns/${id}`} className="button primary">Back to campaign</Link>
                </div>
            </div>
        )
    }

    // Fetch Templates
    const { data: rawTemplates } = await supabase
        .from('email_templates')
        .select('id, name, user_id, is_default, source_template_id')
        .order('created_at', { ascending: false })
    const templates = resolveUserLibrary(rawTemplates || [], user.id)

    // Fetch Groups
    const { data: groups } = await supabase
        .from('groups')
        .select('id, name')
        .order('created_at', { ascending: false })

    // Fetch Landing Pages
    const { data: rawLandingPages } = await supabase
        .from('landing_pages')
        .select('id, name, url_slug, user_id, is_default, source_template_id')
        .order('created_at', { ascending: false })
    const customLandingPages = resolveUserLibrary(rawLandingPages || [], user.id)

    const landingPages = [
        { url: '/sign-in-simulation', name: 'Microsoft 365 sign-in simulation' },
        ...((customLandingPages || []).map(p => ({
            url: `/l/${p.url_slug}`,
            name: p.name
        })))
    ]

    return (
        <div className="content-page">
            <section className="page-heading"><div><p className="eyebrow">Edit Campaign</p><h1>Edit a campaign</h1><p>Update this training scenario before an administrator reviews it. Editing does not change your remaining campaign allowance.</p></div></section>
            <div className="request-layout">
            <form action={updateCampaign} className="form-card">
                <input type="hidden" name="id" value={campaign.id} />
                <section className="form-section"><h2>Campaign details</h2><p>Give this simulation a clear internal name.</p><div className="form-grid"><div className="field full">
                    <label htmlFor="title">Campaign name</label>
                    <input
                        type="text"
                        name="title"
                        id="title"
                        required
                        defaultValue={campaign.title}
                        placeholder="e.g. Q4 invoice awareness"
                    />
                    <small>Only workspace members and administrators can see this name.</small>
                </div></div></section>

                <section className="form-section"><h2>Training scenario</h2><p>Connect a message, authorized audience, and educational landing page.</p><div className="form-grid"><div className="field">
                    <label htmlFor="templateId">Email template</label>
                    <select
                        name="templateId"
                        id="templateId"
                        required
                        defaultValue={campaign.template_id}
                    >
                        <option value="">Choose a template</option>
                        {templates?.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div><div className="field">
                    <label htmlFor="groupId">Recipient group</label>
                    <select
                        name="groupId"
                        id="groupId"
                        required
                        defaultValue={campaign.group_id}
                    >
                        <option value="">Choose a group</option>
                        {groups?.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                </div><div className="field full">
                    <label htmlFor="landingPageUrl">Landing page</label>
                    <select
                        name="landingPageUrl"
                        id="landingPageUrl"
                        required
                        defaultValue={campaign.landing_page_url}
                    >
                        <option value="">Choose a landing page</option>
                        {landingPages.map((p) => (
                            <option key={p.url} value={p.url}>{p.name}</option>
                        ))}
                    </select>
                </div></div></section>
                <div className="form-actions"><Link href={`/dashboard/campaigns/${campaign.id}`} className="button secondary">Cancel</Link><SubmitButton label="Save changes" pendingLabel="Saving…" /></div>
            </form>
            <aside className="approval-note"><span>01</span><div><strong>Prepare</strong><p>Select your training content and authorized employee audience.</p></div><span>02</span><div><strong>Admin review</strong><p>An administrator checks consent, scope, and safety.</p></div><span>03</span><div><strong>Deliver & learn</strong><p>Approved campaigns send and live results appear in analytics.</p></div></aside>
            </div>
        </div>
    )
}
