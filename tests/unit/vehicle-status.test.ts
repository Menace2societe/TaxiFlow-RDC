import { describe, expect, it } from "vitest";
import { normalizeVehicleStatus } from "@/lib/vehicles/status";

describe("normalizeVehicleStatus", () => {
  it.each([
    ["en service", "en service"],
    ["active", "en service"],
    ["En Service", "en service"],
    ["en_service", "en service"],
    ["maintenance", "maintenance"],
    ["En réparation", "maintenance"],
    ["repos", "repos"],
    ["inactive", "repos"],
    ["", "repos"],
    [null, "repos"]
  ])("%s → %s", (raw, expected) => {
    expect(normalizeVehicleStatus(raw)).toBe(expected);
  });
});
