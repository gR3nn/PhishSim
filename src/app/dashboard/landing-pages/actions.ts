'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canManageCampaigns, getRole } from '@/lib/authz'

export async function createLandingPage(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const name = formData.get('name') as string
    const urlSlug = formData.get('urlSlug') as string
    const htmlContent = formData.get('htmlContent') as string

    if (!name || !urlSlug || !htmlContent) {
        throw new Error('Missing required fields')
    }

    // Ensure slug is URL safe
    const safeSlug = urlSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    const { error } = await supabase
        .from('landing_pages')
        .insert({
            user_id: user.id,
            name,
            url_slug: safeSlug,
            html_content: htmlContent,
        })

    if (error) {
        console.error('Error creating landing page:', error)
        throw new Error(`Failed to create landing page: ${error.message}`)
    }

    revalidatePath('/dashboard/landing-pages')
    redirect('/dashboard/landing-pages')
}

export async function updateLandingPage(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const urlSlug = formData.get('urlSlug') as string
    const htmlContent = formData.get('htmlContent') as string

    if (!id || !name || !urlSlug || !htmlContent) {
        throw new Error('Missing required fields')
    }

    // Ensure slug is URL safe
    const safeSlug = urlSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const role = getRole(user.email, profile?.role)
    const { data: original } = await supabase.from('landing_pages').select('*').eq('id', id).single()
    if (!original) throw new Error('Landing page not found')
    let error
    let createdOverride = false
    if (original.is_default && !canManageCampaigns(role)) {
        createdOverride = true
        const result = await supabase.from('landing_pages').upsert({
            user_id: user.id, source_template_id: original.id, is_default: false,
            name, url_slug: safeSlug, html_content: htmlContent, updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,source_template_id' })
        error = result.error
    } else {
        const result = await supabase.from('landing_pages').update({ name, url_slug: safeSlug, html_content: htmlContent, updated_at: new Date().toISOString() }).eq('id', id)
        error = result.error
    }

    if (error) {
        if (error.code === '23505') {
            throw new Error('A landing page with that URL slug already exists. Choose a different slug.')
        }
        console.error('Error updating landing page:', error)
        throw new Error('Failed to update landing page')
    }

    revalidatePath('/dashboard/landing-pages')
    revalidatePath(`/dashboard/landing-pages/${id}`)
    redirect(createdOverride ? '/dashboard/landing-pages' : `/dashboard/landing-pages/${id}`)
}

export async function deleteLandingPage(input: FormData | string) {
    const id = typeof input === 'string' ? input : String(input.get('id') || '')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: page } = await supabase.from('landing_pages').select('is_default,user_id').eq('id', id).single()
    if (!page || page.is_default || page.user_id !== user.id) throw new Error('Default landing pages cannot be deleted')
    const { error } = await supabase
        .from('landing_pages')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        console.error('Error deleting landing page:', error)
        throw new Error('Failed to delete landing page')
    }

    revalidatePath('/dashboard/landing-pages')
    redirect('/dashboard/landing-pages')
}
