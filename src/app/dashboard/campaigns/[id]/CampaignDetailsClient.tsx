'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil, Mail, MailOpen, MousePointerClick, ShieldAlert } from 'lucide-react'
import { deleteCampaign } from '../actions'

type Campaign = {
    id: string
    title: string
    status: string
    created_at: string
    template_id: string
    group_id: string
}

type Event = {
    id: string
    event_type: 'sent' | 'opened' | 'clicked' | 'compromised'
    target_email: string
    created_at: string
    ip_address?: string
    user_agent?: string
}

type Target = {
    id: string
    email: string
    name?: string
}

type CampaignDetailsProps = {
    campaign: Campaign
    initialEvents: Event[]
    targets: Target[]
}

const statusBadgeClass: Record<string, string> = {
    Sent: 'sent',
    Opened: 'pending',
    Clicked: 'pending_approval',
    Compromised: 'rejected',
}

export default function CampaignDetailsClient({ campaign, initialEvents, targets }: CampaignDetailsProps) {
    const [events, setEvents] = useState<Event[]>(initialEvents)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState('')
    const supabase = createClient()

    useEffect(() => {
        const channel = supabase
            .channel(`campaign-${campaign.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'events',
                    filter: `campaign_id=eq.${campaign.id}`
                },
                (payload) => {
                    setEvents((prev) => [payload.new as Event, ...prev])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, campaign.id])

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
            return
        }

        setIsDeleting(true)
        setDeleteError('')
        try {
            await deleteCampaign(campaign.id)
        } catch (error) {
            console.error('Failed to delete campaign:', error)
            setDeleteError('Failed to delete campaign. Please try again.')
            setIsDeleting(false)
        }
    }

    // Calculate stats
    const stats = {
        sent: events.filter(e => e.event_type === 'sent').length,
        opened: events.filter(e => e.event_type === 'opened').length,
        clicked: events.filter(e => e.event_type === 'clicked').length,
        compromised: events.filter(e => e.event_type === 'compromised').length,
    }

    // Process targets status
    const targetStatus = targets.map(target => {
        const targetEvents = events.filter(e => e.target_email === target.email)
        let status = 'Pending'

        if (targetEvents.some(e => e.event_type === 'compromised')) {
            status = 'Compromised'
        } else if (targetEvents.some(e => e.event_type === 'clicked')) {
            status = 'Clicked'
        } else if (targetEvents.some(e => e.event_type === 'opened')) {
            status = 'Opened'
        } else if (targetEvents.some(e => e.event_type === 'sent')) {
            status = 'Sent'
        }

        return { ...target, status }
    })

    const canEdit = campaign.status === 'pending_approval' || campaign.status === 'draft'

    return (
        <div className="content-page">
            <section className="page-heading">
                <div>
                    <p className="eyebrow">Campaigns</p>
                    <h1>{campaign.title}</h1>
                    <p>
                        Launched {new Date(campaign.created_at).toLocaleDateString()} ·{' '}
                        <span className={`status-badge ${campaign.status}`}>{campaign.status.replace('_', ' ')}</span>
                    </p>
                    {deleteError && <div className="auth-message error fade-in" style={{ marginTop: 12 }}>{deleteError}</div>}
                </div>
                <div className="studio-actions">
                    {canEdit && (
                        <Link href={`/dashboard/campaigns/${campaign.id}/edit`} className="button secondary">
                            <Pencil size={14} />
                            Edit campaign
                        </Link>
                    )}
                    <button type="button" className="button danger" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? 'Deleting…' : 'Delete campaign'}
                    </button>
                </div>
            </section>

            <section className="stat-grid">
                <div className="stat-card blue">
                    <div className="stat-top">
                        <span>Sent</span>
                        <div><Mail size={16} /></div>
                    </div>
                    <strong>{stats.sent}</strong>
                    <small>Simulated emails delivered</small>
                </div>
                <div className="stat-card amber">
                    <div className="stat-top">
                        <span>Opened</span>
                        <div><MailOpen size={16} /></div>
                    </div>
                    <strong>{stats.opened}</strong>
                    <small>Recipients who opened</small>
                </div>
                <div className="stat-card violet">
                    <div className="stat-top">
                        <span>Clicked</span>
                        <div><MousePointerClick size={16} /></div>
                    </div>
                    <strong>{stats.clicked}</strong>
                    <small>Followed the simulated link</small>
                </div>
                <div className="stat-card rose">
                    <div className="stat-top">
                        <span>Compromised</span>
                        <div><ShieldAlert size={16} /></div>
                    </div>
                    <strong>{stats.compromised}</strong>
                    <small>Submitted on the awareness page</small>
                </div>
            </section>

            <div className="data-panel">
                <div className="data-panel-head">
                    <div>
                        <h2>Target status</h2>
                        <p>Where each recipient stands in this simulation.</p>
                    </div>
                </div>
                <div className="table-scroll">
                    <table className="app-table">
                        <thead>
                            <tr>
                                <th>Recipient</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {targetStatus.map((target) => (
                                <tr key={target.id}>
                                    <td><strong>{target.email}</strong></td>
                                    <td>
                                        <span className={`status-badge ${statusBadgeClass[target.status] ?? ''}`}>
                                            {target.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {targetStatus.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="muted">No recipients in this campaign.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="data-panel">
                <div className="data-panel-head">
                    <div>
                        <h2>Event log</h2>
                        <p>{events.length} recorded event{events.length === 1 ? '' : 's'}, newest first.</p>
                    </div>
                </div>
                <div className="table-scroll">
                    <table className="app-table">
                        <thead>
                            <tr>
                                <th>Recipient</th>
                                <th>Event</th>
                                <th>IP address</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((event) => (
                                <tr key={event.id}>
                                    <td><strong>{event.target_email}</strong></td>
                                    <td style={{ textTransform: 'capitalize' }}>{event.event_type}</td>
                                    <td className="muted">{event.ip_address || '—'}</td>
                                    <td className="muted">{new Date(event.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                            {events.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="muted">No events recorded yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
