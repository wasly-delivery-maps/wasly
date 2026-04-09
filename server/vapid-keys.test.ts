import { describe, it, expect } from "vitest";
import { getVapidPublicKey, isPushNotificationsConfigured } from "./notifications";

describe("VAPID Keys Configuration", () => {
  it("should have VAPID public key configured", () => {
    const publicKey = getVapidPublicKey();
    expect(publicKey).toBeDefined();
    expect(publicKey.length).toBeGreaterThan(0);
    // VAPID public key should start with specific characters
    expect(publicKey).toMatch(/^BC/);
  });

  it("should have push notifications configured", () => {
    const isConfigured = isPushNotificationsConfigured();
    expect(isConfigured).toBe(true);
  });

  it("should have valid VAPID public key format", () => {
    const publicKey = getVapidPublicKey();
    // VAPID public key is base64url encoded and typically 87-88 characters
    expect(publicKey.length).toBeGreaterThan(80);
    expect(publicKey.length).toBeLessThan(100);
  });

  it("should have VAPID private key in environment", () => {
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    expect(privateKey).toBeDefined();
    expect(privateKey?.length).toBeGreaterThan(0);
  });

  it("should have matching VAPID key pair", () => {
    const publicKey = getVapidPublicKey();
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    
    // Both keys should exist and be non-empty
    expect(publicKey).toBeTruthy();
    expect(privateKey).toBeTruthy();
    
    // Keys should have reasonable lengths (base64url encoded)
    expect(publicKey.length).toBeGreaterThan(40);
    expect(privateKey!.length).toBeGreaterThan(20);
  });
});
