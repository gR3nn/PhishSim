import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { updateTemplate } from '../../actions'
import { SubmitButton } from '@/components/submit-button'

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

            <form action={updateTemplate} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow transition-colors">
                <input type="hidden" name="id" value={template.id} />

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Template Name
                    </label>
                    <input
                        type="text"
                        name="name"
                        id="name"
                        defaultValue={template.name}
                        required
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>

                <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Subject
                    </label>
                    <input
                        type="text"
                        name="subject"
                        id="subject"
                        defaultValue={template.subject}
                        required
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>

                <div>
                    <label htmlFor="bodyHtml" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Body (HTML)
                    </label>
                    <div className="mt-1">
                        <textarea
                            name="bodyHtml"
                            id="bodyHtml"
                            rows={10}
                            defaultValue={template.body_html}
                            required
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        You can use HTML here. Use <code>{`{{link}}`}</code> to insert the phishing link.
                    </p>
                </div>

                <div className="flex justify-end">
                    <SubmitButton label="Save changes" pendingLabel="Saving template…" />
                </div>
            </form>
        </div>
    )
}
