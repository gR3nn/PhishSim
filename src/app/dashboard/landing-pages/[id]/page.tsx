import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Pencil, ExternalLink } from 'lucide-react'
import { SubmitButton } from '@/components/submit-button'
import { deleteLandingPage } from '../actions'

export default async function LandingPageDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: page } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (!page) {
        notFound()
    }

    return (
        <div className="content-page">
            <section className="page-heading">
                <div>
                    <p className="eyebrow">Landing Pages</p>
                    <h1>{page.name}</h1>
                    <p>
                        /l/{page.url_slug} · Created {new Date(page.created_at).toLocaleDateString()}
                    </p>
                </div>
                <div className="studio-actions">
                    <Link href={`/dashboard/landing-pages/${page.id}/edit`} className="button secondary">
                        <Pencil size={14} />
                        Edit
                    </Link>
                    <a href={`/l/${page.url_slug}`} target="_blank" rel="noreferrer" className="button secondary">
                        <ExternalLink size={14} />
                        View public page
                    </a>
                    <form action={deleteLandingPage.bind(null, page.id)}>
                        <SubmitButton
                            label="Delete"
                            className="button secondary"
                            confirmMessage="Delete this landing page? This cannot be undone."
                        />
                    </form>
                </div>
            </section>

            <div className="data-panel">
                <div className="data-panel-head">
                    <div>
                        <h2>Preview</h2>
                        <p>The educational page recipients see after a simulated click.</p>
                    </div>
                </div>
                <div className="studio-preview">
                    <iframe title="Preview" srcDoc={page.html_content} sandbox="" />
                </div>
            </div>
        </div>
    )
}
