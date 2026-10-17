import { describe, expect, it, beforeEach } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { adminCredentialsAreConfigured, verifyAdminCredentials } from "@/lib/admin-auth";

describe("Password Hashing & Verification", () => {
  it("hashes password and verifies correctly", async () => {
    const rawPassword = "SecretPassword123!";
    const hash = await hashPassword(rawPassword);

    expect(hash).toContain("scrypt:");
    expect(await verifyPassword(rawPassword, hash)).toBe(true);
    expect(await verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("handles malformed hashes safely", async () => {
    expect(await verifyPassword("password", "invalid-hash")).toBe(false);
    expect(await verifyPassword("password", "")).toBe(false);
    expect(await verifyPassword("password", "scrypt:invalid")).toBe(false);
  });
});

describe("Admin Credentials Verification", () => {
  beforeEach(() => {
    const env = process.env as Record<string, string | undefined>;
    env["ADMIN_EMAIL"] = "admin@villasage.com";
    env["ADMIN_PASSWORD"] = "VillaSage@2026!";
  });

  it("identifies that credentials are configured", () => {
    expect(adminCredentialsAreConfigured()).toBe(true);
  });

  it("verifies environment credentials correctly", async () => {
    expect(await verifyAdminCredentials("admin@villasage.com", "VillaSage@2026!")).toBe(true);
    expect(await verifyAdminCredentials("ADMIN@VILLASAGE.COM", "VillaSage@2026!")).toBe(true);
    expect(await verifyAdminCredentials("admin@villasage.com", "WrongPassword")).toBe(false);
    expect(await verifyAdminCredentials("other@villasage.com", "VillaSage@2026!")).toBe(false);
  });
});
