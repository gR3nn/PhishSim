'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CreditCard, ShoppingBag, Trash2, X } from 'lucide-react'
import { plans, type PlanId } from '@/lib/plans'
import { readCart, writeCart, type CartItem } from './PurchaseButton'

export default function CartPanel({ creditCents }: { creditCents: number }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { const sync = () => setItems(readCart()); sync(); window.addEventListener('phishsafe-cart-change', sync); return () => window.removeEventListener('phishsafe-cart-change', sync) }, [])
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])
  const total = useMemo(() => items.reduce((sum, item) => sum + plans[item.plan].price * item.quantity, 0), [items])
  function remove(plan: PlanId) { const next = items.filter((item) => item.plan !== plan); writeCart(next); setItems(next) }
  async function checkout() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Checkout is unavailable')
      writeCart([])
      window.location.href = data.url
    } catch (checkoutError) { setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout is unavailable'); setLoading(false) }
  }
  const drawer = open ? createPortal(
    <>
      <button className="cart-backdrop" onClick={() => setOpen(false)} aria-label="Close cart"/>
      <aside className="cart-drawer" aria-label="Shopping cart">
        <header><div><p className="eyebrow">Purchase summary</p><h2>Your cart</h2></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close cart"><X size={18}/></button></header>
        <div className="wallet-mini"><CreditCard size={17}/><span>Wallet credit</span><strong>€{(creditCents / 100).toFixed(2)}</strong></div>
        <div className="cart-items">{items.length === 0 ? <div className="empty-state"><ShoppingBag size={25}/><h3>Your cart is empty</h3><p>Add a campaign or plan to continue.</p></div> : items.map((item) => <article key={item.plan}><div><strong>{plans[item.plan].name}</strong><span>{item.plan === 'custom' ? `${item.quantity} recipients × €1` : 'Monthly subscription'}</span></div><b>€{(plans[item.plan].price * item.quantity).toFixed(2)}</b><button onClick={() => remove(item.plan)} aria-label={`Remove ${plans[item.plan].name}`}><Trash2 size={15}/></button></article>)}</div>
        <footer><div><span>Total</span><strong>€{total.toFixed(2)}</strong></div>{error && <p className="checkout-error">{error}</p>}<button className="button primary" disabled={!items.length || loading} onClick={checkout}>{loading ? 'Preparing checkout…' : creditCents >= total * 100 && items.every((item) => item.plan === 'custom') ? 'Pay with wallet credit' : 'Proceed to checkout'}</button><small>Custom campaigns use wallet credit first. Stripe handles remaining payments.</small></footer>
      </aside>
    </>,
    document.body,
  ) : null

  return <><button className="cart-button" onClick={() => setOpen(true)}><ShoppingBag size={18}/><span>Cart</span>{items.length > 0 && <em>{items.length}</em>}</button>{drawer}</>
}
