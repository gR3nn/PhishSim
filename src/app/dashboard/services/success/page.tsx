import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function PaymentSuccessPage() {
  return <div className="panel empty-state payment-success"><div><CheckCircle2 size={26} /></div><p className="eyebrow">Payment confirmed</p><h1>Your workspace is ready</h1><p>Stripe accepted the payment. You can now prepare a campaign request for admin approval.</p><Link href="/dashboard/campaigns/create" className="button primary">Create campaign request</Link></div>
}
