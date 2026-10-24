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
        <div className="content-page">
            <section className="page-heading">
                <div>
                    <Link href="/dashboard/templates" className="eyebrow">
                        ← Back to Templates
                    </Link>
                    <h1>Edit email template</h1>
                    <p>Update the email body and preview the HTML safely before saving.</p>
                </div>
            </section>

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
