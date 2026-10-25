import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  recordOrderFromSession,
  updateOrderStatusByCustomer,
  type StripeCheckoutSession,
} from '@/lib/orders'

// Node runtime so `node:crypto` and the raw request body are available.
export const runtime = 'nodejs'

const SIGNATURE_TOLERANCE_SECONDS = 60 * 5

type StripeEvent = {
  type: string
  data: { object: Record<string, unknown> }
}

/**
 * Verify the `stripe-signature` header against the raw payload without pulling
 * in the Stripe SDK: parse the `t=`/`v1=` parts, recompute the HMAC-SHA256 of
 * `${t}.${payload}`, timing-safe-compare, and enforce a ~5 min tolerance.
 */
function verifySignature(payload: string, header: string, secret: string): boolean {
  let timestamp = ''
  const signatures: string[] = []
  for (const part of header.split(',')) {
    const [key, value] = part.split('=')
    if (key === 't') timestamp = value
    else if (key === 'v1' && value) signatures.push(value)
  }
  if (!timestamp || signatures.length === 0) return false

  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return false
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS) return false

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex')
  const expectedBuffer = Buffer.from(expected)

  return signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature)
    return (
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    )
  })
}

async function fetchFullSession(sessionId: string): Promise<StripeCheckoutSession | null> {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    // Return 200 so Stripe does not retry forever; surface the misconfig in logs.
    console.error('[stripe-webhook] STRIPE_SECRET_KEY missing — cannot fetch session.')
    return null
  }
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  if (!response.ok) {
    console.error(`[stripe-webhook] session fetch failed with ${response.status}.`)
    return null
  }
  return (await response.json()) as StripeCheckoutSession
}

export async function POST(request: Request) {
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!whSecret) {
    return NextResponse.json({ error: 'Stripe webhook secret not configured.' }, { status: 503 })
  }

  const sig = request.headers.get('stripe-signature')
  const payload = await request.text()
  if (!sig) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })

  if (!verifySignature(payload, sig, whSecret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  let event: StripeEvent
  try {
    event = JSON.parse(payload) as StripeEvent
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const sessionId = String((event.data.object as { id?: string }).id ?? '')
        if (sessionId) {
          const fullSession = await fetchFullSession(sessionId)
          if (fullSession) await recordOrderFromSession(fullSession)
        }
        break
      }
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const sub = event.data.object as { status?: string; customer?: string | { id?: string } }
        const cancelled =
          event.type === 'customer.subscription.deleted' ||
          sub.status === 'canceled' ||
          sub.status === 'unpaid'
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        if (cancelled && customerId) {
          await updateOrderStatusByCustomer(customerId, 'cancelled')
        }
        break
      }
      case 'invoice.paid': {
        // Best-effort: refreshing the monthly order's period_start on renewal
        // would need the subscription→order mapping that Phase 1 does not yet
        // plumb through, so this is intentionally a no-op for now.
        break
      }
      default:
        // Ignored event type — acknowledge so Stripe stops retrying.
        break
    }
  } catch (error) {
    // Admin client may be null (helpers no-op) or a transient write error; the
    // signature is already verified, so acknowledge to avoid infinite retries.
    console.error('[stripe-webhook] handler error', error)
  }

  return NextResponse.json({ received: true })
}
