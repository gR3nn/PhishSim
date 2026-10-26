import Link from 'next/link'
import { ArrowRight, FileCode2, Mail, Plus, Trash2, Users } from 'lucide-react'
import { SubmitButton } from '@/components/submit-button'

type ResourceKind = 'audience' | 'template' | 'page'
type ResourceItem = { id: string; title: string; subtitle: string; meta: string; href?: string; isDefault?: boolean; canDelete?: boolean }

const config = {
  audience: {
    icon: Users,
    eyebrow: 'Groups',
    title: 'Recipient groups',
    description: 'Organize recipients into consented groups for targeted simulations.',
    empty: 'No groups yet',
  },
  template: {
    icon: Mail,
    eyebrow: 'Email Templates',
    title: 'Email templates',
    description: 'Create reusable training messages for realistic, consistent simulations.',
    empty: 'No templates yet',
  },
  page: {
    icon: FileCode2,
    eyebrow: 'Landing Pages',
    title: 'Landing pages',
    description: 'Pages recipients see after a simulated click.',
    empty: 'No landing pages yet',
  },
}

export function ResourceLibrary({
  kind,
  items,
  createHref,
  createLabel,
  createSlot,
  deleteAction,
}: {
  kind: ResourceKind
  items: ResourceItem[]
  createHref: string
  createLabel: string
  createSlot?: React.ReactNode
  deleteAction?: (formData: FormData) => Promise<void>
}) {
  const details = config[kind]
  const Icon = details.icon

  return (
    <div className="content-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{details.eyebrow}</p>
          <h1>{details.title}</h1>
          <p>{details.description}</p>
        </div>
        {createSlot ?? (
          <Link href={createHref} className="button primary">
            <Plus size={16} />
            {createLabel}
          </Link>
        )}
      </section>

      <section className="library-summary">
        <div>
          <span>{items.length}</span>
          <p>Total resources</p>
        </div>
        <div>
          <span>{items.length ? 'Ready' : 'Start'}</span>
          <p>Workspace status</p>
        </div>
        <div>
          <span>Private</span>
          <p>Visibility</p>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="panel empty-state library-empty">
          <div>
            <Icon size={24} />
          </div>
          <h3>{details.empty}</h3>
          <p>Create your first resource to start building an authorized campaign.</p>
          {createSlot ?? (
            <Link href={createHref} className="button primary">
              <Plus size={15} />
              {createLabel}
            </Link>
          )}
        </section>
      ) : (
        <section className="resource-grid">
          {items.map((item) => {
            return (
              <article className="resource-card" key={item.id}>
                <div className={`resource-icon ${kind}`}>
                  <Icon size={20} />
                </div>
                <div className="resource-copy">
                  <p className="eyebrow">{item.isDefault ? 'PhishSafe default' : details.eyebrow}</p>
                  <h2>{item.title}</h2>
                  <p>{item.subtitle}</p>
                </div>
                <div className="resource-foot">
                  <span>{item.meta}</span>
                  <span className="resource-card-actions">
                    {item.canDelete && deleteAction && <form action={deleteAction}><input type="hidden" name="id" value={item.id}/><SubmitButton label="Delete" pendingLabel="" className="resource-delete" confirmMessage={`Delete ${item.title}? This cannot be undone.`}><Trash2 size={14}/></SubmitButton></form>}
                    {item.href && <Link href={item.href} className="resource-open">Open <ArrowRight size={14} /></Link>}
                  </span>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
