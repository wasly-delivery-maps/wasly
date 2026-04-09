import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import bcrypt from "bcryptjs";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerAuthRoutes(app: Express) {
  /**
   * Login endpoint - Phone + Password
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        res.status(400).json({ error: "Phone and password are required" });
        return;
      }

      const user = await db.getUserByPhone(phone);

      if (!user) {
        res.status(401).json({ error: "Invalid phone or password" });
        return;
      }

      // Verify password
      if (!user.password) {
        res.status(401).json({ error: "Invalid phone or password" });
        return;
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({ error: "Invalid phone or password" });
        return;
      }

      // Check if account is active (handle both boolean and string values from DB)
      const isActive = user.isActive === true || (user.isActive as any) === "1" || (user.isActive as any) === 1;
      if (!isActive) {
        res.status(403).json({ error: "Account is inactive" });
        return;
      }

      // Update last signed in
      await db.upsertUser({
        openId: user.openId,
        phone: user.phone || undefined,
        password: user.password || undefined,
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * Register endpoint - Create new account
   */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { phone, password, name, email, role } = req.body;

      if (!phone || !password) {
        res.status(400).json({ error: "Phone and password are required" });
        return;
      }

      // Check if user already exists
      const existingUser = await db.getUserByPhone(phone);
      if (existingUser) {
        res.status(400).json({ error: "Phone number already registered" });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const openId = `phone-${phone}`;
      await db.upsertUser({
        openId,
        phone,
        password: hashedPassword,
        name: name || null,
        email: email || null,
        role: role || "customer",
        isActive: true,
        lastSignedIn: new Date(),
      });

      const user = await db.getUserByPhone(phone);
      if (!user) {
        res.status(500).json({ error: "Failed to create user" });
        return;
      }

      // Create session token
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Register failed", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  /**
   * Logout endpoint
   */
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Logout failed", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });
}
