'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
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
    first_name?: string
    last_name?: string
}

type CampaignDetailsProps = {
    campaign: Campaign
    initialEvents: Event[]
    targets: Target[]
}

export default function CampaignDetailsClient({ campaign, initialEvents, targets }: CampaignDetailsProps) {
    const [events, setEvents] = useState<Event[]>(initialEvents)
    const [isDeleting, setIsDeleting] = useState(false)
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
        try {
            await deleteCampaign(campaign.id)
        } catch (error) {
            console.error('Failed to delete campaign:', error)
            alert('Failed to delete campaign')
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
        let statusColor = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'

        if (targetEvents.some(e => e.event_type === 'compromised')) {
            status = 'Compromised'
            statusColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        } else if (targetEvents.some(e => e.event_type === 'clicked')) {
            status = 'Clicked'
            statusColor = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
        } else if (targetEvents.some(e => e.event_type === 'opened')) {
            status = 'Opened'
            statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
        } else if (targetEvents.some(e => e.event_type === 'sent')) {
            status = 'Sent'
            statusColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
        }

        return { ...target, status, statusColor }
    })

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 inline-block">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{campaign.title}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Launched on {new Date(campaign.created_at).toLocaleDateString()} • {campaign.status}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {(campaign.status === 'pending_approval' || campaign.status === 'draft') && (
                        <Link
                            href={`/dashboard/campaigns/${campaign.id}/edit`}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
                        >
                            Edit campaign
                        </Link>
                    )}
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Campaign'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Sent" value={stats.sent} color="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" />
                <StatCard title="Opened" value={stats.opened} color="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" />
                <StatCard title="Clicked" value={stats.clicked} color="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" />
                <StatCard title="Compromised" value={stats.compromised} color="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" />
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Target Status</h3>
                </div>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {targetStatus.map((target) => (
                        <li key={target.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {target.email}
                                </div>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${target.statusColor}`}>
                                    {target.status}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Event Log</h3>
                </div>
                <div className="flow-root">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {events.map((event) => (
                            <li key={event.id} className="px-4 py-4 sm:px-6 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {event.target_email}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {new Date(event.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="mt-1 text-gray-500 dark:text-gray-400">
                                    Event: <span className="font-semibold">{event.event_type}</span>
                                    {event.ip_address && ` • IP: ${event.ip_address}`}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
    return (
        <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 ${color} transition-colors`}>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase">{title}</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{value}</p>
        </div>
    )
}
