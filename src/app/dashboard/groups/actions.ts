'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createGroup(formData: FormData) {
    const name = formData.get('name') as string
    const targetsText = String(formData.get('targetsText') || '')

    if (!name || !targetsText.trim()) {
        throw new Error('A name and at least one recipient are required')
    }

    if (!targetsText.trim().endsWith(';')) throw new Error('Every recipient entry must end with a semicolon (;)')
    const entries = targetsText.split(';').map((entry) => entry.trim()).filter(Boolean)
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const seen = new Set<string>()
    const parsedTargets = entries.map((entry) => {
        const [rawEmail, ...nameParts] = entry.split(',')
        const email = rawEmail.trim().toLowerCase()
        if (!emailPattern.test(email)) throw new Error(`Invalid email address: ${rawEmail.trim()}`)
        if (seen.has(email)) throw new Error(`Duplicate email address: ${email}`)
        seen.add(email)
        return { email, name: nameParts.join(',').trim() }
    })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: group, error: groupError } = await supabase.from('groups').insert({ name, user_id: user.id }).select().single()
    if (groupError || !group) throw new Error('Failed to create audience')
    const targets = parsedTargets.map((target) => ({ ...target, group_id: group.id }))

    if (targets.length > 0) {
        const { error: targetsError } = await supabase
            .from('targets')
            .insert(targets)

        if (targetsError) {
            console.error('Error inserting targets:', targetsError)
            await supabase.from('groups').delete().eq('id', group.id)
            throw new Error('Failed to upload targets')
        }
    }

    redirect('/dashboard/groups')
}

export async function deleteGroup(groupId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('groups').delete().eq('id', groupId)

    if (error) {
        throw new Error('Failed to delete group')
    }

    redirect('/dashboard/groups')
}

export async function updateGroup(formData: FormData) {
    const id = formData.get('id') as string
    const name = formData.get('name') as string

    if (!id || !name) {
        throw new Error('ID and Name are required')
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    const { error } = await supabase
        .from('groups')
        .update({ name })
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        console.error('Error updating group:', error)
        throw new Error('Failed to update group')
    }

    redirect('/dashboard/groups')
}
