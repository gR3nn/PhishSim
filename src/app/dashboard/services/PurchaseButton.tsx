'use client'

import { useState } from 'react'
import type { PlanId } from '@/lib/plans'

export default function PurchaseButton({ plan, featured }: { plan: PlanId; featured?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(false)

  async function checkout() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await response.json()
      if (response.status === 503) {
        setError("Checkout unavailable — payments aren't configured yet.")
        setUnavailable(true)
        setLoading(false)
        return
      }
      if (!response.ok) throw new Error(data.error || 'Checkout is unavailable')
      window.location.href = data.url
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout is unavailable')
      setLoading(false)
    }
  }

  return <><button onClick={checkout} disabled={loading || unavailable} className={`button ${featured ? 'primary' : 'secondary'}`}>{loading ? 'Opening checkout…' : unavailable ? 'Checkout unavailable' : 'Choose plan'}</button>{error && <p className="checkout-error">{error}</p>}</>
}
