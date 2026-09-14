"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toaster";
import { apiFetch } from "@/lib/client";

export function AddDeviceDialog() {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setDeviceName("");
    setDeviceCode("");
    setModel("");
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/v1/devices", {
        method: "POST",
        body: JSON.stringify({
          device_name: deviceName,
          device_code: deviceCode,
          model: model || undefined,
        }),
      });
      setOpen(false);
      reset();
      push("Device added — configure its role next", "success");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add device");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="lime" onClick={() => setOpen(true)}>
        + Add Device
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add Device"
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="device_name">Device name</Label>
            <Input
              id="device_name"
              required
              maxLength={60}
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Nursery Speaker"
            />
          </div>
          <div>
            <Label htmlFor="device_code">Device code (Device-Id)</Label>
            <Input
              id="device_code"
              required
              className="font-mono"
              value={deviceCode}
              onChange={(e) => setDeviceCode(e.target.value)}
              placeholder="e.g. AA:BB:CC:DD:EE:FF"
            />
          </div>
          <div>
            <Label htmlFor="model">Model (optional)</Label>
            <Input
              id="model"
              maxLength={60}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. ESP32-S3 Box"
            />
          </div>
          {error ? (
            <p className="border-2 border-ink bg-brand-red px-3 py-2 text-sm font-bold text-white">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Adding…" : "Add device"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
