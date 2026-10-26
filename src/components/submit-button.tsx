'use client'

import { useFormStatus } from 'react-dom'
import { LoaderCircle } from 'lucide-react'

export function SubmitButton({ label, pendingLabel = 'Saving…', className = 'button primary', title, confirmMessage, children }: { label: string; pendingLabel?: string; className?: string; title?: string; confirmMessage?: string; children?: React.ReactNode }) {
  const { pending } = useFormStatus()
  return <button type="submit" className={className} disabled={pending} title={title} onClick={(event) => { if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault() }}>{pending && <LoaderCircle className="spin" size={14}/>}<span>{pending ? pendingLabel : children || label}</span></button>
}
