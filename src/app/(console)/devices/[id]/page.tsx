import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDeviceById } from "@/server/queries/devices";
import { listFeaturesForDevice } from "@/server/queries/features";
import { listMemories } from "@/server/queries/memories";
import { listRolesForUser } from "@/server/queries/roles";
import { DeviceDetail } from "@/components/console/DeviceDetail";

export const metadata = { title: "Device — Kids AI Console" };

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;

  const { id } = await params;
  const device = await getDeviceById(id);
  // 404 for foreign devices too (no existence leak).
  if (!device || (user.role !== "admin" && device.user_id !== user.id)) {
    notFound();
  }

  // Roles assignable to this device = system presets + the device owner's roles.
  const [roles, features, memories] = await Promise.all([
    listRolesForUser(device.user_id),
    listFeaturesForDevice(device.id),
    listMemories(device.id),
  ]);

  return (
    <DeviceDetail
      device={device}
      roles={roles.map((role) => ({ ...role, temperature: Number(role.temperature) }))}
      features={features}
      memories={memories}
    />
  );
}
