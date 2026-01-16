import { describe, it, expect } from "vitest";

describe("Supabase Configuration", () => {
  it("should have valid Supabase environment variables", () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    expect(supabaseUrl).toBeDefined();
    expect(supabaseAnonKey).toBeDefined();
    expect(supabaseUrl).toMatch(/^https:\/\/.+\.supabase\.co\/?$/);
    expect(supabaseAnonKey).toMatch(/^eyJ/); // JWT token starts with "eyJ"
  });

  it("should validate JWT token format", () => {
    const token = process.env.SUPABASE_ANON_KEY;
    expect(token).toBeDefined();

    // JWT format: header.payload.signature
    const parts = token!.split(".");
    expect(parts).toHaveLength(3);

    // Decode and verify payload contains expected claims
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    expect(payload).toHaveProperty("iss", "supabase");
    expect(payload).toHaveProperty("role", "anon");
  });
});
