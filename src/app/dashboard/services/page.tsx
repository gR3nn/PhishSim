import { AlertTriangle, Check, Coins, Rocket, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { plans, type PlanId } from '@/lib/plans'
import { createClient } from '@/lib/supabase/server'
import { getEntitlement, isBillingConfigured, type Entitlement } from '@/lib/entitlements'
import { SubmitButton } from '@/components/submit-button'
import PurchaseButton from './PurchaseButton'
import { openBillingPortal } from './billing-actions'
import { getCreditBalance } from '@/lib/credits'
import CouponForm from './CouponForm'
import CartPanel from './CartPanel'

const icons = { custom: Users, starter: Rocket, growth: Sparkles, enterprise: ShieldCheck }

type OrderRow = {
  id: string
  plan: string
  amount_cents: number | null
  currency: string | null
  status: string
  created_at: string
}

const MONTHLY_PLANS: PlanId[] = ['starter', 'growth', 'enterprise']

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function entitlementBanner(entitlement: Entitlement | null, configured: boolean) {
  if (!configured) {
    return <div className="attention-banner"><div className="attention-icon"><AlertTriangle size={22} /></div><div><strong>Billing is temporarily unavailable</strong><p>Please contact support if you need help choosing or activating a plan.</p></div></div>
  }
  if (!entitlement || !entitlement.plan) {
    return <div className="attention-banner"><div className="attention-icon"><Coins size={22} /></div><div><strong>No active plan</strong><p>Purchase a custom campaign or monthly plan to create campaigns.</p></div></div>
  }
  const planName = plans[entitlement.plan].name
  const monthly = Number.isFinite(entitlement.remainingMonthly)
    ? `${entitlement.remainingMonthly} monthly campaign${entitlement.remainingMonthly === 1 ? '' : 's'} remaining`
    : 'Unlimited monthly campaigns'
  const credits = entitlement.oneTimeCredits > 0
    ? ` · ${entitlement.oneTimeCredits} one-time credit${entitlement.oneTimeCredits === 1 ? '' : 's'}`
    : ''
  return <div className="attention-banner"><div className="attention-icon"><ShieldCheck size={22} /></div><div><strong>Current plan: {planName}</strong><p>{monthly}{credits}.</p></div></div>
}

export default async function ServicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const configured = isBillingConfigured()
  const entitlement = user ? await getEntitlement(user.id) : null
  const creditCents = user ? await getCreditBalance(user.id) : 0

  // Owner-scoped read: the orders SELECT RLS policy limits rows to the user's own.
  const orders = user
    ? (((await supabase
        .from('orders')
        .select('id, plan, amount_cents, currency, status, created_at')
        .order('created_at', { ascending: false })).data) as OrderRow[] | null) ?? []
    : []

  const canManage = !!entitlement?.plan && MONTHLY_PLANS.includes(entitlement.plan as PlanId)

  return <div className="content-page">
    <section className="page-heading"><div><p className="eyebrow">Billing & wallet</p><h1>Build your security program</h1><p>Pay €1 per person for a custom campaign or choose an ongoing plan. Add products to your cart before checkout.</p></div><CartPanel creditCents={creditCents}/></section>
    <section className="wallet-card"><div className="wallet-icon"><Coins size={23}/></div><div><p>Available credit</p><strong>€{(creditCents / 100).toFixed(2)}</strong><span>Credits automatically cover eligible custom campaigns.</span></div><CouponForm/></section>
    {entitlementBanner(entitlement, configured)}
    <section className="plans-grid">
      {(Object.entries(plans) as [PlanId, (typeof plans)[PlanId]][]).map(([id, plan]) => {
        const Icon = icons[id]
        const featured = id === 'growth'
        return <article className={`plan-card ${featured ? 'featured' : ''}`} key={id}>
          {featured && <span className="plan-label">Popular</span>}
          <div className="plan-icon"><Icon size={20} /></div>
          <h2>{plan.name}</h2><p>{plan.description}</p>
          <div className="price"><strong>€{plan.price}</strong><span>{plan.billing === 'per-recipient' ? ' / recipient' : ' / month'}</span></div>
          <PurchaseButton plan={id} featured={featured} />
          <ul className="feature-list">{plan.features.map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}</ul>
        </article>
      })}
    </section>
    {canManage && <section className="data-panel"><div className="data-panel-head"><div><h2>Manage subscription</h2><p>Update payment details or cancel through the Stripe billing portal.</p></div><form action={openBillingPortal}><SubmitButton label="Manage subscription" pendingLabel="Opening portal…" className="button secondary" /></form></div></section>}
    <section className="data-panel"><div className="data-panel-head"><div><h2>Order history</h2><p>Payments recorded on your account.</p></div></div>
      {orders.length === 0
        ? <div className="panel empty-state"><p className="eyebrow">No orders yet</p><p>Your purchases will appear here once a payment is confirmed.</p></div>
        : <div className="table-scroll"><table className="app-table"><thead><tr><th>Plan</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead><tbody>
            {orders.map((order) => <tr key={order.id}><td><strong>{plans[order.plan as PlanId]?.name ?? order.plan}</strong></td><td>€{((order.amount_cents ?? 0) / 100).toFixed(2)}</td><td>{dateLabel(order.created_at)}</td><td>{order.status}</td></tr>)}
          </tbody></table></div>}
    </section>
    <section className="attention-banner"><div className="attention-icon"><ShieldCheck size={22} /></div><div><strong>Secure payment flow</strong><p>No card data touches PhishSafe. Stripe hosts checkout and returns the customer to this dashboard.</p></div></section>
  </div>
}
