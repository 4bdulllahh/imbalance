import type { Metadata } from "next";
import { Catalog } from "@/components/Catalog";

export const metadata: Metadata = { title: "Skins | Imbalance" };

export default function CatalogPage() {
  return <Catalog />;
}
