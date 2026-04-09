import admin from "firebase-admin";

// Initialize Firebase Admin SDK
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAZwd1Kmb1SAEx4PuoCGZm-cz_d8H30pJ8",
  authDomain: "wasly-delivery-app.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "wasly-delivery-app",
  storageBucket: "wasly-delivery-app.firebasestorage.app",
  messagingSenderId: "716585941091",
  appId: "1:716585941091:web:78a6df408a9acd87f66056",
  measurementId: "G-BLLW09WCL4",
};

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      console.log("[Firebase] Initializing Admin SDK with service account credentials...");
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseConfig.projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        storageBucket: firebaseConfig.storageBucket,
      });
    } else {
      console.log("[Firebase] Initializing Admin SDK with default credentials...");
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
      });
    }
    console.log("[Firebase] Admin SDK initialized successfully");
  } catch (error) {
    console.error("[Firebase] Admin SDK initialization failed:", error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();

// User interface
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

// Create or update user
export async function createOrUpdateUser(
  uid: string,
  data: Partial<User>
): Promise<User> {
  const userRef = db.collection("users").doc(uid);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const existingDoc = await userRef.get();
  const existingData = existingDoc.exists ? existingDoc.data() as User : null;

  const userData: any = {
    uid,
    phone: data.phone || existingData?.phone || "",
    email: data.email !== undefined ? data.email : existingData?.email,
    name: data.name !== undefined ? data.name : existingData?.name,
    role: data.role || existingData?.role || "customer",
    updatedAt: now,
    avatar: data.avatar !== undefined ? data.avatar : existingData?.avatar,
    status: data.status || existingData?.status || "active",
  };

  if (!existingDoc.exists) {
    userData.createdAt = now;
    await userRef.set(userData);
  } else {
    await userRef.update(userData);
  }

  return userData as User;
}

// Get user by UID
export async function getUserByUid(uid: string): Promise<User | null> {
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) return null;
    return doc.data() as User;
  } catch (error) {
    console.error("Error getting user by UID:", error);
    return null;
  }
}

// Get user by phone
export async function getUserByPhone(phone: string): Promise<User | null> {
  try {
    const snapshot = await db
      .collection("users")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as User;
  } catch (error) {
    console.error("Error getting user by phone:", error);
    return null;
  }
}

// Verify phone number
export async function verifyPhoneNumber(
  phone: string,
  code: string
): Promise<boolean> {
  try {
    return code.length === 6 && /^\d+$/.test(code);
  } catch (error) {
    console.error("Error verifying phone:", error);
    return false;
  }
}

// Get all drivers
export async function getAllDrivers(): Promise<User[]> {
  try {
    const snapshot = await db
      .collection("users")
      .where("role", "==", "driver")
      .where("status", "==", "active")
      .get();

    return snapshot.docs.map((doc) => doc.data() as User);
  } catch (error) {
    console.error("Error getting all drivers:", error);
    return [];
  }
}

// Update user status
export async function updateUserStatus(
  uid: string,
  status: "active" | "inactive" | "suspended"
): Promise<void> {
  try {
    await db.collection("users").doc(uid).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user status:", error);
  }
}
