import { describe, expect, it } from "vitest";
import {
  driverLoginEmail,
  formatAccessCode,
  generateAccessCode,
  normalizeAccessCode,
  normalizeDrcPhone
} from "@/lib/auth/driver-access";

describe("normalizeDrcPhone", () => {
  it.each([
    ["+243812345678", "+243812345678"],
    ["+243 81 234 5678", "+243812345678"],
    ["0812345678", "+243812345678"],
    ["081 234 56 78", "+243812345678"],
    ["243812345678", "+243812345678"],
    ["00243812345678", "+243812345678"],
    ["812345678", "+243812345678"],
    ["(081) 234-5678", "+243812345678"]
  ])("%s → %s", (input, expected) => {
    expect(normalizeDrcPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "+33612345678", "08123456789", "vous@exemple.com", null, undefined])(
    "rejects %s",
    (input) => {
      expect(normalizeDrcPhone(input)).toBeNull();
    }
  );
});

describe("driverLoginEmail", () => {
  it("derives a stable technical email from the phone", () => {
    expect(driverLoginEmail("+243812345678", "chauffeurs.test")).toBe("243812345678@chauffeurs.test");
  });

  it("uses a non-deliverable default domain", () => {
    expect(driverLoginEmail("+243812345678", "")).toBe("243812345678@chauffeurs.taxiflow.invalid");
  });
});

describe("access codes", () => {
  it("are 8 unambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateAccessCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it("are not repeated", () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateAccessCode()));
    expect(codes.size).toBe(500);
  });

  it("are displayed with a dash and accepted without it", () => {
    expect(formatAccessCode("K7M2P9QX")).toBe("K7M2-P9QX");
    expect(normalizeAccessCode("k7m2-p9qx")).toBe("K7M2P9QX");
    expect(normalizeAccessCode(" K7M2 P9QX ")).toBe("K7M2P9QX");
  });
});
