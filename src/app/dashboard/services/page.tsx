import { Check, Rocket, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { plans, type PlanId } from '@/lib/plans'
import PurchaseButton from './PurchaseButton'

const icons = { single: Zap, starter: Rocket, growth: Sparkles, enterprise: ShieldCheck }

export default function ServicesPage() {
  return <div className="content-page">
    <section className="page-heading"><div><p className="eyebrow">Services</p><h1>Choose your protection plan</h1><p>Every plan includes admin review before a simulation is delivered. Payments use Stripe Checkout in test mode.</p></div></section>
    <section className="plans-grid">
      {(Object.entries(plans) as [PlanId, (typeof plans)[PlanId]][]).map(([id, plan]) => {
        const Icon = icons[id]
        const featured = id === 'growth'
        return <article className={`plan-card ${featured ? 'featured' : ''}`} key={id}>
          {featured && <span className="plan-label">Popular</span>}
          <div className="plan-icon"><Icon size={20} /></div>
          <h2>{plan.name}</h2><p>{plan.description}</p>
          <div className="price"><strong>€{plan.price}</strong><span>{plan.billing === 'one-time' ? ' one time' : ' / month'}</span></div>
          <PurchaseButton plan={id} featured={featured} />
          <ul className="feature-list">{plan.features.map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}</ul>
        </article>
      })}
    </section>
    <section className="attention-banner"><div className="attention-icon"><ShieldCheck size={22} /></div><div><strong>Secure payment flow</strong><p>No card data touches PhishSafe. Stripe hosts checkout and returns the customer to this dashboard.</p></div></section>
  </div>
}
