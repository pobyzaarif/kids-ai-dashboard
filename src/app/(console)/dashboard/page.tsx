import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listDevicesByUser } from "@/server/queries/devices";
import { listRolesForUser } from "@/server/queries/roles";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeviceCard } from "@/components/console/DeviceCard";
import { StatCard } from "@/components/console/StatCard";

export const metadata = { title: "Dashboard — Kids AI Console" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [devices, roles] = await Promise.all([
    listDevicesByUser(user.id),
    listRolesForUser(user.id),
  ]);

  const myRoles = roles.filter((role) => !role.is_system);
  const totalMemories = devices.reduce((sum, device) => sum + device.memory_count, 0);
  const activeFeatures = devices.reduce((sum, device) => sum + device.enabled_features, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black uppercase">Dashboard</h1>
        <Link href="/devices">
          <Button variant="lime">+ Add Device</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="🔌" label="Devices" value={devices.length} tone="bg-brand-yellow" />
        <StatCard icon="🎭" label="My Roles" value={myRoles.length} tone="bg-brand-pink" />
        <StatCard icon="🧠" label="Memories" value={totalMemories} tone="bg-brand-cyan" />
        <StatCard icon="⚡" label="Active Features" value={activeFeatures} tone="bg-brand-lime" />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black uppercase">Your Devices</h2>
          <Link href="/devices" className="text-sm font-bold underline">
            Manage all →
          </Link>
        </div>

        {devices.length === 0 ? (
          <EmptyState
            icon="🔊"
            title="No devices yet"
            hint="Add your first device to start configuring roles, memories and features."
            action={
              <Link href="/devices">
                <Button variant="lime">+ Add Device</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {devices.slice(0, 6).map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        )}
      </section>

      <section className="border-2 border-ink bg-brand-purple/30 p-4 shadow-brutal">
        <h2 className="mb-1 text-base font-black uppercase">💡 Quick start</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm font-medium">
          <li>
            <Link href="/devices" className="font-bold underline">Add a device</Link>{" "}
            with its hardware Device-Id.
          </li>
          <li>
            Pick a{" "}
            <Link href="/roles" className="font-bold underline">role</Link> (or
            create your own) and configure it on the device.
          </li>
          <li>Toggle features and curate memories on the device page.</li>
        </ol>
      </section>
    </div>
  );
}
