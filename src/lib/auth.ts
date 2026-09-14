import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/api";
import {
  getUserById,
  type UserRow,
} from "@/server/queries/users";

type TokenPayload = {
  sub: string;
  email: string;
  role: string;
  name: string;
};

function signingKey(): Uint8Array {
  return new TextEncoder().encode(config.jwtSecret);
}

export async function createSessionToken(
  user: Pick<UserRow, "id" | "email" | "role" | "display_name">,
): Promise<string> {
  return new SignJWT({
    email: user.email,
    role: user.role,
    name: user.display_name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${config.sessionMaxAgeSeconds}s`)
    .sign(signingKey());
}

export async function verifySessionToken(
  token: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      role: String(payload.role ?? "user"),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: config.isProd,
  path: "/",
};

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(config.sessionCookieName, token, {
    ...cookieOptions,
    maxAge: config.sessionMaxAgeSeconds,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(config.sessionCookieName, "", { ...cookieOptions, maxAge: 0 });
}

/** RSC helper — resolves the logged-in user or null. */
export async function getSessionUser(): Promise<UserRow | null> {
  const store = await cookies();
  const token = store.get(config.sessionCookieName)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return getUserById(payload.sub);
}

/** Route-handler guard — throws 401/403 instead of returning. */
export async function requireUser(req: NextRequest): Promise<UserRow> {
  const token = req.cookies.get(config.sessionCookieName)?.value;
  if (!token) throw new ApiError(401, "Authentication required");
  const payload = await verifySessionToken(token);
  if (!payload) throw new ApiError(401, "Invalid or expired session");
  const user = await getUserById(payload.sub);
  if (!user) throw new ApiError(401, "Session user no longer exists");
  if (user.status !== "active") throw new ApiError(403, "Account is suspended");
  return user;
}

export async function requireAdmin(req: NextRequest): Promise<UserRow> {
  const user = await requireUser(req);
  if (user.role !== "admin") throw new ApiError(403, "Admin access required");
  return user;
}
