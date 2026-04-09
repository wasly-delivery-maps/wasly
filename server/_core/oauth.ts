import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import * as db from "../db";
import bcryptjs from "bcryptjs";

export function registerAuthRoutes(app: Express) {
  /**
   * Login with phone and password (TiDB-backed, Firebase-independent)
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return res.status(400).json({ error: "رقم الهاتف وكلمة المرور مطلوبان" });
      }

      // Find user by phone in TiDB
      const user = await db.getUserByPhone(phone);
      if (!user) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ error: "الحساب معطل" });
      }

      // Verify password
      if (!user.password) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }

      const isPasswordValid = await bcryptjs.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }

      // Update last signed in
      await db.upsertUser({
        openId: user.openId,
        phone: user.phone || undefined,
        password: user.password || undefined,
        lastSignedIn: new Date(),
      });

      try {
        // Create session token using Manus SDK with openId
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return res.json({
          success: true,
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
      } catch (authError) {
        console.error("Session creation error:", authError);
        return res.status(401).json({ error: "فشل في إنشاء جلسة العمل" });
      }
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "فشل في تسجيل الدخول" });
    }
  });

  /**
   * Register new user (TiDB-backed, Firebase-independent)
   */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { phone, password, name, email, role } = req.body;

      if (!phone || !password || !name) {
        return res.status(400).json({ error: "جميع الحقول المطلوبة يجب إكمالها" });
      }

      // Check if user already exists
      const existingUser = await db.getUserByPhone(phone);
      if (existingUser) {
        return res.status(409).json({ error: "رقم الهاتف مسجل بالفعل" });
      }

      // Hash password
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Create user in TiDB
      const openId = `phone-${phone}`;
      await db.upsertUser({
        openId,
        phone: phone,
        password: hashedPassword,
        name: name,
        email: email,
        role: role || "customer",
        isActive: true,
      });

      // Get the created user
      const user = await db.getUserByPhone(phone);
      if (!user) {
        return res.status(500).json({ error: "فشل في إنشاء المستخدم" });
      }

      try {
        // Create session token using Manus SDK with openId
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return res.json({
          success: true,
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
      } catch (authError) {
        console.error("Session creation error:", authError);
        return res.status(500).json({ error: "فشل في إنشاء جلسة العمل" });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      return res.status(500).json({ 
        error: error.message || "فشل في إنشاء الحساب" 
      });
    }
  });

  /**
   * Logout
   */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return res.json({ success: true });
  });
}
