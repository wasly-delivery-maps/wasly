import { describe, it, expect } from "vitest";

describe("Google Maps API", () => {
  it("should have valid Google Maps API Key", () => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toMatch(/^AIza[a-zA-Z0-9_-]{35}$/);
  });
});
