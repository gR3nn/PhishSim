import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ResourceLibrary } from '@/components/resource-library'
import CreateResourceDialog from '@/components/create-resource-dialog'
import { deleteLandingPage } from './actions'
import { resolveUserLibrary } from '@/lib/resource-overrides'

export default async function LandingPagesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: rawPages } = await supabase
        .from('landing_pages')
        .select('*')
        .order('created_at', { ascending: false })

    const pages = resolveUserLibrary(rawPages || [], user.id)
    const items = pages.map((page) => ({ id: page.id, title: page.name, subtitle: `/l/${page.url_slug}`, meta: page.source_template_id ? 'Your customized version' : page.is_default ? 'Managed default' : `Created ${new Date(page.created_at).toLocaleDateString()}`, href: `/dashboard/landing-pages/${page.id}`, isDefault: Boolean(page.is_default && !page.source_template_id), canDelete: !page.is_default }))
    return <ResourceLibrary kind="page" items={items} createHref="/dashboard/landing-pages/create" createLabel="New Landing Page" createSlot={<CreateResourceDialog kind="landing" createHref="/dashboard/landing-pages/create" label="New Landing Page" />} deleteAction={deleteLandingPage} />
}
