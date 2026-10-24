'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Code2, Eye, FileCode2, Save, Sparkles, X } from 'lucide-react'
import { createLandingPage } from '../actions'

const starterHtml = `<div style="min-height:100vh;padding:60px 20px;background:#f3f6f8;font-family:Arial,sans-serif;color:#101828;box-sizing:border-box">
  <main style="max-width:640px;margin:auto;padding:44px;background:white;border-radius:20px;box-shadow:0 20px 55px #10182820">
    <div style="width:52px;height:52px;display:grid;place-items:center;border-radius:15px;background:#dff9ee;color:#16805a;font-size:24px">✓</div>
    <p style="margin-top:28px;color:#16805a;font-weight:bold;text-transform:uppercase;font-size:12px;letter-spacing:1px">PhishSafe learning moment</p>
    <h1 style="font-size:38px;line-height:1.1">This was a safe simulation.</h1>
    <p style="color:#667085;line-height:1.7">Pause, inspect the sender and verify unexpected requests through a trusted channel.</p>
    <div style="margin-top:24px;padding:16px;background:#effbf6;border-radius:10px;color:#176347">No passwords or private information were stored.</div>
  </main>
</div>`

export default function CreateLandingPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [html, setHtml] = useState(starterHtml)
  const [tab, setTab] = useState<'code' | 'preview'>('code')
  const [files, setFiles] = useState<File[]>([])
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

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

  function addFiles(selected: FileList | null) {
    if (selected) setFiles((prev) => [...prev, ...Array.from(selected)])
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleGenerate() {
    setAiLoading(true)
    setAiError('')
    try {
      const form = new FormData()
      form.append('prompt', aiPrompt)
      form.append('kind', 'landing')
      files.forEach((file) => form.append('files', file))
      const res = await fetch('/api/generate-content', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setAiError(data.error || 'Failed to generate the landing page.')
        return
      }
      setHtml(data.html)
      setTab('preview')
    } catch {
      setAiError('Failed to generate the landing page.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="content-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Landing-page studio</p>
          <h1>Build a learning moment</h1>
          <p>Create the educational page recipients see after a simulated click. Preview it safely before saving.</p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="landing-studio">
        <section className="landing-settings">
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

          <div className="landing-ai">
            <div className="landing-ai-title">
              <span>
                <Sparkles size={15} />
              </span>
              <div>
                <h3>AI generator</h3>
                <p>Upload photos, describe the page, and let AI draft the HTML.</p>
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

            {files.length > 0 && (
              <ul className="ai-files">
                {files.map((file, index) => (
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
                placeholder="e.g. A friendly payroll update notice with our logo colours."
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
            name="htmlContent"
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            className={tab === 'code' ? 'studio-code' : 'hidden'}
            spellCheck={false}
            required
          />

          <div className={tab === 'preview' ? 'studio-preview' : 'hidden'}>
            <iframe title="Landing page preview" srcDoc={html} sandbox="" />
          </div>
        </section>
      </form>
    </div>
  )
}
