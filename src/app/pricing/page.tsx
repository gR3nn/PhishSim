import Link from 'next/link'
import { Check, Rocket, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { MarketingFooter, MarketingNav } from '@/components/marketing-nav'

const offers = [
  {
    name: 'Single campaign',
    price: '€39',
    note: 'one-time payment',
    icon: Zap,
    copy: 'Perfect for a class demo or a focused awareness check.',
    features: ['Up to 100 recipients', 'One approved campaign', 'Full campaign analytics', '12 training scenarios'],
  },
  {
    name: 'Starter',
    price: '€49',
    note: 'per month',
    icon: Rocket,
    copy: 'A steady awareness rhythm for smaller teams.',
    features: ['Up to 100 recipients', '2 campaigns monthly', 'Core analytics', 'Email support'],
  },
  {
    name: 'Growth',
    price: '€129',
    note: 'per month',
    icon: Sparkles,
    copy: 'More testing flexibility for growing organizations.',
    features: ['Up to 1,000 recipients', '10 campaigns monthly', 'Advanced analytics', 'Custom landing pages'],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: '€299',
    note: 'per month',
    icon: ShieldCheck,
    copy: 'Governance and scale for mature security programs.',
    features: ['Unlimited recipients', 'Unlimited campaigns', 'Role management', 'Priority support'],
  },
]

export default function PricingPage() {
  return (
    <div className="marketing-page">
      <MarketingNav />
      <main>
        <section className="public-page-hero">
          <p className="eyebrow">Simple pricing</p>
          <h1>Start once or build an ongoing program.</h1>
          <p>
            Choose a one-time campaign for a focused test, or a monthly plan for continuous awareness
            training.
          </p>
        </section>
        <section className="public-pricing-grid">
          {offers.map((offer) => {
            const Icon = offer.icon
            return (
              <article className={offer.featured ? 'featured' : ''} key={offer.name}>
                {offer.featured && <em>Most popular</em>}
                <span>
                  <Icon size={21} />
                </span>
                <h2>{offer.name}</h2>
                <p>{offer.copy}</p>
                <div>
                  <strong>{offer.price}</strong>
                  <small>{offer.note}</small>
                </div>
                <ul>
                  {offer.features.map((x) => (
                    <li key={x}>
                      <Check size={14} />
                      {x}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={`button ${offer.featured ? 'primary' : 'secondary'}`}>
                  Choose {offer.name}
                </Link>
              </article>
            )
          })}
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
