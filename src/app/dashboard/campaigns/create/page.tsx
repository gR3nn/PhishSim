import { createClient } from '@/lib/supabase/server'
import { launchCampaign } from '../actions'
import Link from 'next/link'
import { SubmitButton } from '@/components/submit-button'

export default async function CreateCampaignPage() {
    const supabase = await createClient()

    // Fetch Templates
    const { data: templates } = await supabase
        .from('email_templates')
        .select('id, name')
        .order('created_at', { ascending: false })

    // Fetch Groups
    const { data: groups } = await supabase
        .from('groups')
        .select('id, name')
        .order('created_at', { ascending: false })

    // Fetch Landing Pages
    const { data: customLandingPages } = await supabase
        .from('landing_pages')
        .select('name, url_slug')
        .order('created_at', { ascending: false })

    const landingPages = [
        { url: '/fake-login', name: 'Fake Microsoft Login' },
        ...((customLandingPages || []).map(p => ({
            url: `/l/${p.url_slug}`,
            name: p.name
        })))
    ]

    return (
        <div className="content-page">
            <section className="page-heading"><div><p className="eyebrow">Campaign builder</p><h1>Request a new simulation</h1><p>Prepare the training scenario and submit it. An administrator will review the audience and content before any email is delivered.</p></div></section>
            <div className="request-layout">
            <form action={launchCampaign} className="form-card">
                <section className="form-section"><h2>Campaign details</h2><p>Give this simulation a clear internal name.</p><div className="form-grid"><div className="field full">
                    <label htmlFor="title">Campaign name</label>
                    <input
                        type="text"
                        name="title"
                        id="title"
                        required
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
                    >
                        <option value="">Choose a template</option>
                        {templates?.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div><div className="field">
                    <label htmlFor="groupId">Authorized audience</label>
                    <select
                        name="groupId"
                        id="groupId"
                        required
                    >
                        <option value="">Choose an audience</option>
                        {groups?.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                </div><div className="field full">
                    <label htmlFor="landingPageUrl">Learning landing page</label>
                    <select
                        name="landingPageUrl"
                        id="landingPageUrl"
                        required
                    >
                        <option value="">Choose a landing page</option>
                        {landingPages.map((p) => (
                            <option key={p.url} value={p.url}>{p.name}</option>
                        ))}
                    </select>
                </div></div></section>
                <div className="form-actions"><Link href="/dashboard" className="button secondary">Cancel</Link><SubmitButton label="Submit for approval" pendingLabel="Submitting request…" /></div>
            </form>
            <aside className="approval-note"><span>01</span><div><strong>Prepare</strong><p>Select your training content and authorized employee audience.</p></div><span>02</span><div><strong>Admin review</strong><p>An administrator checks consent, scope, and safety.</p></div><span>03</span><div><strong>Deliver & learn</strong><p>Approved campaigns send and live results appear in analytics.</p></div></aside>
            </div>
        </div>
    )
}
