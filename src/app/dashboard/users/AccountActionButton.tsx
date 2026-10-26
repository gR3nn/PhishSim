'use client'

import { Ban, CheckCircle2, Trash2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import { LoaderCircle } from 'lucide-react'

export default function AccountActionButton({ action }: { action: 'ban' | 'restore' | 'delete' }) {
  const { pending } = useFormStatus()
  const config = {
    ban: { label: 'Suspend account', message: 'Suspend this account? The user will not be able to sign in.', icon: Ban, className: 'warn' },
    restore: { label: 'Restore account', message: 'Restore sign-in access for this account?', icon: CheckCircle2, className: 'approve' },
    delete: { label: 'Delete account', message: 'Permanently delete this account and all owned data? This cannot be undone.', icon: Trash2, className: 'reject' },
  }[action]
  const Icon = config.icon
  return <button type="submit" className={`mini-button ${config.className}`} title={config.label} aria-label={config.label} disabled={pending} onClick={(event) => { if (!window.confirm(config.message)) event.preventDefault() }}>{pending ? <LoaderCircle className="spin" size={14}/> : <Icon size={14}/>}</button>
}
