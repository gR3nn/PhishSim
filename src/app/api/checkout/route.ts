import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plans, type PlanId } from '@/lib/plans'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in before purchasing.' }, { status: 401 })

  const { plan: planId } = await request.json() as { plan?: PlanId }
  if (!planId || !(planId in plans)) return NextResponse.json({ error: 'Invalid service plan.' }, { status: 400 })
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Stripe test mode is not configured yet. Add STRIPE_SECRET_KEY to .env.local.' }, { status: 503 })

  const plan = plans[planId]
  const origin = new URL(request.url).origin
  const body = new URLSearchParams({
    mode: plan.billing === 'one-time' ? 'payment' : 'subscription',
    success_url: `${origin}/dashboard/services/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard/services`,
    customer_email: user.email ?? '',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(plan.price * 100),
    'line_items[0][price_data][product_data][name]': `PhishSafe ${plan.name}`,
    'line_items[0][price_data][product_data][description]': plan.description,
    'metadata[user_id]': user.id,
    'metadata[plan]': planId,
  })
  if (plan.billing !== 'one-time') body.set('line_items[0][price_data][recurring][interval]', 'month')

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const session = await stripeResponse.json() as { url?: string; error?: { message?: string } }
  if (!stripeResponse.ok || !session.url) return NextResponse.json({ error: session.error?.message || 'Stripe checkout could not be created.' }, { status: 502 })
  return NextResponse.json({ url: session.url })
}
