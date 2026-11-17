export const WEARS = [
  { name: "Factory New", short: "FN", max: 0.07 },
  { name: "Minimal Wear", short: "MW", max: 0.15 },
  { name: "Field-Tested", short: "FT", max: 0.38 },
  { name: "Well-Worn", short: "WW", max: 0.45 },
  { name: "Battle-Scarred", short: "BS", max: 1 },
] as const;

export type WearName = (typeof WEARS)[number]["name"];

/** Wear tier for a float. Boundaries belong to the next tier up (0.07 is Minimal Wear). */
export function wearForFloat(float: number): WearName {
  if (!(float >= 0 && float <= 1))
    throw new RangeError(`Float out of range: ${float}`);
  return (WEARS.find((w) => float < w.max) ?? WEARS[WEARS.length - 1]).name;
}

/** Steam market name, e.g. "StatTrak™ AK-47 | Redline (Field-Tested)". */
export function marketHashName(
  skinName: string,
  wear: WearName | null,
  variant: "normal" | "stattrak" | "souvenir" = "normal",
): string {
  const star = skinName.startsWith("★ ");
  const base = star ? skinName.slice(2) : skinName;
  const prefix =
    variant === "stattrak"
      ? "StatTrak™ "
      : variant === "souvenir"
        ? "Souvenir "
        : "";
  const name = `${star ? "★ " : ""}${prefix}${base}`;
  return wear ? `${name} (${wear})` : name;
}

/** Dollars from an API to integer cents. Returns null for missing prices. */
export function toCents(dollars: number | null | undefined): number | null {
  return dollars == null ? null : Math.round(dollars * 100);
}
