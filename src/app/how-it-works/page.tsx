import Link from 'next/link'
import { ArrowRight, BarChart3, CheckCircle2, MailCheck, ShieldCheck, Users } from 'lucide-react'
import { MarketingFooter, MarketingNav } from '@/components/marketing-nav'

const steps = [
  [Users, 'Choose an audience', 'Create an authorized recipient group manually or import a validated file.'],
  [MailCheck, 'Build the scenario', 'Select a shared template, personalize it privately, and pair it with a learning page.'],
  [ShieldCheck, 'Request approval', 'An administrator or campaign manager verifies the audience, content, and intent.'],
  [CheckCircle2, 'Deliver safely', 'Only approved simulations are sent, using tracked educational links without storing passwords.'],
  [BarChart3, 'Measure learning', 'Follow opens, clicks, risk events, and improvement through interactive analytics.'],
] as const

export default function HowItWorksPage() {
  return <div className="marketing-page"><MarketingNav/><main><section className="public-page-hero"><p className="eyebrow">Five controlled steps</p><h1>From an idea to a safer team.</h1><p>PhishSafe keeps every simulation clear, authorized, and measurable—from the first recipient to the final learning report.</p></section><section className="workflow-timeline">{steps.map(([Icon,title,copy]) => <article className="workflow-step" key={title}><span><Icon size={22}/></span><h2>{title}</h2><p>{copy}</p></article>)}</section><section className="marketing-cta"><div><p className="eyebrow">Ready to see the workflow?</p><h2>Build your first controlled simulation.</h2><p>Start with shared templates and send only after review.</p></div><Link href="/login" className="button primary">Open PhishSafe <ArrowRight size={16}/></Link></section></main><MarketingFooter/></div>
}
