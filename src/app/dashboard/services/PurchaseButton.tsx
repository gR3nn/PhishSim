'use client'

import { useState } from 'react'
import type { PlanId } from '@/lib/plans'

export default function PurchaseButton({ plan, featured }: { plan: PlanId; featured?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(false)

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
        setError('Plan selected — checkout is ready to connect when payments are enabled.')
        setSelected(true)
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

  return <><button onClick={checkout} disabled={loading} className={`button ${featured ? 'primary' : 'secondary'} ${selected ? 'selected-plan' : ''}`}>{loading ? 'Opening checkout…' : selected ? 'Selected ✓' : 'Choose plan'}</button>{error && <p className={selected ? 'checkout-note' : 'checkout-error'}>{error}</p>}</>
}
