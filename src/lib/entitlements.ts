import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export const PLAN_QUOTA = {
  custom: 1,
  starter: 2,
  growth: 10,
  enterprise: Number.POSITIVE_INFINITY,
} as const

export type EntitlementPlan = keyof typeof PLAN_QUOTA

type PaidOrder = {
  id: string
  plan: string
  billing_type: string | null
  credit_consumed: boolean | null
  created_at: string
  recipient_limit?: number | null
}

export type Entitlement = {
  canCreate: boolean
  plan: EntitlementPlan | null
  monthlyQuota: number
  usedThisMonth: number
  remainingMonthly: number
  oneTimeCredits: number
}

const NO_PLAN: Entitlement = {
  canCreate: false,
  plan: null,
  monthlyQuota: 0,
  usedThisMonth: 0,
  remainingMonthly: 0,
  oneTimeCredits: 0,
}

function startOfCurrentUtcMonth(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

const MONTHLY_RANK: EntitlementPlan[] = ['starter', 'growth', 'enterprise']

// True when the service-role admin client is available. Lets the billing page
// distinguish a misconfigured server (NO_PLAN because admin is null) from a user
// who genuinely has no plan.
export function isBillingConfigured(): boolean {
  return createAdminClient() !== null
}

export async function getEntitlement(userId: string): Promise<Entitlement> {
  const admin = createAdminClient()
  if (!admin) return NO_PLAN

  const { data: orders } = await admin
    .from('orders')
    .select('id, plan, billing_type, credit_consumed, created_at, recipient_limit')
    .eq('user_id', userId)
    .eq('status', 'paid')

  const paidOrders = (orders || []) as PaidOrder[]
  if (paidOrders.length === 0) return NO_PLAN

  // Determine the active monthly plan (highest-tier paid monthly order).
  const monthlyPlans = paidOrders
    .map((o) => o.plan)
    .filter((p): p is EntitlementPlan => (MONTHLY_RANK as string[]).includes(p))
  let activeMonthlyPlan: EntitlementPlan | null = null
  for (const plan of MONTHLY_RANK) {
    if (monthlyPlans.includes(plan)) activeMonthlyPlan = plan
  }

  const monthlyQuota = activeMonthlyPlan ? PLAN_QUOTA[activeMonthlyPlan] : 0

  // Count campaigns created this calendar month (UTC) for the user.
  const { count } = await admin
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfCurrentUtcMonth())

  const usedThisMonth = count ?? 0
  const remainingMonthly = Number.isFinite(monthlyQuota)
    ? Math.max(0, monthlyQuota - usedThisMonth)
    : Number.POSITIVE_INFINITY

  const oneTimeCredits = paidOrders.filter(
    (o) => o.plan === 'custom' && !o.credit_consumed,
  ).length

  const plan: EntitlementPlan | null = activeMonthlyPlan ?? (oneTimeCredits > 0 ? 'custom' : null)
  const canCreate = remainingMonthly > 0 || oneTimeCredits > 0

  return {
    canCreate,
    plan,
    monthlyQuota,
    usedThisMonth,
    remainingMonthly,
    oneTimeCredits,
  }
}

export async function canCoverRecipients(userId: string, recipientCount: number): Promise<boolean> {
  const entitlement = await getEntitlement(userId)
  if (entitlement.remainingMonthly > 0) return true
  const admin = createAdminClient()
  if (!admin) return false
  const { count } = await admin.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'paid').eq('plan', 'custom').eq('credit_consumed', false).gte('recipient_limit', recipientCount)
  return (count || 0) > 0
}

export async function consumeAllowance(userId: string, recipientCount = 1): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return

  const entitlement = await getEntitlement(userId)
  // Monthly quota covers this campaign — nothing to consume.
  if (entitlement.remainingMonthly > 0) return

  // Otherwise consume the oldest custom-campaign credit large enough for this audience.
  const { data: singles } = await admin
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .eq('plan', 'custom')
    .eq('credit_consumed', false)
    .gte('recipient_limit', recipientCount)
    .order('created_at', { ascending: true })
    .limit(1)

  const oldest = singles?.[0]
  if (!oldest) return

  await admin.from('orders').update({ credit_consumed: true }).eq('id', oldest.id)
}
