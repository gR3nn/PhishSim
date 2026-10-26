import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { action?: string; path?: string; label?: string }
  if (!body.action || !body.path) return NextResponse.json({ ok: false }, { status: 400 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 })
  await admin.from('activity_logs').insert({ user_id: user.id, action: body.action.slice(0, 80), path: body.path.slice(0, 500), label: body.label?.slice(0, 160) || null })
  return NextResponse.json({ ok: true })
}
