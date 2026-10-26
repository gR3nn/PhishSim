import Link from 'next/link'
import { Headphones, MessageCircle, Plus, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canHandleSupport, getRole } from '@/lib/authz'
import { closeTicket, createTicket, sendSupportMessage } from './actions'
import SupportComposer from './SupportComposer'
import { SubmitButton } from '@/components/submit-button'

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const { ticket: selectedId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = getRole(user.email, profile?.role)
  const staff = canHandleSupport(role)
  let query = supabase.from('support_tickets').select('*').order('updated_at', { ascending: false })
  if (!staff) query = query.eq('user_id', user.id)
  const { data: tickets } = await query
  const selected = (tickets || []).find((ticket) => ticket.id === selectedId) || (tickets || [])[0]
  const { data: messages } = selected ? await supabase.from('support_messages').select('*').eq('ticket_id', selected.id).order('created_at') : { data: [] }
  const admin = createAdminClient()
  const userIds = [...new Set([...(tickets || []).map((ticket) => ticket.user_id), ...(messages || []).map((message) => message.sender_id)])]
  const { data: people } = admin && userIds.length ? await admin.from('profiles').select('id,full_name,email').in('id', userIds) : { data: [] }
  const names = new Map((people || []).map((person) => [person.id, person.full_name || person.email]))

  return <div className="content-page">
    <section className="page-heading"><div><p className="eyebrow">Human support</p><h1>{staff ? 'Support inbox' : 'How can we help?'}</h1><p>{staff ? 'Answer client questions and keep every conversation in one place.' : 'Pick a common question or write your own. A support agent will answer here.'}</p></div></section>
    <section className="support-layout">
      <aside className="support-sidebar"><div className="support-sidebar-head"><strong>Conversations</strong><Link href="/dashboard/support?ticket=new" aria-label="New conversation"><Plus size={16}/></Link></div>{(tickets || []).map((ticket) => <Link href={`/dashboard/support?ticket=${ticket.id}`} className={`ticket-link ${selected?.id === ticket.id ? 'active' : ''}`} key={ticket.id}><span><MessageCircle size={15}/></span><div><strong>{ticket.subject}</strong><small>{staff ? names.get(ticket.user_id) || 'Client' : new Date(ticket.updated_at).toLocaleDateString()}</small></div><em className={`ticket-status ${ticket.status}`}>{ticket.status}</em></Link>)}{!tickets?.length && <div className="support-empty-mini"><Headphones size={22}/><span>No conversations yet</span></div>}</aside>
      <div className="support-thread">{selectedId === 'new' || !selected ? <div className="support-new"><div className="support-hero-icon"><Headphones size={25}/></div><h2>Start a conversation</h2><p>Support normally replies inside this inbox.</p><SupportComposer action={createTicket}/></div> : <><header className="thread-head"><div><p className="eyebrow">{selected.status}</p><h2>{selected.subject}</h2></div>{selected.status !== 'closed' && <form action={closeTicket}><input type="hidden" name="ticketId" value={selected.id}/><SubmitButton label="Close" className="button secondary"/></form>}</header><div className="message-list">{(messages || []).map((message) => { const own = message.sender_id === user.id; return <article className={`support-message ${own ? 'own' : ''}`} key={message.id}><span><UserRound size={14}/></span><div><strong>{own ? 'You' : names.get(message.sender_id) || 'Support'}</strong><p>{message.body}</p><time>{new Date(message.created_at).toLocaleString()}</time></div></article> })}</div>{selected.status !== 'closed' && <SupportComposer action={sendSupportMessage} ticketId={selected.id}/>}</>}</div>
    </section>
  </div>
}
