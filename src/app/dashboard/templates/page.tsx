import { createClient } from '@/lib/supabase/server'
import { ResourceLibrary } from '@/components/resource-library'
import CreateResourceDialog from '@/components/create-resource-dialog'
import { deleteTemplate } from './actions'
import { resolveUserLibrary } from '@/lib/resource-overrides'

export default async function TemplatesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: rawTemplates } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false })

    const templates = resolveUserLibrary(rawTemplates || [], user?.id || '')
    const items = templates.map((template) => ({ id: template.id, title: template.name, subtitle: template.subject || 'No subject added', meta: template.source_template_id ? 'Your customized version' : template.is_default ? 'Managed default' : `Updated ${new Date(template.updated_at || template.created_at).toLocaleDateString()}`, href: `/dashboard/templates/${template.id}`, isDefault: Boolean(template.is_default && !template.source_template_id), canDelete: !template.is_default }))
    return <ResourceLibrary kind="template" items={items} createHref="/dashboard/templates/create" createLabel="New Email Template" createSlot={<CreateResourceDialog kind="template" createHref="/dashboard/templates/create" label="New Email Template" />} deleteAction={deleteTemplate} />
}
