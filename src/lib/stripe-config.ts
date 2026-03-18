// Stripe subscription plans (feature tiers - no credits included)
export const STRIPE_PLANS = {
  voice_ai_starter: {
    product_id: "prod_UAKJ5dOxLJKE04",
    price_id: "price_1TBzeiEpCunE9Xtl5wQgmFR5",
    name: "Starter",
    price: 29,
  },
  voice_ai_pro: {
    product_id: "prod_UAKJcs9sFOIoTM",
    price_id: "price_1TBzejEpCunE9XtlPmhkEjK0",
    name: "Professional",
    price: 79,
  },
  voice_ai_enterprise: {
    product_id: "prod_UAKJ4wJmMCazWO",
    price_id: "price_1TBzekEpCunE9Xtllayp82Cw",
    name: "Agency",
    price: 199,
  },
} as const;

// Credit packages (one-time purchases)
export const CREDIT_PACKAGES: readonly {
  id: string;
  credits: number;
  price: number;
  perCredit: number;
  product_id: string;
  price_id: string;
  bestValue?: boolean;
}[] = [
  {
    id: "credits_500",
    credits: 500,
    price: 25,
    perCredit: 0.18,
    product_id: "prod_UAKJEI0Lwa8jXv",
    price_id: "price_1TBzelEpCunE9Xtl05gGjZBm",
  },
  {
    id: "credits_1000",
    credits: 1000,
    price: 45,
    perCredit: 0.18,
    product_id: "prod_UAKJ5Sgegu3FBL",
    price_id: "price_1TBzenEpCunE9Xtl9xcb36Ke",
  },
  {
    id: "credits_5000",
    credits: 5000,
    price: 175,
    perCredit: 0.18,
    bestValue: true,
    product_id: "prod_UAKJiPhkZQKvhg",
    price_id: "price_1TBzeoEpCunE9XtlUWyTEZun",
  },
  {
    id: "credits_10000",
    credits: 10000,
    price: 300,
    perCredit: 0.03,
    product_id: "prod_UAKJcZSh9gRfaW",
    price_id: "price_1TBzepEpCunE9Xtlk2f2asVZ",
  },
];

// Reverse lookup: product_id → plan key
export function getPlanByProductId(productId: string): string | null {
  for (const [key, val] of Object.entries(STRIPE_PLANS)) {
    if (val.product_id === productId) return key;
  }
  return null;
}

// Get credit package by id
export function getCreditPackageById(id: string) {
  return CREDIT_PACKAGES.find(p => p.id === id) ?? null;
}
