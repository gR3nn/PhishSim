import { createClient } from '@/lib/supabase/server'
import { ResourceLibrary } from '@/components/resource-library'

export default async function GroupsPage() {
    const supabase = await createClient()
    const { data: groups } = await supabase
        .from('groups')
        .select('*, targets(count)')
        .order('created_at', { ascending: false })

    const items = (groups || []).map((group) => ({ id: group.id, title: group.name, subtitle: `${group.targets[0]?.count || 0} authorized recipients`, meta: `Created ${new Date(group.created_at).toLocaleDateString()}`, href: `/dashboard/groups/${group.id}` }))
    return <ResourceLibrary kind="audience" items={items} createHref="/dashboard/groups/create" createLabel="New Group" />
}
