import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getCreditBalance(userId: string): Promise<number> {
  const admin = createAdminClient()
  if (!admin) return 0
  const { data, error } = await admin
    .from('credit_transactions')
    .select('amount_cents')
    .eq('user_id', userId)
  if (error) return 0
  return (data || []).reduce((sum, row) => sum + Number(row.amount_cents || 0), 0)
}

export function formatCredits(cents: number) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
