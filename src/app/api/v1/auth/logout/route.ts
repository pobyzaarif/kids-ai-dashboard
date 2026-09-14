import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  return handle(async () => {
    const res = NextResponse.json({ ok: true });
    clearSessionCookie(res);
    return res;
  });
}
