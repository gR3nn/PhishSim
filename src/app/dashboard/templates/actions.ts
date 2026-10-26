'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { canManageCampaigns, getRole } from '@/lib/authz'

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

export async function deleteTemplate(input: FormData | string) {
    const templateId = typeof input === 'string' ? input : String(input.get('id') || '')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    const { data: template } = await supabase.from('email_templates').select('is_default,user_id').eq('id', templateId).single()
    if (!template || template.is_default || template.user_id !== user.id) throw new Error('Default templates cannot be deleted')
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
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const role = getRole(user.email, profile?.role)
    const { data: original } = await supabase.from('email_templates').select('*').eq('id', id).single()
    if (!original) throw new Error('Template not found')

    let error
    if (original.is_default && !canManageCampaigns(role)) {
        const result = await supabase.from('email_templates').upsert({
            user_id: user.id, source_template_id: original.id, is_default: false,
            name, subject, body_html: bodyHtml, updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,source_template_id' })
        error = result.error
    } else {
        const result = await supabase.from('email_templates').update({ name, subject, body_html: bodyHtml, updated_at: new Date().toISOString() }).eq('id', id)
        error = result.error
    }

    if (error) {
        console.error('Error updating template:', error)
        throw new Error('Failed to update template')
    }

    redirect('/dashboard/templates')
}
