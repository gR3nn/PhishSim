'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileCode2 } from 'lucide-react'
import { updateLandingPage } from '../../actions'
import { SubmitButton } from '@/components/submit-button'
import AiHtmlEditor from '@/components/ai-html-editor'

export default function EditLandingPageForm({
    page,
}: {
    page: { id: string; name: string; url_slug: string; html_content: string }
}) {
    const [html, setHtml] = useState(page.html_content ?? '')

    return (
        <form action={updateLandingPage} className="landing-studio">
            <input type="hidden" name="id" value={page.id} />

            <AiHtmlEditor
                kind="landing"
                html={html}
                onHtmlChange={setHtml}
                textareaName="htmlContent"
                textareaRequired
                settings={
                    <>
                        <div className="settings-title">
                            <span>
                                <FileCode2 size={19} />
                            </span>
                            <div>
                                <h2>Page details</h2>
                                <p>Name and address for your page.</p>
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="name">Page name</label>
                            <input id="name" name="name" defaultValue={page.name} required />
                        </div>

                        <div className="field">
                            <label htmlFor="urlSlug">URL slug</label>
                            <div className="slug-input">
                                <span>/l/</span>
                                <input
                                    id="urlSlug"
                                    name="urlSlug"
                                    required
                                    pattern="[a-zA-Z0-9-]+"
                                    defaultValue={page.url_slug}
                                />
                            </div>
                            <small>Letters, numbers and hyphens only.</small>
                        </div>

                        <div className="studio-safety">
                            <strong>Privacy by design</strong>
                            <p>Use this page to teach. Do not request or store real credentials.</p>
                        </div>

                        <div className="studio-actions">
                            <Link href="/dashboard/landing-pages" className="button secondary">
                                Cancel
                            </Link>
                            <SubmitButton label="Save changes" pendingLabel="Saving page…" />
                        </div>
                    </>
                }
            />
        </form>
    )
}
