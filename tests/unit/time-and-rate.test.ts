import { afterEach, describe, expect, it } from "vitest";
import { fallbackRate, parseRateResponse, usdToCdf } from "@/lib/fx/rate";
import { recentDates, shortDayLabel, todayInAppTimezone } from "@/lib/time/kinshasa";

describe("todayInAppTimezone", () => {
  // 23:30 UTC le 9 octobre = déjà le 10 à Kinshasa (UTC+1).
  const lateEvening = new Date("2026-10-09T23:30:00Z");

  it("uses Kinshasa time, not UTC", () => {
    expect(lateEvening.toISOString().slice(0, 10)).toBe("2026-10-09");
    expect(todayInAppTimezone(lateEvening, "Africa/Kinshasa")).toBe("2026-10-10");
  });

  it("supports Lubumbashi (UTC+2)", () => {
    const evening = new Date("2026-10-09T22:30:00Z");
    expect(todayInAppTimezone(evening, "Africa/Lubumbashi")).toBe("2026-10-10");
    expect(todayInAppTimezone(evening, "Africa/Kinshasa")).toBe("2026-10-09");
  });
});

describe("recentDates", () => {
  it("lists the last days up to today, across month ends", () => {
    expect(recentDates(3, new Date("2026-10-01T10:00:00Z"), "Africa/Kinshasa")).toEqual([
      "2026-09-29",
      "2026-09-30",
      "2026-10-01"
    ]);
  });

  it("formats short French labels", () => {
    expect(shortDayLabel("2026-10-03")).toMatch(/^03 oct/);
  });
});

describe("USD → CDF rate", () => {
  const originalFallback = process.env.USD_CDF_FALLBACK_RATE;
  afterEach(() => {
    process.env.USD_CDF_FALLBACK_RATE = originalFallback;
  });

  it("reads the provider response", () => {
    const parsed = parseRateResponse({
      result: "success",
      rates: { CDF: 2843.517, USD: 1 },
      time_last_update_unix: 1791590400
    });
    expect(parsed).toEqual({ rate: 2843.52, source: "live", updatedAt: "2026-10-10T00:00:00.000Z" });
  });

  it("rejects errors and absurd values", () => {
    expect(parseRateResponse({ result: "error" })).toBeNull();
    expect(parseRateResponse({ result: "success", rates: { CDF: 1 } })).toBeNull();
    expect(parseRateResponse(null)).toBeNull();
  });

  it("falls back to the configured rate, then 2800", () => {
    process.env.USD_CDF_FALLBACK_RATE = "2900";
    expect(fallbackRate().rate).toBe(2900);
    process.env.USD_CDF_FALLBACK_RATE = "abc";
    expect(fallbackRate().rate).toBe(2800);
  });

  it("converts and rounds to whole francs", () => {
    expect(usdToCdf(20, 2843.52)).toBe(56870);
  });
});
