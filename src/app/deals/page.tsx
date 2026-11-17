import type { Metadata } from "next";
import { Deals } from "@/components/Deals";

export const metadata: Metadata = { title: "Deals | Imbalance" };

export default function DealsPage() {
  return <Deals />;
}
