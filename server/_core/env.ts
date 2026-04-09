// Log environment status for debugging
console.log("[Environment] Checking critical variables...");
console.log("[Environment] VITE_APP_ID:", process.env.VITE_APP_ID ? "PRESENT" : "MISSING");
console.log("[Environment] JWT_SECRET:", process.env.JWT_SECRET ? "PRESENT" : "MISSING");
console.log("[Environment] DATABASE_URL:", process.env.DATABASE_URL ? "PRESENT" : "MISSING");
console.log("[Environment] OAUTH_SERVER_URL:", process.env.OAUTH_SERVER_URL ? "PRESENT" : "MISSING");

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "wasly_app_id_2026",
  cookieSecret: process.env.JWT_SECRET ?? "wasly_secret_2026_key_production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
