export interface BatchTier {
  minQty: number;
  discountPct: number;
}

export const DEFAULT_BATCH_TIERS: BatchTier[] = [
  { minQty: 10, discountPct: 5 },
  { minQty: 25, discountPct: 10 },
  { minQty: 50, discountPct: 15 },
];

/**
 * Find the applicable batch discount for a given quantity.
 * Returns the discount percentage (0 if no tier matches).
 */
export function getBatchDiscount(quantity: number, tiers: BatchTier[]): number {
  // Sort tiers by minQty descending to find the highest applicable tier
  const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
  for (const tier of sorted) {
    if (quantity >= tier.minQty) {
      return tier.discountPct;
    }
  }
  return 0;
}

/**
 * Apply batch discount to a total price.
 */
export function applyBatchDiscount(
  totalPrice: number,
  quantity: number,
  tiers: BatchTier[] | null
): { discountPct: number; discountAmount: number; finalPrice: number } {
  if (!tiers || tiers.length === 0) {
    return { discountPct: 0, discountAmount: 0, finalPrice: totalPrice };
  }

  const discountPct = getBatchDiscount(quantity, tiers);
  if (discountPct <= 0) {
    return { discountPct: 0, discountAmount: 0, finalPrice: totalPrice };
  }

  const discountAmount = Math.round(totalPrice * (discountPct / 100) * 100) / 100;
  const finalPrice = Math.round((totalPrice - discountAmount) * 100) / 100;

  return { discountPct, discountAmount, finalPrice };
}
