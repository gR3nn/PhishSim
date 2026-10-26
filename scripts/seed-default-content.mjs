import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const templates = [
  ['Password expiry notice', 'Your password expires today', 'A familiar urgency scenario about an expiring account.'],
  ['Shared document alert', 'A document has been shared with you', 'A collaboration invitation that teaches link inspection.'],
  ['Invoice review request', 'Invoice #4821 requires your review', 'A finance-themed attachment and payment-awareness scenario.'],
  ['Benefits enrollment', 'Action required: benefits enrollment', 'A human-resources message using a deadline as pressure.'],
  ['Cloud storage warning', 'Your storage is almost full', 'A quota warning designed to practice domain verification.'],
  ['Unusual sign-in', 'Unusual sign-in activity detected', 'A security alert that demonstrates safe account verification.'],
  ['Package delivery', 'We could not deliver your package', 'A delivery update that tests unexpected-link awareness.'],
  ['Payroll update', 'Confirm your payroll information', 'A sensitive-data request framed as an internal process.'],
  ['Meeting invitation', 'Updated agenda for tomorrow’s meeting', 'A calendar-themed scenario with an unfamiliar link.'],
  ['IT software update', 'Important security update available', 'An IT notice that teaches employees to use trusted channels.'],
  ['Executive request', 'Quick request before the meeting', 'A simulated executive-impersonation scenario without payments.'],
  ['Survey reward', 'Complete our survey and claim your reward', 'A reward-based scenario that demonstrates incentive pressure.'],
]

const pages = [
  ['Microsoft 365 awareness', 'microsoft-365-awareness', 'Microsoft 365 sign-in'],
  ['Google Workspace awareness', 'google-workspace-awareness', 'Google Workspace sign-in'],
  ['Document share awareness', 'document-share-awareness', 'Shared document'],
  ['Invoice portal awareness', 'invoice-portal-awareness', 'Invoice portal'],
  ['HR portal awareness', 'hr-portal-awareness', 'Employee benefits'],
  ['Cloud storage awareness', 'cloud-storage-awareness', 'Cloud storage'],
  ['Security alert awareness', 'security-alert-awareness', 'Account security'],
  ['Delivery notice awareness', 'delivery-notice-awareness', 'Parcel delivery'],
  ['Payroll portal awareness', 'payroll-portal-awareness', 'Payroll portal'],
  ['Calendar invite awareness', 'calendar-invite-awareness', 'Meeting invitation'],
  ['Software update awareness', 'software-update-awareness', 'Software update'],
  ['Survey reward awareness', 'survey-reward-awareness', 'Employee survey'],
]

const { data: authData, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (usersError) throw usersError

const seedOwner = authData.users.find((user) => user.email?.toLowerCase() === 'gradinarumanuel99@gmail.com') || authData.users.find((user) => user.email?.toLowerCase() === 'alexxperian@gmail.com')
if (!seedOwner) throw new Error('Create one protected administrator account before seeding defaults.')
for (const user of [seedOwner]) {
  const { data: existingTemplates } = await supabase.from('email_templates').select('name').eq('user_id', user.id)
  const templateNames = new Set((existingTemplates || []).map((item) => item.name))
  const templateRows = templates.filter(([name]) => !templateNames.has(name)).map(([name, subject, summary]) => ({
    user_id: user.id,
    is_default: true,
    name,
    subject,
    body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#17202e"><p style="color:#667085;font-size:13px">${summary}</p><h2>${subject}</h2><p>This authorized security-awareness exercise asks you to pause and verify the destination before continuing.</p><p><a href="{{link}}" style="display:inline-block;background:#1f6f54;color:white;padding:12px 18px;border-radius:7px;text-decoration:none">Review securely</a></p><p style="font-size:12px;color:#667085">Training message from your security team.</p></div>`,
  }))
  if (templateRows.length) { const { error } = await supabase.from('email_templates').insert(templateRows); if (error) throw error }

  const themes = [['#12b76a','#e8fff4','✓'],['#4f6bed','#eef1ff','G'],['#7f56d9','#f5efff','↗'],['#f79009','#fff7e6','€'],['#e04f75','#fff0f4','♥'],['#0891b2','#eafaff','☁'],['#dc2626','#fff0f0','!'],['#7c3aed','#f5f0ff','⌂'],['#0f766e','#e9fbf8','$'],['#2563eb','#edf4ff','◷'],['#475467','#f2f4f7','↑'],['#ca8a04','#fffbea','★']]
  let refreshedPages = 0
  for (let index = 0; index < pages.length; index++) {
    const [name, url_slug, label] = pages[index]
    const [accent, soft, icon] = themes[index]
    const html_content = `<div style="min-height:100vh;padding:clamp(24px,6vw,72px) 18px;background:radial-gradient(circle at 85% 12%,${soft},transparent 30%),linear-gradient(145deg,#f8fafc,#eef2f7);font-family:Inter,Arial,sans-serif;color:#101828;box-sizing:border-box"><main style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e4e7ec;border-radius:24px;box-shadow:0 24px 70px rgba(16,24,40,.12);overflow:hidden"><header style="height:9px;background:${accent}"></header><section style="padding:clamp(28px,6vw,58px)"><div style="display:flex;align-items:center;justify-content:space-between;gap:16px"><div style="width:54px;height:54px;border-radius:16px;background:${soft};color:${accent};display:grid;place-items:center;font-size:25px;font-weight:800">${icon}</div><span style="padding:7px 11px;border-radius:99px;background:${soft};color:${accent};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.8px">Safe simulation</span></div><p style="margin:30px 0 8px;color:${accent};font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px">PhishSafe learning moment</p><h1 style="margin:0;font-size:clamp(30px,6vw,48px);line-height:1.08;letter-spacing:-1.8px">This ${label} page was a simulation.</h1><p style="margin:20px 0 26px;color:#667085;font-size:16px;line-height:1.7">No harm done—this exercise helps build the habit of pausing before entering information on an unexpected page.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px"><div style="padding:18px;background:#f8fafc;border-radius:13px"><strong style="display:block;font-size:13px">01 · Check the sender</strong><span style="color:#667085;font-size:12px;line-height:1.5">Look for unusual domains and display names.</span></div><div style="padding:18px;background:#f8fafc;border-radius:13px"><strong style="display:block;font-size:13px">02 · Inspect the URL</strong><span style="color:#667085;font-size:12px;line-height:1.5">Hover before clicking and verify the destination.</span></div><div style="padding:18px;background:#f8fafc;border-radius:13px"><strong style="display:block;font-size:13px">03 · Verify separately</strong><span style="color:#667085;font-size:12px;line-height:1.5">Use a trusted channel when a request feels urgent.</span></div></div><div style="margin-top:24px;padding:16px 18px;display:flex;gap:10px;align-items:center;background:${soft};color:${accent};border-radius:12px;font-size:13px;font-weight:700"><span style="font-size:18px">✓</span>No passwords or private information were stored.</div></section><footer style="padding:16px 28px;background:#101828;color:#98a2b3;text-align:center;font-size:11px">PhishSafe · Authorized security-awareness training</footer></main></div>`
    const { data: existing } = await supabase.from('landing_pages').select('id').eq('user_id', user.id).eq('url_slug', url_slug).maybeSingle()
    const result = existing
      ? await supabase.from('landing_pages').update({ name, html_content, is_default: true }).eq('id', existing.id)
      : await supabase.from('landing_pages').insert({ user_id: user.id, name, url_slug, html_content, is_default: true })
    if (result.error) throw result.error
    refreshedPages++
  }
  console.log(`${user.email}: ${templateRows.length} templates added, ${refreshedPages} landing pages refreshed`)
}
