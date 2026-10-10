import { describe, expect, it } from "vitest";
import { isSafeInternalPath, safeReturnPath } from "@/lib/routes";

describe("isSafeInternalPath", () => {
  it.each(["/driver/portal", "/investor/documents?x=1"])("accepts %s", (path) => {
    expect(isSafeInternalPath(path)).toBe(true);
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "/driver\n/portal",
    "javascript:alert(1)",
    "/login",
    "",
    null
  ])("rejects %s", (path) => {
    expect(isSafeInternalPath(path)).toBe(false);
  });
});

describe("safeReturnPath", () => {
  it("keeps internal paths without their query string", () => {
    expect(safeReturnPath("/driver/documents?error=x", "/fallback")).toBe("/driver/documents");
  });

  it("falls back for external or missing values", () => {
    expect(safeReturnPath("https://evil.com", "/fallback")).toBe("/fallback");
    expect(safeReturnPath(null, "/fallback")).toBe("/fallback");
  });
});
