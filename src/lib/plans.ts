export const plans = {
  custom: {
    name: 'Custom campaign',
    price: 1,
    billing: 'per-recipient',
    description: 'Pay only for the exact audience used in one campaign.',
    features: ['€1 per recipient', 'One approved campaign', 'Full analytics', 'No subscription required'],
  },
  starter: {
    name: 'Starter',
    price: 49,
    billing: 'monthly',
    description: 'A focused baseline for small teams beginning awareness training.',
    features: ['Up to 100 recipients', '2 campaigns per month', 'Core analytics', 'Email support'],
  },
  growth: {
    name: 'Growth',
    price: 129,
    billing: 'monthly',
    description: 'Deeper simulations and reporting for growing organizations.',
    features: ['Up to 1,000 recipients', '10 campaigns per month', 'Advanced analytics', 'Custom landing pages'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    billing: 'monthly',
    description: 'High-volume protection with dedicated support and governance.',
    features: ['Unlimited recipients', 'Unlimited campaigns', 'Role management', 'Priority support'],
  },
} as const

export type PlanId = keyof typeof plans
