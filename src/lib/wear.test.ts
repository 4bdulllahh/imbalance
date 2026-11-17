import { describe, expect, it } from "vitest";
import { marketHashName, toCents, wearForFloat } from "./wear";

describe("wearForFloat", () => {
  it.each([
    [0, "Factory New"],
    [0.0699, "Factory New"],
    [0.07, "Minimal Wear"],
    [0.15, "Field-Tested"],
    [0.3799, "Field-Tested"],
    [0.38, "Well-Worn"],
    [0.45, "Battle-Scarred"],
    [1, "Battle-Scarred"],
  ])("%f is %s", (f, wear) => expect(wearForFloat(f)).toBe(wear));

  it("rejects floats outside 0..1", () => {
    expect(() => wearForFloat(-0.1)).toThrow();
    expect(() => wearForFloat(Number.NaN)).toThrow();
  });
});

describe("marketHashName", () => {
  it("builds normal, StatTrak and souvenir names", () => {
    expect(marketHashName("AK-47 | Redline", "Field-Tested")).toBe(
      "AK-47 | Redline (Field-Tested)",
    );
    expect(marketHashName("AK-47 | Redline", "Field-Tested", "stattrak")).toBe(
      "StatTrak™ AK-47 | Redline (Field-Tested)",
    );
    expect(marketHashName("AWP | Dragon Lore", "Factory New", "souvenir")).toBe(
      "Souvenir AWP | Dragon Lore (Factory New)",
    );
  });

  it("puts the star before StatTrak on knives and skips wear for vanilla", () => {
    expect(marketHashName("★ Karambit | Fade", "Factory New", "stattrak")).toBe(
      "★ StatTrak™ Karambit | Fade (Factory New)",
    );
    expect(marketHashName("★ Karambit", null)).toBe("★ Karambit");
  });
});

describe("toCents", () => {
  it("rounds dollars to cents", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(12.345)).toBe(1235);
    expect(toCents(null)).toBeNull();
  });
});
