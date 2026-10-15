import { describe, expect, it } from "vitest";
import { canAddVehicle, monthlyQuote, periodPriceUsd, subscriptionState } from "@/lib/billing/plans";

describe("monthly quote", () => {
  it("offers the cheapest vehicle", () => {
    expect(monthlyQuote(["taxi", "moto", "taxi"])).toMatchObject({
      vehicles: 3,
      freeVehicles: 1,
      billableVehicles: 2,
      subtotalUsd: 18,
      totalUsd: 18
    });
  });

  it("is free for a single vehicle", () => {
    expect(monthlyQuote(["taxi"]).totalUsd).toBe(0);
    expect(monthlyQuote([]).totalUsd).toBe(0);
  });

  it("applies volume discounts on billable vehicles", () => {
    const tenMotosAndOne = monthlyQuote(Array(11).fill("moto"));
    expect(tenMotosAndOne).toMatchObject({ billableVehicles: 10, subtotalUsd: 40, discountPercent: 10, totalUsd: 36 });
    expect(monthlyQuote(Array(31).fill("moto"))).toMatchObject({ discountPercent: 20, totalUsd: 96 });
  });

  it("gives two months on a yearly payment", () => {
    expect(periodPriceUsd(18, 12)).toBe(180);
    expect(periodPriceUsd(18, 3)).toBe(54);
  });
});

describe("subscription state", () => {
  it("is in trial until the trial ends", () => {
    expect(subscriptionState({ trial_ends_at: "2026-11-13", paid_until: null }, "2026-10-14")).toEqual({
      status: "trial",
      accessUntil: "2026-11-13",
      daysLeft: 30
    });
  });

  it("is active while paid, using the latest date", () => {
    expect(subscriptionState({ trial_ends_at: "2026-09-01", paid_until: "2026-12-01" }, "2026-10-14")).toMatchObject({
      status: "active",
      accessUntil: "2026-12-01"
    });
  });

  it("expires after both dates and blocks new paid vehicles", () => {
    const state = subscriptionState({ trial_ends_at: "2026-09-01", paid_until: "2026-10-01" }, "2026-10-14");
    expect(state).toMatchObject({ status: "expired", daysLeft: -13 });
    expect(canAddVehicle(state, 0)).toBe(true);
    expect(canAddVehicle(state, 1)).toBe(false);
    expect(canAddVehicle({ ...state, status: "active" }, 50)).toBe(true);
  });
});
