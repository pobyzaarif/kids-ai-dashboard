import { ApiError } from "@/lib/api";
import { getDeviceById, type DeviceWithMeta } from "@/server/queries/devices";
import type { UserRow } from "@/server/queries/users";

/**
 * Loads a device for the given user. Regular users may only touch their own
 * devices; unknown or foreign devices return 404 (no existence leak).
 * Admins may access any device (device-plane/admin workflows).
 */
export async function requireDevice(
  deviceId: string,
  user: UserRow,
): Promise<DeviceWithMeta> {
  const device = await getDeviceById(deviceId);
  if (!device || (user.role !== "admin" && device.user_id !== user.id)) {
    throw new ApiError(404, "Device not found");
  }
  return device;
}
