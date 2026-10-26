import { createClient } from '@/lib/supabase/server'
import { ResourceLibrary } from '@/components/resource-library'
import { deleteGroup } from './actions'

export default async function GroupsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: groups } = await supabase
        .from('groups')
        .select('*, targets(count)')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false })

    const items = (groups || []).map((group) => ({ id: group.id, title: group.name, subtitle: `${group.targets[0]?.count || 0} authorized recipients`, meta: `Created ${new Date(group.created_at).toLocaleDateString()}`, href: `/dashboard/groups/${group.id}`, canDelete: true }))
    return <ResourceLibrary kind="audience" items={items} createHref="/dashboard/groups/create" createLabel="New Group" deleteAction={deleteGroup} />
}
