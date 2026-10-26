import Link from 'next/link'
import { Activity, ArrowRight, BadgeCheck, Eye, FileLock2, KeyRound, ShieldCheck } from 'lucide-react'
import { MarketingFooter, MarketingNav } from '@/components/marketing-nav'

const controls = [
  [ShieldCheck, 'Approval by design', 'Campaigns wait in a controlled queue and cannot deliver until authorized staff approve them.'],
  [FileLock2, 'No stored passwords', 'Simulation forms record a learning event only. Submitted credentials are never retained.'],
  [KeyRound, 'Role-based access', 'Clients, managers, support staff, auditors, and administrators receive purpose-specific permissions.'],
  [Eye, 'Private customization', 'Shared templates remain stable while each client can create an isolated personal version.'],
  [Activity, 'Accountable activity', 'Administrative audit logs record authenticated page visits and important interface actions.'],
  [BadgeCheck, 'Authorized audiences', 'Recipient groups remain owner-scoped and campaigns are reviewed before delivery.'],
] as const

export default function TrustPage() {
  return <div className="marketing-page"><MarketingNav/><main><section className="public-page-hero"><p className="eyebrow">PhishSafe trust center</p><h1>Training controls people can trust.</h1><p>Responsible simulations need more than realistic emails. PhishSafe combines authorization, privacy, access controls, and clear accountability.</p></section><section className="trust-center-grid">{controls.map(([Icon,title,copy]) => <article className="trust-control" key={title}><span><Icon size={22}/></span><h2>{title}</h2><p>{copy}</p></article>)}</section><section className="trust-banner"><div><p className="eyebrow">Safe by default</p><h2>Practice the decision, protect the person.</h2><p>Security awareness should strengthen trust—not collect secrets or surprise teams without oversight.</p></div><Link href="/about" className="button primary">Our approach <ArrowRight size={16}/></Link></section></main><MarketingFooter/></div>
}
