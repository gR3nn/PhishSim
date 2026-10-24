'use client'

import { createTemplate } from '../actions'
import { useState } from 'react'
import Link from 'next/link'
import { FileCode2, Save } from 'lucide-react'
import AiHtmlEditor from '@/components/ai-html-editor'

const handoffKey = 'phishsafe:create-handoff:template'

// Read (and clear) the AI create-with-AI handoff once, at mount, in the browser.
function readHandoff(): string | null {
    if (typeof window === 'undefined') return null
    const stored = sessionStorage.getItem(handoffKey)
    if (!stored) return null
    sessionStorage.removeItem(handoffKey)
    try {
        const { html: handoffHtml } = JSON.parse(stored)
        return typeof handoffHtml === 'string' && handoffHtml.length > 0 ? handoffHtml : null
    } catch {
        return null
    }
}

const emailStarterHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f8;padding:32px 0;font-family:Arial,sans-serif">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden">
        <tr>
          <td style="padding:36px 40px;color:#101828">
            <h1 style="margin:0 0 12px;font-size:22px">Action needed on your account</h1>
            <p style="margin:0 0 20px;color:#475467;line-height:1.6">Please review the request below and continue when you are ready.</p>
            <p style="margin:0 0 28px">
              <a href="{{link}}" style="display:inline-block;padding:12px 22px;background:#1570ef;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:bold">Review now</a>
            </p>
            <p style="margin:0;color:#98a2b3;font-size:12px;line-height:1.5">This is an authorized security-awareness simulation. No credentials are stored.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`

export default function CreateTemplatePage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [handoffHtml] = useState(readHandoff)
    const [bodyHtml, setBodyHtml] = useState(handoffHtml ?? emailStarterHtml)
    const initialTab = handoffHtml ? 'preview' : 'code'

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        const formData = new FormData(e.currentTarget)
        try {
            await createTemplate(formData)
        } catch (submitError) {
            console.error(submitError)
            setError(submitError instanceof Error ? submitError.message : 'Failed to create template')
            setLoading(false)
        }
    }

    return (
        <div className="content-page">
            <section className="page-heading">
                <div>
                    <p className="eyebrow">Email Template</p>
                    <h1>Create an email template</h1>
                    <p>Draft the email recipients receive. Preview the HTML safely before saving.</p>
                </div>
            </section>

            <form onSubmit={handleSubmit} className="landing-studio">
                <AiHtmlEditor
                    kind="email"
                    html={bodyHtml}
                    onHtmlChange={setBodyHtml}
                    textareaName="bodyHtml"
                    textareaRequired
                    starterHtml={emailStarterHtml}
                    initialTab={initialTab}
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
                                <input id="name" name="name" required placeholder="e.g. Microsoft Password Reset" />
                            </div>

                            <div className="field">
                                <label htmlFor="subject">Email subject</label>
                                <input id="subject" name="subject" required placeholder="Action Required: Reset your password" />
                            </div>

                            <div className="studio-safety">
                                <strong>Tracking link</strong>
                                <p>
                                    Use <code>{`{{link}}`}</code> in the body to insert the phishing link. It is required for the
                                    simulation to work.
                                </p>
                            </div>

                            {error && <div className="auth-message error">{error}</div>}

                            <div className="studio-actions">
                                <Link href="/dashboard/templates" className="button secondary">
                                    Cancel
                                </Link>
                                <button type="submit" className="button primary" disabled={loading}>
                                    <Save size={15} />
                                    {loading ? 'Creating…' : 'Create template'}
                                </button>
                            </div>
                        </>
                    }
                />
            </form>
        </div>
    )
}
