import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ResourceLibrary } from '@/components/resource-library'
import CreateResourceDialog from '@/components/create-resource-dialog'

export default async function LandingPagesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: pages } = await supabase
        .from('landing_pages')
        .select('*')
        .order('created_at', { ascending: false })

    const items = (pages || []).map((page) => ({ id: page.id, title: page.name, subtitle: `/l/${page.url_slug}`, meta: `Created ${new Date(page.created_at).toLocaleDateString()}`, href: `/l/${page.url_slug}` }))
    return <ResourceLibrary kind="page" items={items} createHref="/dashboard/landing-pages/create" createLabel="New landing page" createSlot={<CreateResourceDialog kind="landing" createHref="/dashboard/landing-pages/create" label="New landing page" />} />
}
