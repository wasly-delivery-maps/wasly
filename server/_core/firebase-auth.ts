import { auth, getUserByUid } from "./firebase";
import type { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    phone: string;
    role: string;
  };
}

// Verify Firebase ID token
export async function verifyIdToken(token: string) {
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Error verifying ID token:", error);
    throw new Error("Invalid token");
  }
}

// Middleware to verify Firebase token
export async function firebaseAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decodedToken = await verifyIdToken(token);
    const user = await getUserByUid(decodedToken.uid);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = {
      uid: user.uid,
      phone: user.phone,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Middleware to verify driver role
export function requireDriver(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== "driver") {
    return res.status(403).json({ error: "Only drivers can access this" });
  }
  next();
}

// Middleware to verify admin role
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only admins can access this" });
  }
  next();
}

// Phone authentication
export async function authenticateWithPhone(
  phone: string,
  password: string
): Promise<{ uid: string; token: string }> {
  try {
    // In a real app, you would verify the phone and password against Firestore
    // For now, we'll create a custom token
    const user = await auth.getUserByPhoneNumber(phone);

    if (!user) {
      throw new Error("User not found");
    }

    const customToken = await auth.createCustomToken(user.uid);
    return {
      uid: user.uid,
      token: customToken,
    };
  } catch (error) {
    console.error("Phone authentication error:", error);
    throw new Error("Authentication failed");
  }
}
