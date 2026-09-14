import { NextRequest, NextResponse } from "next/server";
import { ApiError, handle } from "@/lib/api";
import { signupSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import {
  createUser,
  getUserByEmail,
  publicUser,
} from "@/server/queries/users";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = signupSchema.parse(await req.json());

    const existing = await getUserByEmail(body.email);
    if (existing) {
      throw new ApiError(409, "An account with this email already exists");
    }

    const user = await createUser({
      email: body.email,
      password_hash: hashPassword(body.password),
      display_name: body.display_name,
      role: "user", // admins exist via seeding only
    });

    const res = NextResponse.json({ user: publicUser(user) }, { status: 201 });
    setSessionCookie(res, await createSessionToken(user));
    return res;
  });
}
