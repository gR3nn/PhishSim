'use client'

import { useActionState } from 'react'
import { Gift } from 'lucide-react'
import { redeemCoupon, type CouponState } from './billing-actions'
import { SubmitButton } from '@/components/submit-button'

const initialState: CouponState = {}

export default function CouponForm() {
  const [state, action] = useActionState(redeemCoupon, initialState)
  return <form action={action} className="coupon-form"><div><Gift size={20}/><span><strong>Have a coupon?</strong><small>Promotional credit can be redeemed once per account.</small></span></div><div className="coupon-entry"><input name="code" placeholder="Enter coupon" aria-label="Coupon code" required/><SubmitButton label="Redeem" pendingLabel="Checking…"/></div>{state.error && <p className="checkout-error">{state.error}</p>}{state.success && <p className="coupon-success">{state.success}</p>}</form>
}
