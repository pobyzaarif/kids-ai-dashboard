import { getSessionUser } from "@/lib/auth";
import { listDevicesByUser } from "@/server/queries/devices";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeviceCard } from "@/components/console/DeviceCard";
import { AddDeviceDialog } from "@/components/console/AddDeviceDialog";

export const metadata = { title: "Devices — Kids AI Console" };

export default async function DevicesPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const devices = await listDevicesByUser(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase">Devices</h1>
          <p className="text-sm font-medium text-gray-600">
            Bind a voice device by its hardware Device-Id (shown on the device
            screen, usually a MAC address).
          </p>
        </div>
        <AddDeviceDialog />
      </div>

      {devices.length === 0 ? (
        <EmptyState
          icon="🔊"
          title="No devices yet"
          hint="Every device needs a unique device code. One account can own many devices."
          action={<AddDeviceDialog />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}
