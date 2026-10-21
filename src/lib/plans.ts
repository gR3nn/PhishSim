export const plans = {
  single: {
    name: 'Single campaign',
    price: 39,
    billing: 'one-time',
    description: 'One focused simulation without a monthly commitment.',
    features: ['Up to 100 recipients', 'One approved campaign', 'Full analytics', '12 training scenarios'],
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
