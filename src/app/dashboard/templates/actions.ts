'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createTemplate(formData: FormData) {
    const name = formData.get('name') as string
    const subject = formData.get('subject') as string
    const bodyHtml = formData.get('bodyHtml') as string

    if (!name || !subject || !bodyHtml) {
        throw new Error('All fields are required')
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    const { error } = await supabase
        .from('email_templates')
        .insert({
            name,
            subject,
            body_html: bodyHtml,
            user_id: user.id,
        })

    if (error) {
        console.error('Error creating template:', error)
        throw new Error('Failed to create template')
    }

    redirect('/dashboard/templates')
}

export async function deleteTemplate(templateId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user.id)

    if (error) {
        throw new Error('Failed to delete template')
    }

    redirect('/dashboard/templates')
}

export async function updateTemplate(formData: FormData) {
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const subject = formData.get('subject') as string
    const bodyHtml = formData.get('bodyHtml') as string

    if (!id || !name || !subject || !bodyHtml) {
        throw new Error('All fields are required')
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    const { error } = await supabase
        .from('email_templates')
        .update({
            name,
            subject,
            body_html: bodyHtml,
        })
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        console.error('Error updating template:', error)
        throw new Error('Failed to update template')
    }

    redirect('/dashboard/templates')
}
