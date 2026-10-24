'use client'

import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { updateTemplate } from '../../actions'
import { SubmitButton } from '@/components/submit-button'

export default function EditTemplateForm({
    template,
}: {
    template: { id: string; name: string; subject: string; body_html: string }
}) {
    const [bodyHtml, setBodyHtml] = useState(template.body_html ?? '')

    const [aiPrompt, setAiPrompt] = useState('')
    const [aiFiles, setAiFiles] = useState<File[]>([])
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState('')

    function addFiles(selected: FileList | null) {
        if (selected) setAiFiles((prev) => [...prev, ...Array.from(selected)])
    }

    function removeFile(index: number) {
        setAiFiles((prev) => prev.filter((_, i) => i !== index))
    }

    async function handleGenerate() {
        setAiLoading(true)
        setAiError('')
        try {
            const form = new FormData()
            form.append('prompt', aiPrompt)
            form.append('kind', 'email')
            aiFiles.forEach((file) => form.append('files', file))
            const res = await fetch('/api/generate-content', { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) {
                setAiError(data.error || 'Failed to generate the email.')
                return
            }
            setBodyHtml(data.html)
        } catch {
            setAiError('Failed to generate the email.')
        } finally {
            setAiLoading(false)
        }
    }

    return (
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

            <div className="landing-ai">
                <div className="landing-ai-title">
                    <span>
                        <Sparkles size={15} />
                    </span>
                    <div>
                        <h3>AI generator</h3>
                        <p>Describe the email, optionally add reference images, and let AI redraft the HTML body. The tracking link <code>{`{{link}}`}</code> is added automatically.</p>
                    </div>
                </div>

                <div className="field">
                    <label htmlFor="aiFiles">Reference media</label>
                    <input
                        id="aiFiles"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => {
                            addFiles(event.target.files)
                            event.target.value = ''
                        }}
                    />
                    <small>Images only — videos are not used by the AI. Describe any motion in the comment instead.</small>
                </div>

                {aiFiles.length > 0 && (
                    <ul className="ai-files">
                        {aiFiles.map((file, index) => (
                            <li key={`${file.name}-${index}`}>
                                <span>{file.name}</span>
                                <button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`}>
                                    <X size={12} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="field">
                    <label htmlFor="aiPrompt">Comment / prompt</label>
                    <textarea
                        id="aiPrompt"
                        value={aiPrompt}
                        onChange={(event) => setAiPrompt(event.target.value)}
                        placeholder="e.g. A password-reset notice from IT with a single call-to-action button."
                    />
                </div>

                {aiError && <div className="auth-message error">{aiError}</div>}

                <button
                    type="button"
                    className="button secondary ai-generate"
                    onClick={handleGenerate}
                    disabled={aiLoading}
                >
                    <Sparkles size={14} />
                    {aiLoading ? 'Generating…' : 'Generate with AI'}
                </button>
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
                        required
                        value={bodyHtml}
                        onChange={(event) => setBodyHtml(event.target.value)}
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
    )
}
