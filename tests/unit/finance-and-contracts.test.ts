import { describe, expect, it } from "vitest";
import { contractProgress, paidSince } from "@/lib/contracts/progress";
import { computeVehicleProfit, monthRange } from "@/lib/finance/profit";
import { composeAlertMessage } from "@/lib/notify/compose";

describe("net profit per vehicle", () => {
  const vehicles = [
    { id: "v1", label: "Toyota", plate_number: "KN-1" },
    { id: "v2", label: "Moto", plate_number: "KN-2" }
  ];

  it("subtracts each vehicle's expenses from its revenue", () => {
    const { rows, totals } = computeVehicleProfit(
      vehicles,
      [
        { vehicle_id: "v1", revenue_cdf: 100000 },
        { vehicle_id: "v1", revenue_cdf: 50000 },
        { vehicle_id: "v2", revenue_cdf: 20000 }
      ],
      [
        { vehicle_id: "v1", category: "carburant", amount_cdf: 30000 },
        { vehicle_id: "v1", category: "entretien", amount_cdf: 20000 },
        { vehicle_id: "v2", category: "reparation", amount_cdf: 45000 }
      ]
    );

    expect(rows[0]).toMatchObject({ vehicle_id: "v1", revenue: 150000, expenses: 50000, net: 100000, margin: 66.7 });
    expect(rows[0].byCategory).toEqual({ carburant: 30000, entretien: 20000 });
    expect(rows[1]).toMatchObject({ vehicle_id: "v2", net: -25000 });
    expect(totals).toEqual({ revenue: 170000, expenses: 95000, net: 75000 });
  });

  it("has no margin without revenue", () => {
    expect(computeVehicleProfit(vehicles.slice(0, 1), [], []).rows[0].margin).toBeNull();
  });

  it("computes month bounds, leap years included", () => {
    expect(monthRange("2026-10")).toEqual({ start: "2026-10-01", end: "2026-10-31" });
    expect(monthRange("2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(monthRange("2026-13")).toBeNull();
    expect(monthRange("abc")).toBeNull();
  });
});

describe("lease-to-own contracts", () => {
  it("counts only validated payments since the start date", () => {
    const paid = paidSince(
      [
        { amount: 30000, payment_date: "2026-09-30", status: "validated" },
        { amount: 30000, payment_date: "2026-10-01", status: "validated" },
        { amount: 30000, payment_date: "2026-10-02", status: "approved" },
        { amount: 30000, payment_date: "2026-10-03", status: "pending" },
        { amount: 30000, payment_date: "2026-10-04", status: "rejected" }
      ],
      "2026-10-01"
    );
    expect(paid).toBe(60000);
  });

  it("estimates the remaining days and end date", () => {
    expect(contractProgress(9_000_000, 3_000_000, 30_000, "2026-10-10")).toEqual({
      paid: 3_000_000,
      total: 9_000_000,
      remaining: 6_000_000,
      percent: 33.3,
      daysLeft: 200,
      estimatedEnd: "2027-04-28"
    });
  });

  it("caps at 100 % and handles missing data", () => {
    expect(contractProgress(1000, 1500, 100, "2026-10-10")).toMatchObject({ remaining: 0, percent: 100, daysLeft: 0 });
    expect(contractProgress(1000, 0, null, "2026-10-10")).toMatchObject({ daysLeft: null, estimatedEnd: null });
    expect(contractProgress(null, 0, 100, "2026-10-10")).toBeNull();
  });
});

describe("WhatsApp alert message", () => {
  it("groups alerts in a single message with a link", () => {
    const message = composeAlertMessage(
      [
        { key: "a", text: "Assurance KN-1 : expire dans 7 jour(s)" },
        { key: "b", text: "Recette suspecte KN-2 le 2026-10-09" }
      ],
      "https://taxi.example/investor/control"
    );
    expect(message).toBe(
      "2 alertes : Assurance KN-1 : expire dans 7 jour(s) ; Recette suspecte KN-2 le 2026-10-09. Détails : https://taxi.example/investor/control"
    );
  });

  it("truncates long lists", () => {
    const alerts = Array.from({ length: 9 }, (_, index) => ({ key: String(index), text: `alerte ${index}` }));
    expect(composeAlertMessage(alerts, null)).toMatch(/^9 alertes : alerte 0 ; .* alerte 5 \(\+3 autre\(s\)\)\.$/);
  });
});
