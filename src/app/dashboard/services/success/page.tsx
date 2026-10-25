import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getEntitlement } from '@/lib/entitlements'
import { recordOrderFromSession, type StripeCheckoutSession } from '@/lib/orders'

type StripeSession = StripeCheckoutSession & {
  payment_status?: string
  status?: string
}

async function verifyAndRecordOrder(sessionId: string): Promise<void> {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${secret}` },
    })
    if (!response.ok) return
    const session = (await response.json()) as StripeSession

    const paid = session.payment_status === 'paid' || session.status === 'complete'
    if (!paid) return
    if (session.metadata?.user_id !== user.id) return

    // Idempotent via onConflict:'stripe_session_id'; shared with the webhook.
    await recordOrderFromSession(session)
  } catch {
    // Any failure (fetch error, parse error) — do not grant.
  }
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams

  if (sessionId) {
    await verifyAndRecordOrder(sessionId)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const entitlement = user ? await getEntitlement(user.id) : null

  let summary = 'Payment status could not be verified yet. If you were charged, your plan will appear on the Billing page shortly.'
  if (entitlement?.plan) {
    const monthly = Number.isFinite(entitlement.remainingMonthly)
      ? `${entitlement.remainingMonthly} monthly campaign${entitlement.remainingMonthly === 1 ? '' : 's'} remaining`
      : 'unlimited monthly campaigns'
    const credits = entitlement.oneTimeCredits > 0
      ? ` and ${entitlement.oneTimeCredits} one-time credit${entitlement.oneTimeCredits === 1 ? '' : 's'}`
      : ''
    summary = `You have ${monthly}${credits}.`
  }

  return <div className="panel empty-state payment-success"><div><CheckCircle2 size={26} /></div><p className="eyebrow">Payment confirmed</p><h1>Your workspace is ready</h1><p>Stripe accepted the payment. You can now prepare a campaign request for admin approval.</p><p>{summary}</p><Link href="/dashboard/campaigns/create" className="button primary">Create campaign request</Link></div>
}
