import { describe, it, expect } from "vitest";

describe("Secrets Validation", () => {
  describe("VAPID Keys", () => {
    it("should have VAPID_PUBLIC_KEY in environment", () => {
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      expect(publicKey).toBeDefined();
      expect(publicKey).not.toBe("");
      expect(publicKey?.length).toBeGreaterThan(0);
    });

    it("should have VAPID_PRIVATE_KEY in environment", () => {
      const privateKey = process.env.VAPID_PRIVATE_KEY;
      expect(privateKey).toBeDefined();
      expect(privateKey).not.toBe("");
      expect(privateKey?.length).toBeGreaterThan(0);
    });

    it("should have valid VAPID public key format", () => {
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      // VAPID public keys are base64url encoded and typically 87-88 characters
      expect(publicKey?.length).toBeGreaterThanOrEqual(80);
      expect(publicKey?.length).toBeLessThanOrEqual(100);
    });

    it("should have valid VAPID private key format", () => {
      const privateKey = process.env.VAPID_PRIVATE_KEY;
      // VAPID private keys are base64url encoded and typically 43-44 characters
      expect(privateKey?.length).toBeGreaterThanOrEqual(40);
      expect(privateKey?.length).toBeLessThanOrEqual(50);
    });
  });

  describe("Google Maps API Key", () => {
    it("should have VITE_GOOGLE_MAPS_API_KEY in environment", () => {
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      expect(apiKey).toBeDefined();
      expect(apiKey).not.toBe("");
      expect(apiKey?.length).toBeGreaterThan(0);
    });

    it("should have valid Google Maps API key format", () => {
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      // Google API keys are typically 39 characters
      expect(apiKey?.length).toBeGreaterThanOrEqual(30);
      expect(apiKey?.length).toBeLessThanOrEqual(50);
    });
  });

  describe("Environment Variables Consistency", () => {
    it("should have all required secrets", () => {
      const requiredSecrets = [
        "VAPID_PUBLIC_KEY",
        "VAPID_PRIVATE_KEY",
        "VITE_GOOGLE_MAPS_API_KEY",
      ];

      requiredSecrets.forEach((secret) => {
        expect(process.env[secret]).toBeDefined();
        expect(process.env[secret]).not.toBe("");
      });
    });

    it("should not have empty secret values", () => {
      const secrets = {
        VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
        VITE_GOOGLE_MAPS_API_KEY: process.env.VITE_GOOGLE_MAPS_API_KEY,
      };

      Object.entries(secrets).forEach(([key, value]) => {
        expect(value, `${key} should not be empty`).not.toBe("");
        expect(value, `${key} should be defined`).toBeDefined();
      });
    });
  });

  describe("VAPID Keys Compatibility", () => {
    it("should have different public and private keys", () => {
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;

      expect(publicKey).not.toBe(privateKey);
    });

    it("should have valid base64url characters in keys", () => {
      const base64urlRegex = /^[A-Za-z0-9_-]+$/;

      const publicKey = process.env.VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;

      expect(base64urlRegex.test(publicKey || "")).toBe(true);
      expect(base64urlRegex.test(privateKey || "")).toBe(true);
    });
  });

  describe("Google Maps API Key Validation", () => {
    it("should have alphanumeric characters in API key", () => {
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      const alphanumericRegex = /^[A-Za-z0-9_-]+$/;

      expect(alphanumericRegex.test(apiKey || "")).toBe(true);
    });

    it("should not contain spaces or special characters", () => {
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

      expect(apiKey?.includes(" ")).toBe(false);
      expect(apiKey?.includes("\n")).toBe(false);
      expect(apiKey?.includes("\t")).toBe(false);
    });
  });
});
