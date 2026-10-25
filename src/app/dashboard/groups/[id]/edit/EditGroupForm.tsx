'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { updateGroup } from '../../actions'
import { SubmitButton } from '@/components/submit-button'

export default function EditGroupForm({
    group,
    initialTargetsText,
}: {
    group: { id: string; name: string }
    initialTargetsText: string
}) {
    const [name, setName] = useState(group.name)
    const [targetsText, setTargetsText] = useState(initialTargetsText)
    const parsed = useMemo(() => parseTargets(targetsText), [targetsText])

    return (
        <form action={updateGroup} className="form-card">
            <input type="hidden" name="id" value={group.id} />

            <section className="form-section">
                <h2>Audience details</h2>
                <p>Use a recognizable internal name for this group.</p>
                <div className="field">
                    <label htmlFor="name">Audience name</label>
                    <input
                        id="name"
                        name="name"
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="e.g. Finance department"
                    />
                </div>
            </section>

            <section className="form-section">
                <div className="builder-section-head">
                    <div>
                        <h2>Recipients</h2>
                        <p>Edit, add, or remove recipients below.</p>
                    </div>
                    <span className={`validation-pill ${parsed.errors.length ? 'invalid' : 'valid'}`}>
                        {parsed.errors.length ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />} {parsed.valid.length} valid
                    </span>
                </div>
                <div className="field">
                    <label htmlFor="targetsText">Recipient list</label>
                    <textarea
                        className="recipient-editor"
                        id="targetsText"
                        name="targetsText"
                        value={targetsText}
                        onChange={(event) => setTargetsText(event.target.value)}
                        required
                        spellCheck={false}
                        placeholder={'alex@company.com, Alex Morgan;\nfinance@company.com;\nmanager@company.com, Dana Smith;'}
                    />
                    <small>
                        Separate the email and optional name with a comma. Finish every entry with <strong>;</strong>
                    </small>
                </div>
                {parsed.errors.length > 0 && (
                    <div className="recipient-errors">
                        {parsed.errors.slice(0, 3).map((item) => (
                            <span key={item}>
                                <AlertCircle size={12} />
                                {item}
                            </span>
                        ))}
                    </div>
                )}
            </section>

            <div className="form-actions">
                <Link href={`/dashboard/groups/${group.id}`} className="button secondary">
                    Cancel
                </Link>
                <SubmitButton label="Save changes" pendingLabel="Saving group…" />
            </div>
        </form>
    )
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
        else {
            seen.add(email)
            valid.push(email)
        }
    }
    return { valid, errors }
}
