"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toaster";
import { apiFetch } from "@/lib/client";
import type { DeviceWithMeta } from "@/server/queries/devices";
import type { DeviceFeatureRow } from "@/server/queries/features";
import type { MemoryRow } from "@/server/queries/memories";
import type { RoleWithMeta } from "@/server/queries/roles";
import { RolePanel } from "./RolePanel";
import { MemoryPanel } from "./MemoryPanel";
import { FeaturePanel } from "./FeaturePanel";

export function DeviceDetail({
  device: initialDevice,
  roles,
  features,
  memories,
}: {
  device: DeviceWithMeta;
  roles: RoleWithMeta[];
  features: DeviceFeatureRow[];
  memories: MemoryRow[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [device, setDevice] = useState(initialDevice);
  const [tab, setTab] = useState("role");
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(device.device_name);
  const [model, setModel] = useState(device.model ?? "");
  const [firmware, setFirmware] = useState(device.firmware_version ?? "");
  const [busy, setBusy] = useState(false);

  async function saveDevice(patch: Record<string, unknown>, okMessage: string) {
    setBusy(true);
    try {
      const { device: updated } = await apiFetch<{ device: DeviceWithMeta }>(
        `/api/v1/devices/${device.id}`,
        { method: "PATCH", body: JSON.stringify(patch) },
      );
      setDevice(updated);
      push(okMessage, "success");
      router.refresh();
      return true;
    } catch (err) {
      push(err instanceof Error ? err.message : "Update failed", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    await saveDevice(
      { status: device.status === "active" ? "disabled" : "active" },
      device.status === "active" ? "Device disabled" : "Device activated",
    );
  }

  async function removeDevice() {
    if (
      !window.confirm(
        `Delete "${device.device_name}" and all its memories & feature settings?`,
      )
    ) {
      return;
    }
    try {
      await apiFetch(`/api/v1/devices/${device.id}`, { method: "DELETE" });
      push("Device deleted", "success");
      router.push("/devices");
      router.refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  async function saveEdits(event: React.FormEvent) {
    event.preventDefault();
    const ok = await saveDevice(
      {
        device_name: name,
        model: model || null,
        firmware_version: firmware || null,
      },
      "Device updated",
    );
    if (ok) setEditOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black uppercase">{device.device_name}</h1>
              <Badge tone={device.status === "active" ? "lime" : "orange"}>
                {device.status}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-xs">{device.device_code}</p>
            <p className="text-xs font-medium text-gray-600">
              {device.model ?? "Unknown model"} · bound{" "}
              {new Date(device.bound_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={toggleStatus} disabled={busy}>
              {device.status === "active" ? "Disable" : "Activate"}
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              ✏️ Edit
            </Button>
            <Button variant="danger" onClick={removeDevice}>
              Delete
            </Button>
          </div>
        </div>
      </Card>

      <Tabs
        active={tab}
        onChange={setTab}
        items={[
          { key: "role", label: "🎭 Role" },
          { key: "memory", label: "🧠 Memory", badge: memories.length },
          {
            key: "features",
            label: "⚡ Features",
            badge: features.filter((f) => f.enabled).length,
          },
        ]}
      />

      {tab === "role" ? (
        <RolePanel device={device} roles={roles} />
      ) : tab === "memory" ? (
        <MemoryPanel deviceId={device.id} memories={memories} />
      ) : (
        <FeaturePanel deviceId={device.id} features={features} />
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit Device">
        <form onSubmit={saveEdits} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="edit_name">Device name</Label>
            <Input
              id="edit_name"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit_model">Model</Label>
            <Input
              id="edit_model"
              maxLength={60}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit_fw">Firmware version</Label>
            <Input
              id="edit_fw"
              maxLength={30}
              value={firmware}
              onChange={(e) => setFirmware(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
