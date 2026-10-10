import { describe, expect, it } from "vitest";
import { daysUntil, expiryLabel, expiryState, reminderThreshold } from "@/lib/documents/expiry";
import { findContinuityAnomalies, findMissingDays } from "@/lib/entries/continuity";
import { formatPawapayAmount, guessProvider, toPawapayMsisdn } from "@/lib/mobile-money/operators";

describe("mobile money operators", () => {
  it.each([
    ["0812345678", "VODACOM_MPESA_COD"],
    ["+243 99 123 4567", "AIRTEL_COD"],
    ["0851234567", "ORANGE_COD"],
    ["0901234567", null], // Africell : non pris en charge
    ["abc", null]
  ])("guesses %s → %s", (phone, provider) => {
    expect(guessProvider(phone)).toBe(provider);
  });

  it("formats the MSISDN without +", () => {
    expect(toPawapayMsisdn("081 234 5678")).toBe("243812345678");
    expect(toPawapayMsisdn("123")).toBeNull();
  });

  it("follows each operator's decimal rules", () => {
    expect(formatPawapayAmount(15000.6, "CDF", "VODACOM_MPESA_COD")).toBe("15001");
    expect(formatPawapayAmount(15000.6, "CDF", "AIRTEL_COD")).toBe("15000.6");
    expect(formatPawapayAmount(12.345, "USD", "VODACOM_MPESA_COD")).toBe("12.35");
    expect(formatPawapayAmount(20, "USD", "ORANGE_COD")).toBe("20");
    expect(formatPawapayAmount(0, "CDF", "ORANGE_COD")).toBeNull();
    expect(formatPawapayAmount(0.004, "USD", "ORANGE_COD")).toBeNull();
  });
});

describe("odometer continuity (courses hors application)", () => {
  const entry = (id: string, date: string, start: number, end: number, vehicle = "v1") => ({
    id,
    vehicle_id: vehicle,
    entry_date: date,
    start_km: start,
    end_km: end
  });

  it("detects km driven between two declared days", () => {
    const anomalies = findContinuityAnomalies([
      entry("a", "2026-10-01", 1000, 1100),
      entry("b", "2026-10-02", 1180, 1250) // 80 km roulés la nuit sans recette
    ]);
    expect(anomalies).toEqual([
      expect.objectContaining({ kind: "undeclared_km", entry_id: "b", gap_km: 80, previous_end_km: 1100 })
    ]);
  });

  it("detects an odometer going backwards", () => {
    const anomalies = findContinuityAnomalies([entry("a", "2026-10-01", 1000, 1100), entry("b", "2026-10-02", 1050, 1120)]);
    expect(anomalies[0]).toMatchObject({ kind: "odometer_rollback", gap_km: -50 });
  });

  it("tolerates small gaps, ignores other vehicles and unsorted input", () => {
    const anomalies = findContinuityAnomalies([
      entry("b", "2026-10-02", 1103, 1200),
      entry("a", "2026-10-01", 1000, 1100),
      entry("c", "2026-10-02", 5000, 5100, "v2")
    ]);
    expect(anomalies).toEqual([]);
  });

  it("skips legacy rows without mileage", () => {
    expect(findContinuityAnomalies([entry("a", "2026-10-01", 0, 0), entry("b", "2026-10-02", 900, 950)])).toEqual([]);
  });

  it("lists days without any entry", () => {
    const missing = findMissingDays(
      [{ vehicle_id: "v1", entry_date: "2026-10-01" }],
      ["v1", "v2"],
      ["2026-10-01", "2026-10-02"]
    );
    expect(missing).toEqual([
      { vehicle_id: "v1", date: "2026-10-02" },
      { vehicle_id: "v2", date: "2026-10-01" },
      { vehicle_id: "v2", date: "2026-10-02" }
    ]);
  });
});

describe("document expiry", () => {
  it("counts days across months", () => {
    expect(daysUntil("2026-11-01", "2026-10-10")).toBe(22);
    expect(daysUntil("2026-10-01", "2026-10-10")).toBe(-9);
  });

  it("classifies documents", () => {
    expect(expiryState("2026-10-01", "2026-10-10")).toBe("expired");
    expect(expiryState("2026-10-25", "2026-10-10")).toBe("soon");
    expect(expiryState("2027-01-01", "2026-10-10")).toBe("ok");
    expect(expiryState(null, "2026-10-10")).toBe("unknown");
    expect(expiryLabel("2026-10-10", "2026-10-10")).toBe("Expire aujourd'hui");
  });

  it("picks the reminder threshold reached today", () => {
    expect(reminderThreshold("2027-01-01", "2026-10-10")).toBeNull();
    expect(reminderThreshold("2026-11-09", "2026-10-10")).toBe(30);
    expect(reminderThreshold("2026-10-15", "2026-10-10")).toBe(7);
    expect(reminderThreshold("2026-10-10", "2026-10-10")).toBe(0);
    expect(reminderThreshold("2026-09-01", "2026-10-10")).toBe(0);
  });
});
