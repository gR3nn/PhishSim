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

    const query = supabase
        .from('landing_pages')
        .select('html_content,user_id,is_default')
        .eq('url_slug', slug)
    const { data: pages } = await query.limit(20)
    const page = user ? pages?.find((item) => item.user_id === user.id) || pages?.find((item) => item.is_default) : pages?.find((item) => item.is_default) || pages?.[0]

    if (!page) {
        notFound()
    }

    return (
        <div dangerouslySetInnerHTML={{ __html: page.html_content }} />
    )
}
