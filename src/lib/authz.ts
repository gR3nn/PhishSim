export const ADMIN_EMAILS = [
  'gradinarumanuel99@gmail.com',
  'alexxperian@gmail.com',
] as const

export type AppRole = 'admin' | 'client'

export function getRole(email?: string | null, storedRole?: string | null): AppRole {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase() as (typeof ADMIN_EMAILS)[number])) return 'admin'
  return storedRole === 'admin' ? 'admin' : 'client'
}

export function isAdmin(email?: string | null, storedRole?: string | null) {
  return getRole(email, storedRole) === 'admin'
}
