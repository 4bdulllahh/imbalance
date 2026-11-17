import type { Metadata } from "next";
import { TradeUps } from "@/components/TradeUps";

export const metadata: Metadata = { title: "Trade-ups | Imbalance" };

export default function TradeUpsPage() {
  return <TradeUps />;
}
