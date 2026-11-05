import { describe, expect, it } from "vitest";
import { signupSchema, loginSchema } from "@/lib/validation/auth";
import { isProtected } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/auth/redirect";

describe("auth validation", () => {
  it("normalizes email and accepts a valid signup", () => {
    const r = signupSchema.safeParse({ email: " Me@Example.COM ", password: "longenough1" });
    expect(r.success && r.data.email).toBe("me@example.com");
  });
  it("rejects short passwords and bad emails", () => {
    expect(signupSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("route protection", () => {
  it("protects app routes but not public ones", () => {
    expect(isProtected("/dashboard")).toBe(true);
    expect(isProtected("/practice/abc")).toBe(true);
    expect(isProtected("/billing")).toBe(true);
    expect(isProtected("/")).toBe(false);
    expect(isProtected("/pricing")).toBe(false);
  });
});

describe("post-auth redirects", () => {
  it("allows same-origin paths and preserves their query", () => {
    expect(safeRedirectPath("/dashboard?tab=progress", "/")).toBe("/dashboard?tab=progress");
  });

  it("rejects external and malformed paths", () => {
    expect(safeRedirectPath("//example.com", "/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("/\\example.com", "/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("https://example.com", "/dashboard")).toBe("/dashboard");
  });
});
