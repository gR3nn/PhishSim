'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileCode2 } from 'lucide-react'
import { updateTemplate } from '../../actions'
import { SubmitButton } from '@/components/submit-button'
import AiHtmlEditor from '@/components/ai-html-editor'

export default function EditTemplateForm({
    template,
}: {
    template: { id: string; name: string; subject: string; body_html: string }
}) {
    const [bodyHtml, setBodyHtml] = useState(template.body_html ?? '')

    return (
        <form action={updateTemplate} className="landing-studio">
            <input type="hidden" name="id" value={template.id} />

            <AiHtmlEditor
                kind="email"
                html={bodyHtml}
                onHtmlChange={setBodyHtml}
                textareaName="bodyHtml"
                textareaRequired
                settings={
                    <>
                        <div className="settings-title">
                            <span>
                                <FileCode2 size={19} />
                            </span>
                            <div>
                                <h2>Template details</h2>
                                <p>Name and subject line for your email.</p>
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="name">Template name</label>
                            <input id="name" name="name" defaultValue={template.name} required />
                        </div>

                        <div className="field">
                            <label htmlFor="subject">Email subject</label>
                            <input id="subject" name="subject" defaultValue={template.subject} required />
                        </div>

                        <div className="studio-safety">
                            <strong>Tracking link</strong>
                            <p>
                                Use <code>{`{{link}}`}</code> in the body to insert the phishing link. It is required for the
                                simulation to work.
                            </p>
                        </div>

                        <div className="studio-actions">
                            <Link href="/dashboard/templates" className="button secondary">
                                Cancel
                            </Link>
                            <SubmitButton label="Save changes" pendingLabel="Saving template…" />
                        </div>
                    </>
                }
            />
        </form>
    )
}
