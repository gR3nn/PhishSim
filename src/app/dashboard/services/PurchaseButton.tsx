'use client'

import { useState } from 'react'
import { Check, ShoppingCart } from 'lucide-react'
import type { PlanId } from '@/lib/plans'

export type CartItem = { plan: PlanId; quantity: number }
const CART_KEY = 'phishsafe-cart'

export function readCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') as CartItem[] } catch { return [] }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('phishsafe-cart-change'))
}

export default function PurchaseButton({ plan, featured }: { plan: PlanId; featured?: boolean }) {
  const [quantity, setQuantity] = useState(plan === 'custom' ? 10 : 1)
  const [added, setAdded] = useState(false)
  function add() {
    const cart = readCart().filter((item) => item.plan !== plan && !(plan !== 'custom' && item.plan !== 'custom'))
    writeCart([...cart, { plan, quantity: plan === 'custom' ? Math.max(1, Math.min(10000, quantity)) : 1 }])
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
  }
  return <div className="add-plan-control">{plan === 'custom' && <label>Recipients<input type="number" min="1" max="10000" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}/><span>€{Math.max(1, quantity).toLocaleString()}</span></label>}<button onClick={add} className={`button ${featured ? 'primary' : 'secondary'}`}>{added ? <><Check size={15}/> Added to cart</> : <><ShoppingCart size={15}/> Add to cart</>}</button></div>
}
