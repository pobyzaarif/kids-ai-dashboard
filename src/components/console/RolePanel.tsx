"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toaster";
import { apiFetch } from "@/lib/client";
import { cn } from "@/lib/cn";
import type { DeviceWithMeta } from "@/server/queries/devices";
import type { RoleWithMeta } from "@/server/queries/roles";

export function RolePanel({
  device,
  roles,
}: {
  device: DeviceWithMeta;
  roles: RoleWithMeta[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [selected, setSelected] = useState<string | null>(device.role_id);
  const [busy, setBusy] = useState(false);

  async function save(roleId: string | null) {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/devices/${device.id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role_id: roleId }),
      });
      push(roleId ? "Role configured on device" : "Role removed from device", "success");
      setSelected(roleId);
      router.refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not set role", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Configure Role"
        subtitle="The AI persona the device will use. System presets are shared; your own roles are private."
        right={
          selected ? (
            <Button variant="secondary" size="sm" onClick={() => save(null)} disabled={busy}>
              Remove role
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setSelected(role.id)}
            className={cn(
              "cursor-pointer border-2 border-ink p-3 text-left transition-all",
              selected === role.id
                ? "translate-x-0.5 translate-y-0.5 bg-brand-yellow shadow-none"
                : "bg-white shadow-brutal-sm hover:bg-[#fffbe8]",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-black">{role.name}</p>
              <Badge tone={role.is_system ? "purple" : "cyan"}>
                {role.is_system ? "system" : "yours"}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 min-h-8 text-xs font-medium text-gray-600">
              {role.description ?? "No description"}
            </p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
              voice: {role.voice} · temp: {role.temperature}
            </p>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t-2 border-ink bg-[#fffbe8] px-4 py-3">
        <p className="text-xs font-medium text-gray-600">
          {selected
            ? roles.find((role) => role.id === selected)?.name ?? "Custom role"
            : "No role selected — device will use the platform default persona."}
        </p>
        <Button
          onClick={() => save(selected)}
          disabled={busy || selected === device.role_id}
        >
          {busy ? "Saving…" : "Save role"}
        </Button>
      </div>
    </Card>
  );
}
