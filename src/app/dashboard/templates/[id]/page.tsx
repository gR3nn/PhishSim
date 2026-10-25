import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { SubmitButton } from '@/components/submit-button'
import { deleteTemplate } from '../actions'

export default async function TemplateDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch Template Details
    const { data: template, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !template) {
        notFound()
    }

    return (
        <div className="content-page">
            <section className="page-heading">
                <div>
                    <p className="eyebrow">Templates</p>
                    <h1>{template.name}</h1>
                    <p>Subject: {template.subject}</p>
                </div>
                <div className="studio-actions">
                    <Link href={`/dashboard/templates/${template.id}/edit`} className="button secondary">
                        <Pencil size={14} />
                        Edit
                    </Link>
                    <form action={deleteTemplate.bind(null, template.id)}>
                        <SubmitButton
                            label="Delete"
                            className="button secondary"
                            confirmMessage="Delete this template? This cannot be undone."
                        />
                    </form>
                </div>
            </section>

            <div className="data-panel">
                <div className="data-panel-head">
                    <div>
                        <h2>Preview</h2>
                        <p>How the email body renders.</p>
                    </div>
                </div>
                <div className="studio-preview">
                    <iframe title="Template Preview" srcDoc={template.body_html} sandbox="" />
                </div>
            </div>

            <div className="data-panel">
                <div className="data-panel-head">
                    <div>
                        <h2>HTML source</h2>
                        <p>The raw markup used for this template.</p>
                    </div>
                </div>
                <pre className="code-block">{template.body_html}</pre>
            </div>
        </div>
    )
}
