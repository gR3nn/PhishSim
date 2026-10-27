'use client'

import { useMemo, useState } from 'react'
import { Code2, Eye, Link2, ShieldCheck } from 'lucide-react'

type ReviewContentInspectorProps = {
    title: string
    html?: string | null
    previewHtml?: string | null
    previewUrl?: string
    kind: 'email' | 'landing'
    trustedRoute?: boolean
}

function findLinks(html: string) {
    return [...html.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)]
        .map((match) => match[1] ?? match[2] ?? match[3])
}

export function ReviewContentInspector({
    title,
    html,
    previewHtml,
    previewUrl,
    kind,
    trustedRoute = false,
}: ReviewContentInspectorProps) {
    const [mode, setMode] = useState<'preview' | 'code'>('preview')
    const source = html || ''
    const links = useMemo(() => findLinks(source), [source])

    return <>
        <div className="review-inspector-toolbar" role="tablist" aria-label={`${title} inspection mode`}>
            <button type="button" role="tab" aria-selected={mode === 'preview'} className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>
                <Eye size={14}/> Preview
            </button>
            <button type="button" role="tab" aria-selected={mode === 'code'} className={mode === 'code' ? 'active' : ''} onClick={() => setMode('code')}>
                <Code2 size={14}/> Source code
            </button>
        </div>

        {mode === 'preview' ? (
            <div className={`review-frame-shell ${kind}`} role="tabpanel">
                {previewUrl
                    ? <iframe title={`${title} preview`} src={previewUrl} sandbox=""/>
                    : previewHtml
                        ? <iframe title={`${title} preview`} srcDoc={previewHtml} sandbox=""/>
                        : <div className="review-preview-empty"><Code2 size={24}/><strong>Preview unavailable</strong><p>The selected content could not be found.</p></div>}
            </div>
        ) : (
            <div className="review-source-panel" role="tabpanel">
                <div className="review-link-audit">
                    {trustedRoute ? <>
                        <ShieldCheck size={16}/><span><strong>Trusted built-in route</strong>No editable HTML or outbound href attributes.</span>
                    </> : <>
                        <Link2 size={16}/><span><strong>{links.length} href attribute{links.length === 1 ? '' : 's'} found</strong>{links.length ? links.join(' · ') : 'No links detected in this source.'}</span>
                    </>}
                </div>
                <pre><code>{trustedRoute
                    ? `// Built-in PhishSafe route\n// ${previewUrl || '/sign-in-simulation'}\n// Source is application-managed and cannot be changed by a campaign author.\n// Outbound href attributes: none`
                    : source || '<!-- Source unavailable -->'}</code></pre>
            </div>
        )}
    </>
}
