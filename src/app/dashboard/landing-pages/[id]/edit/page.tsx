import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import EditLandingPageForm from './EditLandingPageForm'

export default async function EditLandingPage({
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
                    <Link href="/dashboard/landing-pages" className="eyebrow">
                        ← Back to Landing Pages
                    </Link>
                    <h1>Edit landing page</h1>
                    <p>Update the educational page and preview the HTML safely before saving.</p>
                </div>
            </section>

            <EditLandingPageForm
                page={{
                    id: page.id,
                    name: page.name,
                    url_slug: page.url_slug,
                    html_content: page.html_content,
                }}
            />
        </div>
    )
}
