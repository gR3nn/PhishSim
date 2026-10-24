import Link from 'next/link'
import { ArrowRight, FileCode2, Mail, Plus, Users } from 'lucide-react'

type ResourceKind = 'audience' | 'template' | 'page'
type ResourceItem = { id: string; title: string; subtitle: string; meta: string; href?: string }

const config = {
  audience: { icon: Users, eyebrow: 'Groups', title: 'Recipient groups', description: 'Organize recipients into consented groups for targeted simulations.', empty: 'No groups yet' },
  template: { icon: Mail, eyebrow: 'Email Templates', title: 'Email templates', description: 'Create reusable training messages for realistic, consistent simulations.', empty: 'No templates yet' },
  page: { icon: FileCode2, eyebrow: 'Landing Pages', title: 'Landing pages', description: 'Pages recipients see after a simulated click.', empty: 'No landing pages yet' },
}

export function ResourceLibrary({ kind, items, createHref, createLabel, createSlot }: { kind: ResourceKind; items: ResourceItem[]; createHref: string; createLabel: string; createSlot?: React.ReactNode }) {
  const details = config[kind]
  const Icon = details.icon
  return <div className="content-page">
    <section className="page-heading"><div><p className="eyebrow">{details.eyebrow}</p><h1>{details.title}</h1><p>{details.description}</p></div>{createSlot ?? <Link href={createHref} className="button primary"><Plus size={16}/>{createLabel}</Link>}</section>
    <section className="library-summary"><div><span>{items.length}</span><p>Total resources</p></div><div><span>{items.length ? 'Ready' : 'Start'}</span><p>Workspace status</p></div><div><span>Private</span><p>Visibility</p></div></section>
    {items.length === 0 ? <section className="panel empty-state library-empty"><div><Icon size={24}/></div><h3>{details.empty}</h3><p>Create your first resource to start building an authorized campaign.</p>{createSlot ?? <Link href={createHref} className="button primary"><Plus size={15}/>{createLabel}</Link>}</section> : <section className="resource-grid">{items.map((item) => {
      const card = <><div className={`resource-icon ${kind}`}><Icon size={20}/></div><div className="resource-copy"><p className="eyebrow">{kind}</p><h2>{item.title}</h2><p>{item.subtitle}</p></div><div className="resource-foot"><span>{item.meta}</span><span className="resource-open">Open <ArrowRight size={14}/></span></div></>
      return item.href ? <Link className="resource-card" href={item.href} key={item.id}>{card}</Link> : <article className="resource-card" key={item.id}>{card}</article>
    })}</section>}
  </div>
}
