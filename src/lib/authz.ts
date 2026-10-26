export const ADMIN_EMAILS = [
  'gradinarumanuel99@gmail.com',
  'alexxperian@gmail.com',
] as const

export const APP_ROLES = ['client', 'admin', 'campaign_manager', 'support', 'auditor'] as const
export type AppRole = (typeof APP_ROLES)[number]

export const ROLE_LABELS: Record<AppRole, string> = {
  client: 'Client',
  admin: 'Administrator',
  campaign_manager: 'Campaign Manager',
  support: 'Support Agent',
  auditor: 'Auditor / Executive',
}

export function getRole(email?: string | null, storedRole?: string | null): AppRole {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase() as (typeof ADMIN_EMAILS)[number])) return 'admin'
  return APP_ROLES.includes(storedRole as AppRole) ? storedRole as AppRole : 'client'
}

export function isAdmin(email?: string | null, storedRole?: string | null) {
  return getRole(email, storedRole) === 'admin'
}

export function canManageCampaigns(role: AppRole) {
  return role === 'admin' || role === 'campaign_manager'
}

export function canManageUsers(role: AppRole) {
  return role === 'admin' || role === 'campaign_manager'
}

export function canModerateUsers(role: AppRole) {
  return role === 'admin'
}

export function isReadOnly(role: AppRole) {
  return role === 'auditor'
}

export function canUseBuilder(role: AppRole) {
  return role === 'client' || role === 'admin' || role === 'campaign_manager'
}

export function canHandleSupport(role: AppRole) {
  return role === 'admin' || role === 'campaign_manager' || role === 'support'
}
