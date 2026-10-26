import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import { getRole } from '@/lib/authz'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() : { data: null }

    // Fetch initial stats
    // We can do this with 4 queries or one group by.
    // Group by is better but Supabase JS simple client might need raw SQL or multiple queries.
    // Separate count queries keep each dashboard metric explicit and independently scoped.

    const { count: sent } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'sent')

    const { count: opened } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'opened')

    const { count: clicked } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'clicked')

    const { count: compromised } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'compromised')

    const initialStats = {
        sent: sent || 0,
        opened: opened || 0,
        clicked: clicked || 0,
        compromised: compromised || 0,
    }

    const since = new Date()
    since.setUTCHours(0, 0, 0, 0)
    since.setUTCDate(since.getUTCDate() - 29)
    const { data: recentEvents } = await supabase
        .from('events')
        .select('created_at,event_type')
        .gte('created_at', since.toISOString())
        .in('event_type', ['sent', 'opened', 'clicked', 'compromised'])
    const dailyActivity = Array.from({ length: 30 }, (_, index) => {
        const date = new Date(since)
        date.setUTCDate(since.getUTCDate() + index)
        const key = date.toISOString().slice(0, 10)
        return {
            key,
            label: date.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' }),
            sent: (recentEvents || []).filter((event) => event.created_at.slice(0, 10) === key && event.event_type === 'sent').length,
            opened: (recentEvents || []).filter((event) => event.created_at.slice(0, 10) === key && event.event_type === 'opened').length,
            clicked: (recentEvents || []).filter((event) => event.created_at.slice(0, 10) === key && event.event_type === 'clicked').length,
            compromised: (recentEvents || []).filter((event) => event.created_at.slice(0, 10) === key && event.event_type === 'compromised').length,
        }
    })

    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

    return <DashboardClient initialStats={initialStats} campaigns={campaigns || []} role={getRole(user?.email, profile?.role)} dailyActivity={dailyActivity} />
}
