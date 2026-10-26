import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, CalendarDays, Check, FileText, Mail, ShieldCheck, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { canManageCampaigns, getRole } from '@/lib/authz'
import { approveCampaign, rejectCampaign } from '../../campaigns/actions'
import { SubmitButton } from '@/components/submit-button'

export default async function CampaignReviewPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: reviewerProfile } = user
        ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        : { data: null }

    if (!user || !canManageCampaigns(getRole(user.email, reviewerProfile?.role))) redirect('/dashboard')

    const { data: campaign } = await supabase
        .from('campaigns')
        .select('id,title,status,created_at,requested_at,user_id,template_id,group_id,landing_page_url,rejection_reason')
        .eq('id', id)
        .maybeSingle()

    if (!campaign) notFound()

    const [templateResult, groupResult, targetsResult, ownerResult] = await Promise.all([
        supabase.from('email_templates').select('name,subject,body_html').eq('id', campaign.template_id).maybeSingle(),
        supabase.from('groups').select('name').eq('id', campaign.group_id).maybeSingle(),
        supabase.from('targets').select('id,email,name').eq('group_id', campaign.group_id).order('email'),
        supabase.from('profiles').select('email,full_name').eq('id', campaign.user_id).maybeSingle(),
    ])

    const template = templateResult.data
    const group = groupResult.data
    const targets = targetsResult.data || []
    const owner = ownerResult.data
    const landingUrl = campaign.landing_page_url || ''
    const builtInLanding = landingUrl === '/sign-in-simulation'
    let landingPage: { name: string; html_content: string } | null = null

    if (landingUrl.startsWith('/l/')) {
        const slug = landingUrl.slice(3)
        const { data: pages } = await supabase
            .from('landing_pages')
            .select('name,html_content,user_id,is_default')
            .eq('url_slug', slug)
            .limit(20)
        landingPage = pages?.find((page) => page.user_id === campaign.user_id)
            || pages?.find((page) => page.is_default)
            || null
    }

    const requestedAt = campaign.requested_at || campaign.created_at
    const emailPreview = template?.body_html?.replace(/{{link}}/g, '#') || '<p>Email content is unavailable.</p>'
    const isPending = campaign.status === 'pending_approval'

    return (
        <div className="content-page">
            <section className="page-heading review-heading">
                <div>
                    <Link href="/dashboard/requests" className="back-link"><ArrowLeft size={14}/> Back to review queue</Link>
                    <p className="eyebrow">Campaign review</p>
                    <h1>{campaign.title}</h1>
                    <p>Inspect the message, destination, and authorized audience before making a delivery decision.</p>
                </div>
                <span className={`status-badge ${campaign.status}`}>{campaign.status.replace('_', ' ')}</span>
            </section>

            <section className="review-facts">
                <article><span><Mail size={17}/></span><div><small>Email template</small><strong>{template?.name || 'Unavailable'}</strong></div></article>
                <article><span><Users size={17}/></span><div><small>Audience</small><strong>{group?.name || 'Unavailable'} · {targets.length} recipient{targets.length === 1 ? '' : 's'}</strong></div></article>
                <article><span><ShieldCheck size={17}/></span><div><small>Requested by</small><strong>{owner?.full_name || owner?.email || 'Client account'}</strong></div></article>
                <article><span><CalendarDays size={17}/></span><div><small>Requested</small><strong>{new Date(requestedAt).toLocaleString()}</strong></div></article>
            </section>

            <section className="review-preview-grid">
                <article className="review-preview-card">
                    <header><div><span><Mail size={16}/></span><div><small>Email preview</small><strong>{template?.subject || 'No subject'}</strong></div></div><em>{template?.name || 'Template'}</em></header>
                    <div className="review-frame-shell email"><iframe title="Campaign email preview" srcDoc={emailPreview} sandbox=""/></div>
                </article>

                <article className="review-preview-card">
                    <header><div><span><FileText size={16}/></span><div><small>Landing-page preview</small><strong>{builtInLanding ? 'Microsoft 365 sign-in simulation' : landingPage?.name || 'Landing page unavailable'}</strong></div></div><em>{landingUrl || 'No destination'}</em></header>
                    <div className="review-frame-shell landing">
                        {builtInLanding
                            ? <iframe title="Campaign landing-page preview" src={`/sign-in-simulation?campaignId=${campaign.id}`} sandbox=""/>
                            : landingPage
                                ? <iframe title="Campaign landing-page preview" srcDoc={landingPage.html_content} sandbox=""/>
                                : <div className="review-preview-empty"><FileText size={24}/><strong>Preview unavailable</strong><p>The selected landing page could not be found.</p></div>}
                    </div>
                </article>
            </section>

            <section className="data-panel">
                <div className="data-panel-head"><div><h2>Authorized audience</h2><p>Review every recipient included in this campaign.</p></div><span className="recipient-count">{targets.length} total</span></div>
                <div className="table-scroll"><table className="app-table review-audience-table"><thead><tr><th>Name</th><th>Email address</th></tr></thead><tbody>{targets.map((target) => <tr key={target.id}><td><strong>{target.name || 'Not provided'}</strong></td><td>{target.email}</td></tr>)}{targets.length === 0 && <tr><td colSpan={2} className="muted">No recipients were found for this audience.</td></tr>}</tbody></table></div>
            </section>

            {isPending ? (
                <section className="review-decision-bar">
                    <div><p className="eyebrow">Final decision</p><h2>Ready to approve this campaign?</h2><p>Approval immediately begins delivery to the {targets.length} listed recipient{targets.length === 1 ? '' : 's'}.</p></div>
                    <div className="review-decision-actions">
                        <form action={rejectCampaign} className="review-reject-form">
                            <input type="hidden" name="campaignId" value={campaign.id}/>
                            <input name="reason" aria-label="Reason for requesting changes" placeholder="Reason for requesting changes" defaultValue="Please review the audience or campaign content." required/>
                            <SubmitButton className="button danger" label="Request changes" pendingLabel="Sending…" title="Request changes" confirmMessage="Reject this request and send it back for changes?" />
                        </form>
                        <form action={approveCampaign.bind(null, campaign.id)}>
                            <SubmitButton className="button primary" label="Approve & deliver" pendingLabel="Delivering…" title="Approve campaign" confirmMessage={`Approve and deliver this campaign to ${targets.length} authorized recipient${targets.length === 1 ? '' : 's'}?`} />
                        </form>
                    </div>
                </section>
            ) : (
                <section className="review-complete-note"><span>{campaign.status === 'sent' ? <Check size={18}/> : <X size={18}/>}</span><div><strong>{campaign.status === 'sent' ? 'Campaign approved and delivered' : 'Changes were requested'}</strong>{campaign.rejection_reason && <p>{campaign.rejection_reason}</p>}</div></section>
            )}
        </div>
    )
}
