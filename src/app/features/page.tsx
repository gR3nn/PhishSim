import { BarChart3, Bell, FileCode2, Mail, ShieldCheck, UserCog, Users, Zap } from 'lucide-react'
import { MarketingFooter, MarketingNav } from '@/components/marketing-nav'

const features = [
  [ShieldCheck, 'Approval workflow', 'Administrators review every request before delivery.'],
  [BarChart3, 'Interactive analytics', 'Filter real activity by time range and event type.'],
  [Users, 'Recipient groups', 'Write recipient lists or upload .txt and .csv files.'],
  [Mail, 'Starter templates', 'Use 12 ready-made scenarios or build your own.'],
  [FileCode2, 'Landing pages', 'Responsive educational pages turn clicks into coaching.'],
  [Bell, 'Live notifications', 'See new orders, approvals and requested changes.'],
  [UserCog, 'Role management', 'Promote, suspend, restore or remove workspace users.'],
  [Zap, 'Real-time events', 'Supabase updates campaign activity as it happens.'],
] as const

export default function FeaturesPage() {
  return (
    <div className="marketing-page">
      <MarketingNav />
      <main>
        <section className="public-page-hero">
          <p className="eyebrow">Platform capabilities</p>
          <h1>Everything needed for a responsible simulation.</h1>
          <p>
            PhishSafe connects campaign creation, governance, training and measurement in one role-aware
            workspace.
          </p>
        </section>
        <section className="public-feature-grid">
          {features.map(([Icon, title, copy]) => (
            <article key={title}>
              <span>
                <Icon size={21} />
              </span>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
