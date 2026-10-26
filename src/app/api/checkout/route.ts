import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCreditBalance } from '@/lib/credits'
import { plans, type PlanId } from '@/lib/plans'

type CartItem = { plan: PlanId; quantity: number }

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in before purchasing.' }, { status: 401 })
  const payload = await request.json().catch(() => ({})) as { items?: CartItem[]; plan?: PlanId }
  const input = payload.items || (payload.plan ? [{ plan: payload.plan, quantity: 1 }] : [])
  const items = input.filter((item) => item.plan in plans).map((item) => ({ plan: item.plan, quantity: item.plan === 'custom' ? Math.max(1, Math.min(10000, Math.floor(Number(item.quantity) || 1))) : 1 }))
  if (!items.length) return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 })
  const totalCents = items.reduce((sum, item) => sum + plans[item.plan].price * item.quantity * 100, 0)
  const walletOnly = items.every((item) => item.plan === 'custom')
  const creditCents = await getCreditBalance(user.id)
  const admin = createAdminClient()

  if (walletOnly && creditCents >= totalCents && admin) {
    const reference = `wallet-${crypto.randomUUID()}`
    const { error: debitError } = await admin.from('credit_transactions').insert({ user_id: user.id, amount_cents: -totalCents, kind: 'purchase', reference, description: `${items.reduce((sum, item) => sum + item.quantity, 0)} recipient custom campaign` })
    if (debitError) return NextResponse.json({ error: debitError.message }, { status: 500 })
    const rows = items.map((item) => ({ user_id: user.id, plan: item.plan, billing_type: 'one-time', amount_cents: item.quantity * 100, currency: 'eur', status: 'paid', quantity: item.quantity, recipient_limit: item.quantity, paid_with: 'credits', stripe_session_id: `${reference}:${item.plan}` }))
    const { error: orderError } = await admin.from('orders').insert(rows)
    if (orderError) {
      await admin.from('credit_transactions').insert({ user_id: user.id, amount_cents: totalCents, kind: 'refund', reference, description: 'Automatic refund after failed order creation' })
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }
    return NextResponse.json({ url: '/dashboard/services/success?wallet=1' })
  }

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Secure checkout is temporarily unavailable. Please contact support.' }, { status: 503 })
  const origin = new URL(request.url).origin
  const hasSubscription = items.some((item) => plans[item.plan].billing === 'monthly')
  const body = new URLSearchParams({ mode: hasSubscription ? 'subscription' : 'payment', success_url: `${origin}/dashboard/services/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/dashboard/services`, customer_email: user.email ?? '', 'metadata[user_id]': user.id, 'metadata[plan]': items[0].plan, 'metadata[cart]': JSON.stringify(items) })
  items.forEach((item, index) => {
    const plan = plans[item.plan]
    body.set(`line_items[${index}][quantity]`, String(item.quantity))
    body.set(`line_items[${index}][price_data][currency]`, 'eur')
    body.set(`line_items[${index}][price_data][unit_amount]`, String(plan.price * 100))
    body.set(`line_items[${index}][price_data][product_data][name]`, `PhishSafe ${plan.name}`)
    body.set(`line_items[${index}][price_data][product_data][description]`, plan.description)
    if (plan.billing === 'monthly') body.set(`line_items[${index}][price_data][recurring][interval]`, 'month')
  })
  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  const session = await stripeResponse.json() as { url?: string; error?: { message?: string } }
  if (!stripeResponse.ok || !session.url) return NextResponse.json({ error: session.error?.message || 'Stripe checkout could not be created.' }, { status: 502 })
  return NextResponse.json({ url: session.url })
}
