import { NextRequest, NextResponse } from "next/server";
import { ApiError, handle } from "@/lib/api";
import { loginSchema } from "@/lib/validators";
import { verifyPassword } from "@/lib/password";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import {
  getUserByEmail,
  publicUser,
} from "@/server/queries/users";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = loginSchema.parse(await req.json());

    const user = await getUserByEmail(body.email);
    // Same error for unknown email / wrong password / suspended — no enumeration.
    if (!user || !verifyPassword(body.password, user.password_hash)) {
      throw new ApiError(401, "Invalid email or password");
    }
    if (user.status !== "active") {
      throw new ApiError(403, "This account has been suspended");
    }

    const res = NextResponse.json({ user: publicUser(user) });
    setSessionCookie(res, await createSessionToken(user));
    return res;
  });
}
