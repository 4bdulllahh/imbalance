import { describe, expect, it } from "vitest";
import { riskNotes } from "./risk";

const o = (
  probability: number,
  netCents: number,
  volume30d: number,
  priceCents: number | null = netCents,
) => ({ probability, netCents, volume30d, priceCents });

describe("riskNotes", () => {
  it("flags value that rests on thin markets, even at low odds", () => {
    // Two 9% outcomes with no sales carry almost all the value.
    const notes = riskNotes(
      [o(0.09, 30000, 0), o(0.09, 17000, 1), o(0.82, 90, 60)],
      4300,
    );
    expect(notes[0]).toMatch(/^98% of the expected value/);
  });
  it("passes contracts whose value comes from liquid skins", () => {
    expect(riskNotes([o(0.5, 1000, 50), o(0.5, 100, 0)], 550)).toEqual([]);
  });
  it("flags missing prices", () => {
    expect(riskNotes([o(1, 0, 10, null)], 0)).toEqual([
      "1 outcome(s) have no price, counted as 0",
    ]);
  });
});
