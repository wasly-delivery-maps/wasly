import { describe, it, expect } from "vitest";

describe("Google Maps API Key Validation", () => {
  it("should have VITE_GOOGLE_MAPS_API_KEY configured", () => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toBeTruthy();
    expect(typeof apiKey).toBe("string");
    expect(apiKey.length).toBeGreaterThan(0);
  });

  it("should have valid Google Maps API key format", () => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    // Google API keys typically start with "AIza" and contain alphanumeric characters
    expect(apiKey).toMatch(/^AIza[a-zA-Z0-9_-]+$/);
  });
});
