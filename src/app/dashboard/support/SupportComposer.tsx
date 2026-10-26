'use client'

import { useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { SubmitButton } from '@/components/submit-button'

const suggestions = [
  'How do campaign approvals work?',
  'Why can’t I create another campaign?',
  'How do I import a recipient group?',
  'How are credits and billing calculated?',
]

export default function SupportComposer({ action, ticketId }: { action: (formData: FormData) => Promise<void>; ticketId?: string }) {
  const [body, setBody] = useState('')
  const [subject, setSubject] = useState('')
  return <form action={action} className="support-composer">
    {ticketId ? <input type="hidden" name="ticketId" value={ticketId}/> : <div className="field"><label htmlFor="support-subject">Subject</label><input id="support-subject" name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What can we help with?" required/></div>}
    <div className="suggestion-chips">{suggestions.map((question) => <button type="button" key={question} onClick={() => { setBody(question); if (!ticketId) setSubject(question) }}><MessageCircle size={13}/>{question}</button>)}</div>
    <div className="field"><label htmlFor={ticketId ? 'reply' : 'question'}>{ticketId ? 'Reply' : 'Your question'}</label><textarea id={ticketId ? 'reply' : 'question'} name="body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your message…" rows={ticketId ? 3 : 5} required/></div>
    <SubmitButton label={ticketId ? 'Send reply' : 'Start conversation'} pendingLabel="Sending…"><Send size={15}/>{ticketId ? 'Send reply' : 'Start conversation'}</SubmitButton>
  </form>
}
