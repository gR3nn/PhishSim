import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export type StripeCheckoutSession = {
  id: string
  amount_total?: number
  currency?: string
  customer?: string | { id?: string } | null
  metadata?: { user_id?: string; plan?: string }
}

function startOfCurrentUtcMonth(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/**
 * Record a paid order from a fetched Stripe checkout session. Shared by the
 * success page and the webhook so an order is only ever counted once (upsert on
 * stripe_session_id). No-ops when the admin client is unconfigured or the
 * session lacks the plan/user metadata — never throws.
 */
export async function recordOrderFromSession(session: StripeCheckoutSession): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return

  const plan = session.metadata?.plan
  const userId = session.metadata?.user_id
  if (!plan || !userId) return

  const billingType = plan === 'single' ? 'one-time' : 'monthly'
  const periodStart = billingType === 'monthly' ? startOfCurrentUtcMonth() : null

  await admin.from('orders').upsert(
    {
      user_id: userId,
      plan,
      billing_type: billingType,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency || 'eur',
      status: 'paid',
      stripe_session_id: session.id,
      period_start: periodStart,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
    },
    { onConflict: 'stripe_session_id' },
  )
}

/**
 * Flip the status of all orders tied to a Stripe customer (used by subscription
 * cancellation webhook events). No-ops when the admin client is unconfigured.
 */
export async function updateOrderStatusByCustomer(
  customerId: string,
  status: 'cancelled' | 'paid',
): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return
  await admin.from('orders').update({ status }).eq('stripe_customer_id', customerId)
}
