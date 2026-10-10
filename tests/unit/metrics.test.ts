import { describe, expect, it } from "vitest";
import { distanceCovered, isSuspiciousEntry } from "@/lib/entries/metrics";

describe("anti-fraud mileage rule", () => {
  it("computes the distance and never goes negative", () => {
    expect(distanceCovered(1000, 1080)).toBe(80);
    expect(distanceCovered(1080, 1000)).toBe(0);
  });

  it("flags many km for a tiny amount", () => {
    expect(isSuspiciousEntry(1000, 1080, 4000)).toBe(true);
    expect(isSuspiciousEntry(1000, 1080, 5000)).toBe(true);
  });

  it("does not flag normal days", () => {
    expect(isSuspiciousEntry(1000, 1050, 1000)).toBe(false); // 50 km pile
    expect(isSuspiciousEntry(1000, 1200, 60000)).toBe(false);
  });
});
