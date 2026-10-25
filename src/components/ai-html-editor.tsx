'use client'

import { useState, type ReactNode } from 'react'
import { Code2, Eye, Sparkles, X } from 'lucide-react'

type AiHtmlEditorProps = {
    kind: 'landing' | 'email'
    html: string
    onHtmlChange: (value: string) => void
    textareaName: string
    textareaRequired?: boolean
    starterHtml?: string
    initialTab?: 'code' | 'preview'
    /** Content rendered at the top of the left settings column (details fields, actions, etc.). */
    settings: ReactNode
}

export default function AiHtmlEditor({
    kind,
    html,
    onHtmlChange,
    textareaName,
    textareaRequired = false,
    starterHtml,
    initialTab = 'code',
    settings,
}: AiHtmlEditorProps) {
    const [tab, setTab] = useState<'code' | 'preview'>(initialTab)
    const [aiPrompt, setAiPrompt] = useState('')
    const [aiFiles, setAiFiles] = useState<File[]>([])
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState('')

    const hasExistingHtml = html.trim().length > 0 && html !== (starterHtml ?? '')

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
            form.append('kind', kind)
            aiFiles.forEach((file) => form.append('files', file))
            if (hasExistingHtml) {
                form.append('currentHtml', html)
            }
            const res = await fetch('/api/generate-content', { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) {
                setAiError(data.error || 'Failed to generate the content.')
                return
            }
            onHtmlChange(data.html)
            setTab('preview')
        } catch {
            setAiError('Failed to generate the content.')
        } finally {
            setAiLoading(false)
        }
    }

    const generateLabel = aiLoading
        ? hasExistingHtml
            ? 'Revising…'
            : 'Generating…'
        : hasExistingHtml
            ? 'Iterate with AI'
            : 'Generate with AI'

    return (
        <>
            <section className="landing-settings">
                {settings}

                <div className="landing-ai">
                    <div className="landing-ai-title">
                        <span>
                            <Sparkles size={15} />
                        </span>
                        <div>
                            <h3>Iterate with AI</h3>
                            <p>
                                Upload reference photos, describe what you want, and let AI draft or revise the HTML.
                                {kind === 'email' && (
                                    <>
                                        {' '}
                                        The tracking link <code>{`{{link}}`}</code> is kept automatically.
                                    </>
                                )}
                            </p>
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
                            placeholder={
                                kind === 'email'
                                    ? 'e.g. A password-reset notice from IT with a single call-to-action button.'
                                    : 'e.g. A friendly payroll update notice with our logo colours.'
                            }
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
                        {generateLabel}
                    </button>
                </div>
            </section>

            <section className="landing-editor">
                <div className="editor-tabs">
                    <div>
                        <button type="button" className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}>
                            <Code2 size={14} />
                            HTML
                        </button>
                        <button type="button" className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
                            <Eye size={14} />
                            Preview
                        </button>
                    </div>
                    <span>Live preview</span>
                </div>

                <textarea
                    key={tab === 'code' ? 'code-pane' : 'code-hidden'}
                    name={textareaName}
                    value={html}
                    onChange={(event) => onHtmlChange(event.target.value)}
                    className={tab === 'code' ? 'studio-code editor-fade' : 'hidden'}
                    spellCheck={false}
                    required={textareaRequired}
                />

                <div
                    key={tab === 'preview' ? 'preview-pane' : 'preview-hidden'}
                    className={tab === 'preview' ? 'studio-preview editor-fade' : 'hidden'}
                >
                    <iframe title="Preview" srcDoc={html} sandbox="" />
                </div>
            </section>
        </>
    )
}
