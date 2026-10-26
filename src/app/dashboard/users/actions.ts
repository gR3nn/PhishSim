'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_EMAILS, APP_ROLES, canManageUsers, canModerateUsers, getRole } from '@/lib/authz'

async function assertUserManager(requireModeration = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() : { data: null }
  const role = getRole(user?.email, profile?.role)
  if (!user || !canManageUsers(role) || (requireModeration && !canModerateUsers(role))) throw new Error('Administrator access required')
  return { supabase, user, role }
}

function isProtected(email?: string) {
  return ADMIN_EMAILS.includes((email || '').toLowerCase() as (typeof ADMIN_EMAILS)[number])
}

export async function updateUserRole(formData: FormData) {
  const { supabase, user, role: currentRole } = await assertUserManager()
  const id = String(formData.get('userId') || '')
  const email = String(formData.get('email') || '')
  const role = String(formData.get('role') || '')
  if (!id || !APP_ROLES.includes(role as (typeof APP_ROLES)[number])) throw new Error('Invalid role update')
  if (id === user.id && role !== currentRole) throw new Error('You cannot change your own role')
  if (isProtected(email) && role !== 'admin') throw new Error('Protected administrators cannot be demoted')
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/users')
}

export async function setUserBan(formData: FormData) {
  const { user } = await assertUserManager(true)
  const id = String(formData.get('userId') || '')
  const email = String(formData.get('email') || '')
  const shouldBan = String(formData.get('ban') || '') === 'true'
  if (id === user.id) throw new Error('You cannot suspend your current account')
  if (isProtected(email)) throw new Error('Protected administrators cannot be banned')
  const admin = createAdminClient()
  if (!admin) throw new Error('Account management is temporarily unavailable')
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: shouldBan ? '876000h' : 'none' })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/users')
}

export async function deleteAccount(formData: FormData) {
  const { user } = await assertUserManager()
  const id = String(formData.get('userId') || '')
  const email = String(formData.get('email') || '')
  if (id === user.id || isProtected(email)) throw new Error('This administrator account cannot be deleted')
  const admin = createAdminClient()
  if (!admin) throw new Error('Account management is temporarily unavailable')
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/users')
}
