// Stripe product and price IDs mapping
export const STRIPE_PLANS = {
  voice_ai_starter: {
    product_id: "prod_UAIcsIU5RRCumd",
    price_id: "price_1TBy1EEpCunE9XtlAcNL4bgn",
  },
  voice_ai_pro: {
    product_id: "prod_UAIc5Dg0R8WHIJ",
    price_id: "price_1TBy1FEpCunE9Xtl8g389V1X",
  },
  voice_ai_enterprise: {
    product_id: "prod_UAIcHtavPFj54f",
    price_id: "price_1TBy1GEpCunE9XtlVh46E9Eh",
  },
} as const;

// Reverse lookup: product_id → plan key
export function getPlanByProductId(productId: string): string | null {
  for (const [key, val] of Object.entries(STRIPE_PLANS)) {
    if (val.product_id === productId) return key;
  }
  return null;
}
