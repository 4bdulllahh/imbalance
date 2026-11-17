export const MARKETPLACE_IDS = ["skinport", "csfloat", "steam"] as const;
export type MarketplaceId = (typeof MARKETPLACE_IDS)[number];

export type Marketplace = {
  id: MarketplaceId;
  label: string;
  /** What the seller receives, in cents, for a sale at `priceCents`. */
  net: (priceCents: number) => number;
  feeNote: string;
};

export const MARKETPLACES: Record<MarketplaceId, Marketplace> = {
  skinport: {
    id: "skinport",
    label: "Skinport",
    net: (p) => p - Math.round(p * 0.08),
    feeNote: "8% seller fee",
  },
  csfloat: {
    id: "csfloat",
    label: "CSFloat",
    net: (p) => p - Math.round(p * 0.02),
    feeNote: "2% seller fee",
  },
  steam: {
    id: "steam",
    label: "Steam Market",
    // Buyer pays seller amount + 5% Steam fee + 10% CS2 fee (each at least 1 cent).
    net: steamNet,
    feeNote: "about 13% (5% Steam + 10% CS2, taken from the buyer's price)",
  },
};

export function steamNet(buyerPays: number): number {
  if (buyerPays <= 2) return 0;
  const fees = (s: number) =>
    Math.max(1, Math.floor(s * 0.05)) + Math.max(1, Math.floor(s * 0.1));
  let seller = Math.floor(buyerPays / 1.15);
  // Walk to the largest seller amount whose total doesn't exceed what the buyer pays.
  while (seller + 1 + fees(seller + 1) <= buyerPays) seller++;
  while (seller > 0 && seller + fees(seller) > buyerPays) seller--;
  return seller;
}

export const isMarketplaceId = (v: unknown): v is MarketplaceId =>
  typeof v === "string" && v in MARKETPLACES;
