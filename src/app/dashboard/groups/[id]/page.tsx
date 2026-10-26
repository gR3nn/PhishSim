import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { deleteGroup } from '../actions'
import { SubmitButton } from '@/components/submit-button'

export default async function GroupDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch Group Details
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single()

    if (groupError || !group) {
        notFound()
    }

    // Fetch Targets in Group
    const { data: targets } = await supabase
        .from('targets')
        .select('*')
        .eq('group_id', id)
        .order('email', { ascending: true })

    const count = targets?.length ?? 0

    return (
        <div className="content-page">
            <section className="page-heading">
                <div>
                    <p className="eyebrow">Groups</p>
                    <h1>{group.name}</h1>
                    <p>Created {new Date(group.created_at).toLocaleDateString()}</p>
                </div>
                <div className="studio-actions">
                    <Link href={`/dashboard/groups/${group.id}/edit`} className="button secondary">
                        <Pencil size={14} />
                        Edit
                    </Link>
                    <form action={deleteGroup.bind(null, group.id)}><SubmitButton label="Remove" className="button danger" confirmMessage="Delete this group and all of its recipients? This cannot be undone."><Trash2 size={14}/> Remove</SubmitButton></form>
                </div>
            </section>

            <div className="data-panel">
                <div className="data-panel-head">
                    <div>
                        <h2>Recipients ({count})</h2>
                        <p>People in this group.</p>
                    </div>
                </div>
                <div className="table-scroll">
                    <table className="app-table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Name</th>
                            </tr>
                        </thead>
                        <tbody>
                            {targets?.map((target) => (
                                <tr key={target.id}>
                                    <td><strong>{target.email}</strong></td>
                                    <td className="muted">{target.name || '—'}</td>
                                </tr>
                            ))}
                            {count === 0 && (
                                <tr>
                                    <td colSpan={2} className="muted">No recipients in this group.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
