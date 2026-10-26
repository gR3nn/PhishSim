'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Plus, Sparkles, X, FileText } from 'lucide-react'

type CreateResourceDialogProps = {
    kind: 'landing' | 'template'
    createHref: string
    label: string
}

const handoffKeys = {
    landing: 'phishsafe:create-handoff:landing',
    template: 'phishsafe:create-handoff:template',
} as const

export default function CreateResourceDialog({ kind, createHref, label }: CreateResourceDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [mode, setMode] = useState<'choose' | 'ai'>('choose')
    const [aiPrompt, setAiPrompt] = useState('')
    const [aiFiles, setAiFiles] = useState<File[]>([])
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState('')
    const panelRef = useRef<HTMLDivElement>(null)
    const closeRef = useRef<HTMLButtonElement>(null)

    const apiKind = kind === 'landing' ? 'landing' : 'email'
    const noun = kind === 'landing' ? 'landing page' : 'email template'

    function closeDialog() {
        setOpen(false)
        setMode('choose')
        setAiPrompt('')
        setAiFiles([])
        setAiError('')
        setAiLoading(false)
    }

    // Lock background scroll while the modal is open.
    useEffect(() => {
        if (!open) return
        const previous = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previous
        }
    }, [open])

    useEffect(() => {
        if (!open) return
        closeRef.current?.focus()
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') closeDialog()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [open])

    function addFiles(selected: FileList | null) {
        if (selected) setAiFiles((prev) => [...prev, ...Array.from(selected)])
    }

    function removeFile(index: number) {
        setAiFiles((prev) => prev.filter((_, i) => i !== index))
    }

    function createBlank() {
        closeDialog()
        router.push(createHref)
    }

    async function handleGenerate() {
        setAiLoading(true)
        setAiError('')
        try {
            const form = new FormData()
            form.append('prompt', aiPrompt)
            form.append('kind', apiKind)
            aiFiles.forEach((file) => form.append('files', file))
            const res = await fetch('/api/generate-content', { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) {
                setAiError(data.error || 'Failed to generate the content.')
                return
            }
            sessionStorage.setItem(handoffKeys[kind], JSON.stringify({ html: data.html }))
            closeDialog()
            router.push(createHref)
        } catch {
            setAiError('Failed to generate the content.')
        } finally {
            setAiLoading(false)
        }
    }

    return (
        <>
            <button type="button" className="button primary" onClick={() => setOpen(true)}>
                <Plus size={16} />
                {label}
            </button>

            {open && createPortal(
                <div className="create-modal-backdrop" role="button" tabIndex={-1} aria-label="Close dialog" onClick={closeDialog}>
                    <div
                        ref={panelRef}
                        className="create-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="create-modal-head">
                            <div>
                                <h2 id="create-modal-title">{label}</h2>
                                <p>Start from a blank {noun} or let AI draft one for you.</p>
                            </div>
                            <button ref={closeRef} type="button" className="create-modal-close" onClick={closeDialog} aria-label="Close dialog">
                                <X size={16} />
                            </button>
                        </div>

                        {mode === 'choose' ? (
                            <div className="create-modal-choices">
                                <button type="button" onClick={createBlank}>
                                    <span>
                                        <FileText size={18} />
                                    </span>
                                    <strong>Create blank</strong>
                                    <small>Open the editor with the starter {noun}.</small>
                                </button>
                                <button type="button" onClick={() => setMode('ai')}>
                                    <span>
                                        <Sparkles size={18} />
                                    </span>
                                    <strong>Create with AI</strong>
                                    <small>Describe it and let AI draft the HTML.</small>
                                </button>
                            </div>
                        ) : (
                            <div className="create-modal-ai">
                                <div className="field">
                                    <label htmlFor="createAiFiles">Reference media</label>
                                    <input
                                        id="createAiFiles"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(event) => {
                                            addFiles(event.target.files)
                                            event.target.value = ''
                                        }}
                                    />
                                    <small>Images only — describe any other details in the prompt.</small>
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
                                    <label htmlFor="createAiPrompt">Describe the {noun}</label>
                                    <textarea
                                        id="createAiPrompt"
                                        value={aiPrompt}
                                        onChange={(event) => setAiPrompt(event.target.value)}
                                        placeholder={
                                            kind === 'landing'
                                                ? 'e.g. A friendly payroll update notice with our logo colours.'
                                                : 'e.g. A password-reset notice from IT with a single call-to-action button.'
                                        }
                                    />
                                    {kind === 'template' && (
                                        <small>
                                            The tracking link <code>{`{{link}}`}</code> is kept automatically.
                                        </small>
                                    )}
                                </div>

                                {aiError && <div className="auth-message error">{aiError}</div>}

                                <div className="create-modal-actions">
                                    <button type="button" className="button secondary" onClick={() => setMode('choose')} disabled={aiLoading}>
                                        Back
                                    </button>
                                    <button type="button" className="button primary ai-generate" onClick={handleGenerate} disabled={aiLoading}>
                                        <Sparkles size={14} />
                                        {aiLoading ? 'Generating…' : 'Generate with AI'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
