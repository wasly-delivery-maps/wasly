import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { auth, createOrUpdateUser, getUserByPhone } from "./firebase";

export function registerAuthRoutes(app: Express) {
  /**
   * Login with phone and password
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return res.status(400).json({ error: "رقم الهاتف وكلمة المرور مطلوبان" });
      }

      // Find user by phone in Firestore
      const user = await getUserByPhone(phone);
      if (!user) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }

      // Check if user is active
      if (user.status === "suspended") {
        return res.status(403).json({ error: "الحساب معطل" });
      }

      try {
        // Create session token using Manus SDK
        const sessionToken = await sdk.createSessionToken(user.uid, {
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
            id: user.uid,
            phone: user.phone,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
      } catch (authError) {
        console.error("Firebase auth error:", authError);
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "فشل في تسجيل الدخول" });
    }
  });

  /**
   * Register new user
   */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { phone, password, name, email, role } = req.body;

      if (!phone || !password || !name) {
        return res.status(400).json({ error: "جميع الحقول المطلوبة يجب إكمالها" });
      }

      // Check if user already exists
      const existingUser = await getUserByPhone(phone);
      if (existingUser) {
        return res.status(409).json({ error: "رقم الهاتف مسجل بالفعل" });
      }

      // Create Firebase user
      const userRecord = await auth.createUser({
        phoneNumber: phone,
        password: password,
        displayName: name,
        email: email || undefined,
      });

      // Create Firestore user document
      const user = await createOrUpdateUser(userRecord.uid, {
        phone: phone,
        name: name,
        email: email,
        role: role || "customer",
      });

      // Create session token using Manus SDK
      const sessionToken = await sdk.createSessionToken(user.uid, {
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
          id: user.uid,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
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
