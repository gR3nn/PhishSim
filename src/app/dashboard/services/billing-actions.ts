'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Open a Stripe Billing Portal session for the signed-in user. Owner-scoped:
 * the customer id is resolved only from the user's own most-recent paid monthly
 * order (the Phase-1 minimal approach — we trust the latest subscription order's
 * stripe_customer_id rather than tracking a dedicated customer record).
 */
export async function openBillingPortal(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) throw new Error('Billing is not configured yet.')

  const admin = createAdminClient()
  if (!admin) throw new Error('Billing is not configured yet.')

  const { data: orders } = await admin
    .from('orders')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .in('plan', ['starter', 'growth', 'enterprise'])
    .not('stripe_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)

  const customer = orders?.[0]?.stripe_customer_id
  if (!customer) throw new Error('No active subscription to manage.')

  const origin = (await headers()).get('origin') ?? ''
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || origin}/dashboard/services`

  const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ customer, return_url: returnUrl }),
  })
  const session = (await response.json()) as { url?: string; error?: { message?: string } }
  if (!response.ok || !session.url) {
    throw new Error(session.error?.message || 'Could not open the billing portal.')
  }
  redirect(session.url)
}
