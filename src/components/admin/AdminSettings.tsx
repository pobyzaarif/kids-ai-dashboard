"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toaster";
import { apiFetch } from "@/lib/client";
import type { FeatureRow } from "@/server/queries/features";
import { FeatureDialog } from "./FeatureDialog";
import { McpTestDialog } from "./McpTestDialog";

export function AdminSettings({
  features: initialFeatures,
  settings: initialSettings,
}: {
  features: FeatureRow[];
  settings: Record<string, unknown>;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [features, setFeatures] = useState(initialFeatures);
  const [tab, setTab] = useState("mcp");
  const [creatingType, setCreatingType] = useState<"builtin" | "mcp" | null>(null);
  const [editing, setEditing] = useState<FeatureRow | null>(null);
  const [deleting, setDeleting] = useState<FeatureRow | null>(null);
  const [recallTesting, setRecallTesting] = useState<FeatureRow | null>(null);

  // General settings form state
  const [siteName, setSiteName] = useState(
    String(initialSettings["console.site_name"] ?? "Kids AI Console"),
  );
  const [maxMemories, setMaxMemories] = useState(
    Number(initialSettings["console.max_memories_per_device"] ?? 100),
  );
  const [timeoutMs, setTimeoutMs] = useState(
    Number(initialSettings["mcp.default_timeout_ms"] ?? 30000),
  );
  const [savingSettings, setSavingSettings] = useState(false);

  const mcpFeatures = features.filter((feature) => feature.type === "mcp");
  const builtinFeatures = features.filter((feature) => feature.type === "builtin");

  async function toggleActive(feature: FeatureRow, isActive: boolean) {
    setFeatures((prev) =>
      prev.map((f) => (f.id === feature.id ? { ...f, is_active: isActive } : f)),
    );
    try {
      await apiFetch(`/api/v1/admin/features/${feature.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: isActive }),
      });
      push(
        `${feature.name} ${isActive ? "activated" : "deactivated"} in catalog`,
        "success",
      );
      router.refresh();
    } catch (err) {
      setFeatures((prev) =>
        prev.map((f) => (f.id === feature.id ? { ...f, is_active: !isActive } : f)),
      );
      push(err instanceof Error ? err.message : "Could not update feature", "error");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiFetch(`/api/v1/admin/features/${deleting.id}`, { method: "DELETE" });
      setFeatures((prev) => prev.filter((f) => f.id !== deleting.id));
      push("Feature deleted (device activations removed too)", "success");
      setDeleting(null);
      router.refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not delete feature", "error");
    }
  }

  async function saveGeneral(event: React.FormEvent) {
    event.preventDefault();
    setSavingSettings(true);
    try {
      await apiFetch("/api/v1/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          settings: [
            { key: "console.site_name", value: siteName },
            { key: "console.max_memories_per_device", value: maxMemories },
            { key: "mcp.default_timeout_ms", value: timeoutMs },
          ],
        }),
      });
      push("Settings saved", "success");
      router.refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not save settings", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  function FeatureTable({ rows, empty }: { rows: FeatureRow[]; empty: string }) {
    if (rows.length === 0) {
      return <p className="p-4 text-sm font-medium text-gray-600">{empty}</p>;
    }
    return (
      <div className="divide-y-2 divide-dashed divide-ink/40">
        {rows.map((feature) => (
          <div
            key={feature.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{feature.name}</p>
                <Badge className="font-mono">{feature.code}</Badge>
                <Badge tone={feature.type === "mcp" ? "orange" : "cyan"}>
                  {feature.type}
                </Badge>
              </div>
              <p className="text-xs font-medium text-gray-600">{feature.description}</p>
              {feature.type === "mcp" ? (
                <p className="mt-0.5 break-all font-mono text-[11px] text-gray-500">
                  {String(feature.config?.endpoint_url ?? "—")}
                  {feature.config?.auth_token ? " · 🔐 token set" : " · ⚠️ no token"}
                  {typeof feature.config?.timeout_ms === "number"
                    ? ` · ${feature.config.timeout_ms}ms`
                    : ""}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Toggle
                checked={feature.is_active}
                onChange={(isActive) => toggleActive(feature, isActive)}
                label={`Toggle ${feature.name}`}
              />
              {feature.type === "mcp" ? (
                <Button
                  variant="lime"
                  size="sm"
                  onClick={() => setRecallTesting(feature)}
                >
                  🧪 Recall test
                </Button>
              ) : null}
              <Button variant="secondary" size="sm" onClick={() => setEditing(feature)}>
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDeleting(feature)}>
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black uppercase">Admin Settings</h1>
        <p className="text-sm font-medium text-gray-600">
          Register MCP endpoints, manage the feature catalog and adjust console
          settings. Users can only activate what you publish here.
        </p>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        items={[
          { key: "mcp", label: "🔗 MCP Endpoints", badge: mcpFeatures.length },
          { key: "features", label: "⚡ Feature Catalog", badge: builtinFeatures.length },
          { key: "general", label: "⚙️ General" },
        ]}
      />

      {tab === "mcp" ? (
        <Card>
          <CardHeader
            title="MCP Endpoints"
            subtitle="Model Context Protocol endpoints devices may connect to. Tokens are masked for regular users."
            right={
              <Button onClick={() => setCreatingType("mcp")}>+ Register MCP Endpoint</Button>
            }
          />
          <FeatureTable rows={mcpFeatures} empty="No MCP endpoints registered yet." />
        </Card>
      ) : tab === "features" ? (
        <Card>
          <CardHeader
            title="Feature Catalog"
            subtitle="Builtin capabilities users can enable per device (memory, story mode, KB search…)."
            right={
              <Button onClick={() => setCreatingType("builtin")}>+ New Feature</Button>
            }
          />
          <FeatureTable rows={builtinFeatures} empty="No builtin features in the catalog." />
        </Card>
      ) : (
        <Card>
          <CardHeader title="General Settings" />
          <form onSubmit={saveGeneral} className="flex max-w-xl flex-col gap-4 p-4">
            <div>
              <Label htmlFor="s_site">Site name</Label>
              <Input
                id="s_site"
                required
                maxLength={60}
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="s_maxmem">Max memories per device (1–1000)</Label>
              <Input
                id="s_maxmem"
                type="number"
                min={1}
                max={1000}
                required
                value={maxMemories}
                onChange={(e) => setMaxMemories(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="s_timeout">Default MCP timeout, ms (1000–300000)</Label>
              <Input
                id="s_timeout"
                type="number"
                min={1000}
                max={300000}
                required
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={savingSettings}>
                {savingSettings ? "Saving…" : "Save settings"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Dialog
        open={creatingType !== null}
        onClose={() => setCreatingType(null)}
        title={creatingType === "mcp" ? "Register MCP Endpoint" : "New Feature"}
      >
        {creatingType ? (
          <FeatureDialog
            defaultType={creatingType}
            onDone={() => {
              setCreatingType(null);
              push("Feature created", "success");
              router.refresh();
            }}
            onCancel={() => setCreatingType(null)}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name ?? ""}`}
      >
        {editing ? (
          <FeatureDialog
            feature={editing}
            onDone={() => {
              setEditing(null);
              push("Feature updated", "success");
              router.refresh();
            }}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete Feature"
      >
        <p className="mb-4 text-sm font-medium">
          Delete <b>{deleting?.name}</b>? Devices that activated it lose the
          feature immediately. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete feature
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={recallTesting !== null}
        onClose={() => setRecallTesting(null)}
        title={`Recall test — ${recallTesting?.name ?? ""}`}
        wide
      >
        {recallTesting ? <McpTestDialog feature={recallTesting} /> : null}
      </Dialog>
    </div>
  );
}
