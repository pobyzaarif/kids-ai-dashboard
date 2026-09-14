/** Central env config. Next.js loads .env automatically; scripts use dotenv. */
const requiredSecret = process.env.JWT_SECRET;

export const config = {
  databaseUrl:
    process.env.DATABASE_URL ??
    `postgres://${process.env.USER ?? "postgres"}@localhost:5432/kids_ai_db`,
  jwtSecret: requiredSecret ?? "dev-insecure-secret-change-me",
  sessionCookieName: "kids_session",
  /** 7 days — dashboard-friendly session; no refresh-token rotation in MVP. */
  sessionMaxAgeSeconds: 60 * 60 * 24 * 7,
  isProd: process.env.NODE_ENV === "production",
};

if (!requiredSecret && process.env.NODE_ENV === "production") {
  console.warn(
    "[config] JWT_SECRET is not set — using a development fallback. Set it in production!",
  );
}
