import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import EditGroupForm from './EditGroupForm'

export default async function EditGroupPage({
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

    const { data: group } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (!group) {
        notFound()
    }

    const { data: targets } = await supabase
        .from('targets')
        .select('*')
        .eq('group_id', id)
        .order('email')

    const serialized = (targets ?? [])
        .map((t) => (t.name ? `${t.email}, ${t.name};` : `${t.email};`))
        .join('\n')

    return (
        <div className="content-page">
            <section className="page-heading">
                <div>
                    <Link href={`/dashboard/groups/${id}`} className="eyebrow">
                        ← Back to group
                    </Link>
                    <h1>Edit recipient group</h1>
                    <p>Update the audience name and its recipients. Every entry must end with a semicolon.</p>
                </div>
            </section>

            <EditGroupForm group={{ id: group.id, name: group.name }} initialTargetsText={serialized} />
        </div>
    )
}
