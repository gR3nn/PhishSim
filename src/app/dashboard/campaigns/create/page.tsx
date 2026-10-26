import { createClient } from '@/lib/supabase/server'
import { launchCampaign } from '../actions'
import Link from 'next/link'
import { SubmitButton } from '@/components/submit-button'
import { getEntitlement } from '@/lib/entitlements'
import { resolveUserLibrary } from '@/lib/resource-overrides'
import { canManageCampaigns, getRole } from '@/lib/authz'

export default async function CreateCampaignPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user
        ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        : { data: null }
    const hasUnlimitedAccess = canManageCampaigns(getRole(user?.email, profile?.role))
    const entitlement = user && !hasUnlimitedAccess ? await getEntitlement(user.id) : null

    if (!hasUnlimitedAccess && !entitlement?.canCreate) {
        return (
            <div className="content-page">
                <section className="page-heading"><div><p className="eyebrow">New Campaign</p><h1>Create a campaign</h1></div></section>
                <div className="panel empty-state">
                    <p className="eyebrow">No campaigns available</p>
                    <h2>Purchase a plan to create campaigns</h2>
                    <p>You&apos;ve used all campaigns included in your plan this month, or you don&apos;t have an active plan yet.</p>
                    <Link href="/dashboard/services" className="button primary">View plans</Link>
                </div>
            </div>
        )
    }

    const remainingNote = hasUnlimitedAccess
        ? 'Unlimited campaign access'
        : entitlement && Number.isFinite(entitlement.remainingMonthly) && entitlement.remainingMonthly > 0
            ? `${entitlement.remainingMonthly} campaign${entitlement.remainingMonthly === 1 ? '' : 's'} remaining this month`
            : entitlement && entitlement.oneTimeCredits > 0
                ? `${entitlement.oneTimeCredits} one-time credit${entitlement.oneTimeCredits === 1 ? '' : 's'} available`
                : 'Unlimited campaigns this month'

    // Fetch Templates
    const { data: rawTemplates } = await supabase
        .from('email_templates')
        .select('id, name, user_id, is_default, source_template_id')
        .order('created_at', { ascending: false })
    const templates = resolveUserLibrary(rawTemplates || [], user!.id)

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
    const customLandingPages = resolveUserLibrary(rawLandingPages || [], user!.id)

    const landingPages = [
        { url: '/sign-in-simulation', name: 'Microsoft 365 sign-in simulation' },
        ...((customLandingPages || []).map(p => ({
            url: `/l/${p.url_slug}`,
            name: p.name
        })))
    ]

    return (
        <div className="content-page">
            <section className="page-heading"><div><p className="eyebrow">New Campaign</p><h1>Create a campaign</h1><p>Prepare the training scenario and submit it. An administrator will review the audience and content before any email is delivered.</p><small>{remainingNote}</small></div></section>
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

                <section className="form-section"><h2>Training scenario</h2><p>Connect a message, recipient group, and educational landing page.</p><div className="form-grid"><div className="field">
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
                    <label htmlFor="groupId">Recipient group</label>
                    <select
                        name="groupId"
                        id="groupId"
                        required
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
                    >
                        <option value="">Choose a landing page</option>
                        {landingPages.map((p) => (
                            <option key={p.url} value={p.url}>{p.name}</option>
                        ))}
                    </select>
                </div></div></section>
                <div className="form-actions"><Link href="/dashboard" className="button secondary">Cancel</Link><SubmitButton label="Submit for approval" pendingLabel="Submitting request…" /></div>
            </form>
            <aside className="approval-note"><span>01</span><div><strong>Prepare</strong><p>Select your training content and authorized recipient group.</p></div><span>02</span><div><strong>Admin review</strong><p>An administrator checks consent, scope, and safety.</p></div><span>03</span><div><strong>Deliver & learn</strong><p>Approved campaigns send and live results appear in analytics.</p></div></aside>
            </div>
        </div>
    )
}
