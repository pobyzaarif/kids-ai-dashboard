import { NextRequest, NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { publicUser } from "@/server/queries/users";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req);
    return NextResponse.json({ user: publicUser(user) });
  });
}
