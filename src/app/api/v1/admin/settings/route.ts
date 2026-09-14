import { NextRequest, NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { settingsUpdateSchema, validateSetting } from "@/lib/validators";
import {
  getSettings,
  upsertSetting,
} from "@/server/queries/settings";

/** GET /api/v1/admin/settings — flat map of all settings. */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAdmin(req);
    const settings = await getSettings();
    return NextResponse.json({ settings });
  });
}

/**
 * PUT /api/v1/admin/settings
 * body: { settings: [{ key, value }, ...] } — only known keys are accepted;
 * values are type-checked against the registry in lib/validators.
 */
export async function PUT(req: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin(req);
    const body = settingsUpdateSchema.parse(await req.json());

    for (const entry of body.settings) {
      const value = validateSetting(entry.key, entry.value);
      await upsertSetting(entry.key, value, admin.id);
    }

    const settings = await getSettings();
    return NextResponse.json({ settings });
  });
}
