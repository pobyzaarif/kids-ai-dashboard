import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { DeviceWithMeta } from "@/server/queries/devices";

export function DeviceCard({ device }: { device: DeviceWithMeta }) {
  return (
    <Link
      href={`/devices/${device.id}`}
      className="block border-2 border-ink bg-white shadow-brutal transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-brutal-sm"
    >
      <div className="flex items-start justify-between gap-2 border-b-2 border-ink bg-brand-cyan px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black">{device.device_name}</p>
          <p className="font-mono text-xs">{device.device_code}</p>
        </div>
        <Badge tone={device.status === "active" ? "lime" : "orange"}>
          {device.status}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs font-bold">
        <Badge tone={device.role_name ? "purple" : "white"}>
          {device.role_name ? `🎭 ${device.role_name}` : "🎭 No role"}
        </Badge>
        <Badge>🧠 {device.memory_count}</Badge>
        <Badge>⚡ {device.enabled_features}</Badge>
      </div>
      <div className="border-t-2 border-dashed border-ink px-4 py-2 text-xs font-bold uppercase tracking-wide">
        Manage →
      </div>
    </Link>
  );
}
