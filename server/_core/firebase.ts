/**
 * Firebase Admin SDK Configuration (DISABLED)
 * 
 * NOTE: This application has been migrated to use TiDB and Manus SDK for authentication.
 * Firebase is no longer used for login or registration to ensure stability and avoid 
 * "no configuration corresponding to the provided identifier" errors.
 */

console.log("[Firebase] Firebase is DISABLED. Using TiDB/Manus SDK for authentication.");

// Mock objects to prevent crashes in legacy code that might still import them
export const db = {
  collection: () => ({
    doc: () => ({
      get: async () => ({ exists: false, data: () => null }),
      set: async () => {},
      update: async () => {},
      delete: async () => {},
    }),
    where: () => ({
      limit: () => ({
        get: async () => ({ empty: true, docs: [] }),
      }),
      get: async () => ({ empty: true, docs: [] }),
    }),
  }),
} as any;

export const auth = {
  verifyIdToken: async () => { throw new Error("Firebase Auth is disabled"); },
  getUserByPhoneNumber: async () => { throw new Error("Firebase Auth is disabled"); },
  createCustomToken: async () => { throw new Error("Firebase Auth is disabled"); },
  apps: [],
} as any;

// User interface (kept for type compatibility)
export interface User {
  uid: string;
  phone: string;
  email?: string;
  name?: string;
  role: "driver" | "customer" | "admin";
  createdAt: any;
  updatedAt?: any;
  avatar?: string;
  status?: "active" | "inactive" | "suspended";
}

// Legacy helper functions (redirected to TiDB or returned null)
export async function createOrUpdateUser(uid: string, data: Partial<User>): Promise<User> {
  console.warn("[Firebase] createOrUpdateUser called but Firebase is disabled.");
  return data as User;
}

export async function getUserByUid(uid: string): Promise<User | null> {
  return null;
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  return null;
}

export async function verifyPhoneNumber(phone: string, code: string): Promise<boolean> {
  return false;
}

export async function getAllDrivers(): Promise<User[]> {
  return [];
}

export async function updateUserStatus(uid: string, status: string): Promise<void> {
  // No-op
}
