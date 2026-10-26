'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Eye, MousePointerClick, Send, ShieldAlert, ShieldCheck } from 'lucide-react'
import { canManageCampaigns, canUseBuilder, type AppRole } from '@/lib/authz'

type Stats = {
    sent: number
    opened: number
    clicked: number
    compromised: number
}

type Campaign = {
    id: string
    title: string
    status: string
    created_at: string
}

type Metric = 'all' | keyof Stats
type DailyActivity = { key: string; label: string; sent: number; opened: number; clicked: number; compromised: number }

export default function DashboardClient({ initialStats, campaigns, role, dailyActivity }: { initialStats: Stats; campaigns: Campaign[]; role: AppRole; dailyActivity: DailyActivity[] }) {
    const [stats, setStats] = useState<Stats>(initialStats)
    const [range, setRange] = useState<7 | 14 | 30>(7)
    const [metric, setMetric] = useState<Metric>('all')
    const supabase = createClient()

    useEffect(() => {
        const channel = supabase
            .channel('realtime events')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'events' },
                (payload) => {
                    const newEvent = payload.new as { event_type: string }
                    setStats((prev) => {
                        const type = newEvent.event_type as keyof Stats
                        if (prev[type] !== undefined) {
                            return { ...prev, [type]: prev[type] + 1 }
                        }
                        return prev
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    const rates = {
        opened: stats.sent ? Math.round((stats.opened / stats.sent) * 100) : 0,
        clicked: stats.sent ? Math.round((stats.clicked / stats.sent) * 100) : 0,
        compromised: stats.sent ? Math.round((stats.compromised / stats.sent) * 100) : 0,
    }
    const visibleActivity = dailyActivity.slice(-range).map((day) => ({ ...day, value: metric === 'all' ? day.opened + day.clicked + day.compromised : day[metric] }))
    const activityMax = Math.max(1, ...visibleActivity.map((day) => day.value))
    const awarenessScore = stats.sent ? Math.max(0, Math.round(100 - (rates.clicked * 0.6) - (rates.compromised * 0.4))) : 0
    const pendingCount = campaigns.filter((campaign) => campaign.status === 'pending_approval').length
    const manager = canManageCampaigns(role)
    const builder = canUseBuilder(role)

    return <div className="dashboard-stack">
        <section className="page-heading">
            <div><p className="eyebrow">{manager ? 'Command center' : role === 'auditor' ? 'Executive view' : role === 'support' ? 'Support workspace' : 'Your workspace'}</p><h1>{manager ? 'Security overview' : role === 'auditor' ? 'Company risk posture' : role === 'support' ? 'Client care overview' : 'Awareness at a glance'}</h1><p>{manager ? 'Review platform activity, campaign performance, and requests needing attention.' : role === 'auditor' ? 'Read-only campaign analytics and historical security performance.' : role === 'support' ? 'Open the support inbox to answer client questions.' : 'Track your organization’s simulations and build safer habits over time.'}</p></div>
            {builder && <Link href="/dashboard/campaigns/create" className="button primary"><Send size={17} /> New Campaign</Link>}
        </section>

        {manager && pendingCount > 0 && <section className="attention-banner"><div className="attention-icon"><ShieldCheck size={22} /></div><div><strong>{pendingCount} request{pendingCount === 1 ? ' is' : 's are'} ready for review</strong><p>Check consent details and approve safe campaigns before delivery.</p></div><Link href="/dashboard/requests">Review queue <ArrowRight size={16} /></Link></section>}

        <section className="stat-grid">
            <StatCard label="Emails delivered" value={stats.sent} meta={`${stats.sent} total delivery events`} tooltip="Number of approved simulation emails delivered to your audiences." icon={Send} tone="blue" active={metric === 'sent'} onSelect={() => setMetric('sent')} />
            <StatCard label="Open rate" value={`${rates.opened}%`} meta={`${stats.opened} unique opens`} tooltip="The percentage of delivered simulation emails that were opened." icon={Eye} tone="violet" active={metric === 'opened'} onSelect={() => setMetric('opened')} />
            <StatCard label="Click rate" value={`${rates.clicked}%`} meta={`${stats.clicked} link clicks`} tooltip="The percentage of recipients who clicked a simulation link." icon={MousePointerClick} tone="amber" active={metric === 'clicked'} onSelect={() => setMetric('clicked')} />
            <StatCard label="Risk events" value={stats.compromised} meta={`${rates.compromised}% of delivered`} tooltip="Simulated form submissions. PhishSafe never stores submitted passwords." icon={ShieldAlert} tone="rose" active={metric === 'compromised'} onSelect={() => setMetric('compromised')} />
        </section>

        <section className="overview-grid">
            <div className="panel chart-panel">
                <div className="panel-heading"><div><p className="eyebrow">Real event activity</p><h2>{metric === 'all' ? 'Engagement' : metric.charAt(0).toUpperCase() + metric.slice(1)} trend</h2></div><div className="chart-controls"><button className={metric === 'all' ? 'active' : ''} onClick={() => setMetric('all')}>All</button>{([7,14,30] as const).map((days) => <button className={range === days ? 'active' : ''} onClick={() => setRange(days)} key={days}>{days}D</button>)}</div></div>
                <div className="chart-wrap" aria-label="Campaign engagement chart">
                    <div className="chart-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
                    <div className={`chart-bars range-${range}`}>{visibleActivity.map((day) => { const height = Math.round((day.value / activityMax) * 100); return <div className="bar-column" key={day.key} data-value={`${day.value} ${metric === 'all' ? 'engagement' : metric} event${day.value === 1 ? '' : 's'}`} tabIndex={0}><div className="bar-track"><span className={day.value === 0 ? 'zero' : ''} style={{ height: `${day.value === 0 ? 2 : height}%` }} /></div><small>{range === 30 ? day.key.slice(8) : day.label}</small></div> })}</div>
                </div>
            </div>
            <div className="panel score-panel">
                <div className="panel-heading"><div><p className="eyebrow">Current posture</p><h2>Awareness score</h2></div></div>
                <div className="score-ring" style={{ '--score': `${awarenessScore}%` } as React.CSSProperties}><div><strong>{awarenessScore}</strong><span>/ 100</span></div></div>
                <p>{stats.sent === 0 ? 'Your score will appear after the first approved simulation is delivered.' : 'Calculated from real click and simulated-risk events across delivered campaigns.'}</p>
                <div className="score-legend"><span><i className="good" />Score {awarenessScore}%</span><span><i className="learning" />Risk {100 - awarenessScore}%</span></div>
            </div>
        </section>

        <section className="panel campaigns-panel">
            <div className="panel-heading"><div><p className="eyebrow">Campaign activity</p><h2>Recent campaigns</h2></div>{builder && <Link href="/dashboard/campaigns/create" className="text-link">New Campaign <ArrowRight size={15} /></Link>}</div>
            {campaigns.length === 0 ? <div className="empty-state"><div><Send size={24} /></div><h3>No campaigns yet</h3><p>{builder ? 'Create your first authorized simulation request and follow its approval here.' : 'Campaign history will appear here when activity is available.'}</p>{builder && <Link href="/dashboard/campaigns/create" className="button primary">Create a campaign</Link>}</div> : <div className="campaign-list">{campaigns.slice(0, 5).map((campaign) => <Link href={`/dashboard/campaigns/${campaign.id}`} className="campaign-row" key={campaign.id}><div className="campaign-monogram">{campaign.title.charAt(0)}</div><div className="campaign-name"><strong>{campaign.title}</strong><span>Created {new Date(campaign.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div><span className={`status-badge ${campaign.status}`}>{campaign.status.replace('_', ' ')}</span><ArrowRight size={17} className="row-arrow" /></Link>)}</div>}
        </section>
    </div>
}

function StatCard({ label, value, meta, tooltip, icon: Icon, tone, active, onSelect }: { label: string; value: string | number; meta: string; tooltip: string; icon: React.ElementType; tone: string; active: boolean; onSelect: () => void }) {
    return <button className={`stat-card ${tone} ${active ? 'selected' : ''}`} type="button" onClick={onSelect} data-tooltip={tooltip}><div className="stat-top"><span>{label}</span><div><Icon size={18} /></div></div><strong>{value}</strong><small>{meta}</small></button>
}
