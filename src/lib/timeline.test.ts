import { describe, expect, it } from "vitest";
import { contractTimeline, DAY, daysToSell, nextSteps } from "./timeline";

describe("timeline", () => {
  it("estimates days to sell from 30-day sales", () => {
    expect(daysToSell(0)).toBeNull();
    expect(daysToSell(90)).toBe(1);
    expect(daysToSell(1000)).toBe(0.5);
    expect(daysToSell(1)).toBe(60);
  });

  it("adds the trade hold and the expected selling time", () => {
    const t = contractTimeline(7, [
      { probability: 0.5, volume30d: 90 }, // 1 day
      { probability: 0.5, volume30d: 0 }, // unsellable: 30 days
    ]);
    expect(t).toEqual({ holdDays: 7, sellDays: 15.5, totalDays: 22.5 });
  });

  it("says what to do with each item and when to come back", () => {
    const now = 100 * DAY;
    const h = (
      id: number,
      tradableAt: number,
      costCents: number,
      valueCents: number | null,
      status = "holding",
    ) => ({
      id,
      marketHashName: `Item ${id}`,
      tradableAt,
      status,
      costCents,
      valueCents,
    });
    const { steps, comeBackAt } = nextSteps(
      [
        h(1, now + 3 * DAY, 100, 200),
        h(2, now - DAY, 100, 150),
        h(3, now - DAY, 100, 80),
        h(4, now + DAY, 100, 90),
        h(5, 0, 1, 1, "sold"),
      ],
      now,
    );
    expect(steps.map((s) => [s.id, s.kind])).toEqual([
      [2, "sell"],
      [3, "hold"],
      [4, "wait"],
      [1, "wait"],
    ]);
    expect(steps[0].gainCents).toBe(50);
    expect(comeBackAt).toBe(now + DAY);
  });
});
