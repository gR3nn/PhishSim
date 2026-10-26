'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canHandleSupport, getRole } from '@/lib/authz'

export async function createTicket(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const subject = String(formData.get('subject') || '').trim()
  const body = String(formData.get('body') || '').trim()
  if (!subject || !body) throw new Error('Add a subject and question')
  const { data: ticket, error } = await supabase.from('support_tickets').insert({ user_id: user.id, subject }).select('id').single()
  if (error || !ticket) throw new Error(error?.message || 'Could not create the conversation')
  const { error: messageError } = await supabase.from('support_messages').insert({ ticket_id: ticket.id, sender_id: user.id, body })
  if (messageError) throw new Error(messageError.message)
  redirect(`/dashboard/support?ticket=${ticket.id}`)
}

export async function sendSupportMessage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const ticketId = String(formData.get('ticketId') || '')
  const body = String(formData.get('body') || '').trim()
  if (!ticketId || !body) throw new Error('Write a message first')
  const { error } = await supabase.from('support_messages').insert({ ticket_id: ticketId, sender_id: user.id, body })
  if (error) throw new Error(error.message)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isStaff = canHandleSupport(getRole(user.email, profile?.role))
  await supabase.from('support_tickets').update({ status: isStaff ? 'answered' : 'open', assigned_to: isStaff ? user.id : null, updated_at: new Date().toISOString() }).eq('id', ticketId)
  revalidatePath('/dashboard/support')
}

export async function closeTicket(formData: FormData) {
  const supabase = await createClient()
  const ticketId = String(formData.get('ticketId') || '')
  await supabase.from('support_tickets').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', ticketId)
  revalidatePath('/dashboard/support')
}
