import { createClient } from '@/lib/supabase/server'
import { ResourceLibrary } from '@/components/resource-library'
import CreateResourceDialog from '@/components/create-resource-dialog'

export default async function TemplatesPage() {
    const supabase = await createClient()
    const { data: templates } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false })

    const items = (templates || []).map((template) => ({ id: template.id, title: template.name, subtitle: template.subject || 'No subject added', meta: `Updated ${new Date(template.created_at).toLocaleDateString()}`, href: `/dashboard/templates/${template.id}` }))
    return <ResourceLibrary kind="template" items={items} createHref="/dashboard/templates/create" createLabel="New template" createSlot={<CreateResourceDialog kind="template" createHref="/dashboard/templates/create" label="New template" />} />
}
