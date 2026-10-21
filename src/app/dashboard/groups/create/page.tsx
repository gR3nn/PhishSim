'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, UploadCloud, Users } from 'lucide-react'
import { createGroup } from '../actions'

export default function CreateGroupPage() {
  const [loading, setLoading] = useState(false)
  const [targetsText, setTargetsText] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const parsed = useMemo(() => parseTargets(targetsText), [targetsText])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (parsed.errors.length) return setError('Correct the highlighted recipient entries before continuing.')
    if (!targetsText.trim().endsWith(';')) return setError('The final recipient must also end with a semicolon (;).')
    setLoading(true)
    try { await createGroup(new FormData(event.currentTarget)) }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Failed to create audience'); setLoading(false) }
  }

  async function loadFile(file?: File) {
    if (!file) return
    const content = await file.text()
    const normalized = content.includes(';')
      ? content
      : content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.toLowerCase().startsWith('email')).map((line) => `${line};`).join('\n')
    setTargetsText(normalized)
    setFileName(file.name)
  }

  return <div className="content-page">
    <section className="page-heading"><div><p className="eyebrow">Audience builder</p><h1>Create an authorized audience</h1><p>Write or paste recipients below. Every entry must end with a semicolon so the list is easy to validate.</p></div></section>
    <div className="audience-builder-layout">
      <form onSubmit={handleSubmit} className="form-card audience-form">
        <section className="form-section"><h2>Audience details</h2><p>Use a recognizable internal name for this group.</p><div className="field"><label htmlFor="name">Audience name</label><input id="name" name="name" required placeholder="e.g. Finance department"/></div></section>
        <section className="form-section"><div className="builder-section-head"><div><h2>Recipients</h2><p>Write them yourself or upload a .txt/.csv file—the choice is yours.</p></div><span className={`validation-pill ${parsed.errors.length ? 'invalid' : 'valid'}`}>{parsed.errors.length ? <AlertCircle size={13}/> : <CheckCircle2 size={13}/>} {parsed.valid.length} valid</span></div><label className="audience-upload"><input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={(event) => loadFile(event.target.files?.[0])}/><UploadCloud size={20}/><span><strong>{fileName || 'Upload recipient file'}</strong><small>.txt or .csv · email, optional name</small></span><em>Browse</em></label><div className="editor-divider"><span>or write / paste manually</span></div><div className="field"><label htmlFor="targetsText">Recipient list</label><textarea className="recipient-editor" id="targetsText" name="targetsText" value={targetsText} onChange={(event) => { setTargetsText(event.target.value); setFileName('') }} required spellCheck={false} placeholder={'alex@company.com, Alex Morgan;\nfinance@company.com;\nmanager@company.com, Dana Smith;'}/><small>Separate the email and optional name with a comma. Finish every entry with <strong>;</strong></small></div>{parsed.errors.length > 0 && <div className="recipient-errors">{parsed.errors.slice(0,3).map((item) => <span key={item}><AlertCircle size={12}/>{item}</span>)}</div>}{error && <div className="auth-message error">{error}</div>}</section>
        <div className="form-actions"><Link href="/dashboard/groups" className="button secondary">Cancel</Link><button className="button primary" disabled={loading || parsed.valid.length === 0}><Users size={15}/>{loading ? 'Creating…' : `Create audience (${parsed.valid.length})`}</button></div>
      </form>
      <aside className="format-guide"><div className="format-guide-icon"><FileText size={22}/></div><p className="eyebrow">Live format guide</p><h2>One simple pattern</h2><code>email@email.com, Name;</code><ul><li><CheckCircle2 size={14}/>Name is optional</li><li><CheckCircle2 size={14}/>One or many entries per line</li><li><CheckCircle2 size={14}/>Every entry ends in “;”</li><li><CheckCircle2 size={14}/>Duplicates are flagged</li></ul><div className="format-example"><span>Example</span><p>maria@acme.com, Maria;<br/>dan@acme.com;</p></div></aside>
    </div>
  </div>
}

function parseTargets(value: string) {
  const rawEntries = value.split(';').map((entry) => entry.trim()).filter(Boolean)
  const valid: string[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  for (const entry of rawEntries) {
    const email = entry.split(',')[0].trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`“${email || entry}” is not a valid email`)
    else if (seen.has(email)) errors.push(`${email} is duplicated`)
    else { seen.add(email); valid.push(email) }
  }
  return { valid, errors }
}
