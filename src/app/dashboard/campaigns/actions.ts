'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendEmail } from '@/lib/email'
import { isAdmin } from '@/lib/authz'

export async function launchCampaign(formData: FormData) {
    const title = formData.get('title') as string
    const templateId = formData.get('templateId') as string
    const groupId = formData.get('groupId') as string
    const landingPageUrl = formData.get('landingPageUrl') as string

    if (!title || !templateId || !groupId || !landingPageUrl) {
        throw new Error('All fields are required')
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    // Campaign requests are reviewed by an administrator before any email is sent.
    const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
            title,
            user_id: user.id,
            template_id: templateId,
            group_id: groupId,
            landing_page_url: landingPageUrl,
            status: 'pending_approval',
            requested_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (campaignError || !campaign) {
        console.error('Error creating campaign:', campaignError)
        throw new Error('Failed to create campaign')
    }

    redirect(`/dashboard/campaigns/${campaign.id}`)
}

export async function approveCampaign(campaignId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() : { data: null }
    if (!user || !isAdmin(user.email, profile?.role)) throw new Error('Administrator access required')

    const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', campaignId).single()
    if (!campaign || campaign.status !== 'pending_approval') throw new Error('Campaign request is not available for approval')

    const { data: group } = await supabase
        .from('groups')
        .select('name, targets(*)')
        .eq('id', campaign.group_id)
        .single()
    const targets = group?.targets
    if (!targets || targets.length === 0) {
        throw new Error('This campaign has no recipients')
    }
    const { data: template } = await supabase
        .from('email_templates')
        .select('subject, body_html')
        .eq('id', campaign.template_id)
        .single()
    if (!template) throw new Error('Template not found')

    const eventsToInsert: { campaign_id: string; target_email: string; event_type: 'sent' }[] = []
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let slug = campaign.landing_page_url.replace(/^\//, '')
    if (slug.startsWith('l/')) slug = slug.substring(2)

    for (const target of targets) {
        const trackingPath = `/${encodeURIComponent(campaign.title)}/${encodeURIComponent(group!.name)}/${slug}`
        const trackingLink = `${baseUrl}${trackingPath}?t=${encodeURIComponent(target.email)}`
        const pixelLink = `${baseUrl}/api/track/${campaign.id}/${encodeURIComponent(target.email)}/pixel`
        let htmlBody = template.body_html.replace(/{{link}}/g, trackingLink)
        htmlBody += `<img src="${pixelLink}" alt="" width="1" height="1" style="display:none;" />`
        try {
            const result = await sendEmail({ to: target.email, subject: template.subject, html: htmlBody })
            if (result.success) {
                eventsToInsert.push({ campaign_id: campaign.id, target_email: target.email, event_type: 'sent' })
            } else {
                console.error(`Failed to send to ${target.email}:`, result.error)
            }
        } catch (err) {
            console.error(`Exception sending to ${target.email}:`, err)
        }
    }

    if (eventsToInsert.length > 0) await supabase.from('events').insert(eventsToInsert)
    await supabase.from('campaigns').update({ status: 'sent', approved_at: new Date().toISOString(), approved_by: user.id }).eq('id', campaignId)
    redirect('/dashboard/requests')
}

export async function rejectCampaign(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() : { data: null }
    if (!user || !isAdmin(user.email, profile?.role)) throw new Error('Administrator access required')
    const campaignId = String(formData.get('campaignId') || '')
    const reason = String(formData.get('reason') || 'Request requires changes')
    await supabase.from('campaigns').update({ status: 'rejected', rejection_reason: reason, approved_by: user.id }).eq('id', campaignId).eq('status', 'pending_approval')
    redirect('/dashboard/requests')
}

export async function deleteCampaign(campaignId: string) {
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('Unauthorized')
    }

    // Delete campaign (cascade should handle events, but let's be safe)
    // Assuming foreign keys are set to cascade delete. If not, we'd need to delete events first.
    // For this prototype, we'll assume cascade or just delete campaign.
    const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', user.id) // Security: ensure user owns campaign

    if (error) {
        console.error('Error deleting campaign:', error)
        throw new Error('Failed to delete campaign')
    }

    redirect('/dashboard')
}
