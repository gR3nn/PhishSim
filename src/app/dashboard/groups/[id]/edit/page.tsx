import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { updateGroup } from '../../actions'
import { SubmitButton } from '@/components/submit-button'

export default async function EditGroupPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    const { data: group } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single()

    if (!group) {
        notFound()
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="mb-8">
                <Link href="/dashboard/groups" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 inline-block">
                    ← Back to Groups
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Group</h1>
            </div>

            <form action={updateGroup} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-6">
                <input type="hidden" name="id" value={group.id} />

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Group Name
                    </label>
                    <input
                        type="text"
                        name="name"
                        id="name"
                        defaultValue={group.name}
                        required
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>

                <div className="flex justify-end">
                    <SubmitButton label="Save changes" pendingLabel="Saving audience…" />
                </div>
            </form>
        </div>
    )
}
