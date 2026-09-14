"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toaster";
import { apiFetch } from "@/lib/client";
import type { DeviceFeatureRow } from "@/server/queries/features";

export function FeaturePanel({
  deviceId,
  features,
}: {
  deviceId: string;
  features: DeviceFeatureRow[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [state, setState] = useState(() =>
    Object.fromEntries(features.map((feature) => [feature.id, feature.enabled])),
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(feature: DeviceFeatureRow, enabled: boolean) {
    setBusyId(feature.id);
    setState((prev) => ({ ...prev, [feature.id]: enabled }));
    try {
      await apiFetch(
        `/api/v1/devices/${deviceId}/features/${feature.id}`,
        { method: "PUT", body: JSON.stringify({ enabled }) },
      );
      push(`${feature.name} ${enabled ? "activated" : "deactivated"}`, "success");
      router.refresh();
    } catch (err) {
      setState((prev) => ({ ...prev, [feature.id]: !enabled }));
      push(err instanceof Error ? err.message : "Could not update feature", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Features"
        subtitle="Flip features on for this device. Inactive catalog features need admin activation first."
      />
      <div className="divide-y-2 divide-dashed divide-ink/40">
        {features.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon="⚡"
              title="No active features in the catalog"
              hint="An admin can register features and MCP endpoints in Admin Settings."
            />
          </div>
        ) : (
          features.map((feature) => (
            <div
              key={feature.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{feature.name}</p>
                  <Badge tone={feature.type === "mcp" ? "orange" : "cyan"}>
                    {feature.type}
                  </Badge>
                </div>
                <p className="text-xs font-medium text-gray-600">{feature.description}</p>
                {/* {feature.type === "mcp" ? (
                  <p className="mt-1 break-all font-mono text-[11px] text-gray-500">
                    {String(feature.config?.endpoint_url ?? "no endpoint configured")}
                    {feature.config?.auth_token ? " · 🔐 token set" : ""}
                  </p>
                ) : null} */}
              </div>
              <Toggle
                checked={Boolean(state[feature.id])}
                onChange={(enabled) => toggle(feature, enabled)}
                disabled={busyId === feature.id}
                label={`Toggle ${feature.name}`}
              />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
