import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function LandingPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase
        .from('landing_pages')
        .select('html_content')
        .eq('url_slug', slug)
    if (user) query = query.eq('user_id', user.id)
    const { data: pages } = await query.limit(1)
    const page = pages?.[0]

    if (!page) {
        notFound()
    }

    return (
        <div dangerouslySetInnerHTML={{ __html: page.html_content }} />
    )
}
