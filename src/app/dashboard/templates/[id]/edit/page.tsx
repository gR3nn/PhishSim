import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditTemplateForm from './EditTemplateForm'

export default async function EditTemplatePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single()

    if (!template) {
        notFound()
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <Link href="/dashboard/templates" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 inline-block">
                    ← Back to Templates
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Template</h1>
            </div>

            <EditTemplateForm
                template={{
                    id: template.id,
                    name: template.name,
                    subject: template.subject,
                    body_html: template.body_html,
                }}
            />
        </div>
    )
}
