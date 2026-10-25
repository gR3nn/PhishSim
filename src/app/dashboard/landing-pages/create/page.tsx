'use client'

import Link from 'next/link'
import { useState } from 'react'
import { FileCode2, Save } from 'lucide-react'
import { createLandingPage } from '../actions'
import AiHtmlEditor from '@/components/ai-html-editor'

const handoffKey = 'phishsafe:create-handoff:landing'

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

const starterHtml = `<div style="min-height:100vh;padding:60px 20px;background:#f3f6f8;font-family:Arial,sans-serif;color:#101828;box-sizing:border-box">
  <main style="max-width:640px;margin:auto;padding:44px;background:white;border-radius:20px;box-shadow:0 20px 55px #10182820">
    <div style="width:52px;height:52px;display:grid;place-items:center;border-radius:15px;background:#dff9ee;color:#16805a;font-size:24px">✓</div>
    <p style="margin-top:28px;color:#16805a;font-weight:bold;text-transform:uppercase;font-size:12px;letter-spacing:1px">PhishSafe security simulation</p>
    <h1 style="font-size:38px;line-height:1.1">This was a safe simulation.</h1>
    <p style="color:#667085;line-height:1.7">Pause, inspect the sender and verify unexpected requests through a trusted channel.</p>
    <div style="margin-top:24px;padding:16px;background:#effbf6;border-radius:10px;color:#176347">No passwords or private information were stored.</div>
  </main>
</div>`

export default function CreateLandingPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [handoffHtml] = useState(readHandoff)
  const [html, setHtml] = useState(handoffHtml ?? starterHtml)
  const initialTab = handoffHtml ? 'preview' : 'code'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createLandingPage(new FormData(event.currentTarget))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create landing page')
      setLoading(false)
    }
  }

  return (
    <div className="content-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Landing Page</p>
          <h1>Create a landing page</h1>
          <p>Create the educational page recipients see after a simulated click. Preview it safely before saving.</p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="landing-studio">
        <AiHtmlEditor
          kind="landing"
          html={html}
          onHtmlChange={setHtml}
          textareaName="htmlContent"
          textareaRequired
          starterHtml={starterHtml}
          initialTab={initialTab}
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
                <input id="name" name="name" required placeholder="e.g. Finance awareness page" />
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
                    placeholder="finance-awareness"
                  />
                </div>
                <small>Letters, numbers and hyphens only.</small>
              </div>

              <div className="studio-safety">
                <strong>Privacy by design</strong>
                <p>Use this page to teach. Do not request or store real credentials.</p>
              </div>

              {error && <div className="auth-message error">{error}</div>}

              <div className="studio-actions">
                <Link href="/dashboard/landing-pages" className="button secondary">
                  Cancel
                </Link>
                <button className="button primary" disabled={loading}>
                  <Save size={15} />
                  {loading ? 'Saving…' : 'Save page'}
                </button>
              </div>
            </>
          }
        />
      </form>
    </div>
  )
}
