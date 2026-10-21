import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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

    return (
        <div className="p-8">
            <div className="mb-8">
                <Link
                    href="/dashboard/groups"
                    className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Groups
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            Created on {new Date(group.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <Link
                        href={`/dashboard/groups/${group.id}/edit`}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
                    >
                        Edit Group
                    </Link>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg transition-colors">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        Targets ({targets?.length || 0})
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                        List of targets in this group.
                    </p>
                </div>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {targets?.map((target) => (
                        <li key={target.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                                    {target.email}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {target.name || 'No Name'}
                                </div>
                            </div>
                        </li>
                    ))}
                    {(!targets || targets.length === 0) && (
                        <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            No targets in this group.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    )
}
