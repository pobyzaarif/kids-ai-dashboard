"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import { apiFetch } from "@/lib/client";
import type { FeatureRow } from "@/server/queries/features";

export type FeatureDialogResult = "created" | "updated";

/**
 * Create/edit dialog for catalog features — builtin toggles and MCP endpoints.
 * On edit, a blank auth token means "keep the stored one" (partial merge).
 */
export function FeatureDialog({
  feature,
  defaultType = "builtin",
  onDone,
  onCancel,
}: {
  feature?: FeatureRow; // present = edit mode
  defaultType?: "builtin" | "mcp";
  onDone: (result: FeatureDialogResult) => void;
  onCancel: () => void;
}) {
  const editing = Boolean(feature);
  const cfg = (feature?.config ?? {}) as Record<string, unknown>;

  const [type, setType] = useState<"builtin" | "mcp">(
    (feature?.type as "builtin" | "mcp") ?? defaultType,
  );
  const [code, setCode] = useState(feature?.code ?? "");
  const [name, setName] = useState(feature?.name ?? "");
  const [description, setDescription] = useState(feature?.description ?? "");
  const [isActive, setIsActive] = useState(feature?.is_active ?? true);
  const [endpointUrl, setEndpointUrl] = useState(String(cfg.endpoint_url ?? ""));
  const [authHeader, setAuthHeader] = useState(String(cfg.auth_header ?? "Authorization"));
  const [authToken, setAuthToken] = useState(""); // blank = keep existing on edit
  const [timeoutMs, setTimeoutMs] = useState(
    typeof cfg.timeout_ms === "number" ? cfg.timeout_ms : 30000,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editing && feature) {
        const config: Record<string, unknown> = { timeout_ms: timeoutMs };
        if (type === "mcp") {
          config.endpoint_url = endpointUrl;
          config.auth_header = authHeader;
          if (authToken !== "") config.auth_token = authToken;
        }
        await apiFetch(`/api/v1/admin/features/${feature.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name,
            description: description || null,
            is_active: isActive,
            config,
          }),
        });
        onDone("updated");
      } else {
        const config: Record<string, unknown> =
          type === "mcp"
            ? {
                endpoint_url: endpointUrl,
                auth_header: authHeader,
                auth_token: authToken,
                timeout_ms: timeoutMs,
              }
            : {};
        await apiFetch("/api/v1/admin/features", {
          method: "POST",
          body: JSON.stringify({
            code,
            name,
            description: description || undefined,
            type,
            config,
            is_active: isActive,
          }),
        });
        onDone("created");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save feature");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="f_name">Name</Label>
          <Input
            id="f_name"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weather MCP Tools"
          />
        </div>
        <div>
          <Label htmlFor="f_code">Code {editing ? "(immutable)" : ""}</Label>
          <Input
            id="f_code"
            required
            disabled={editing}
            className="font-mono"
            maxLength={40}
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            placeholder="e.g. weather_tools"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="f_desc">Description</Label>
        <Textarea
          id="f_desc"
          maxLength={300}
          className="min-h-16"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this feature do on the device?"
        />
      </div>

      {!editing ? (
        <div>
          <Label>Type</Label>
          <div className="flex gap-2">
            {(["builtin", "mcp"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`cursor-pointer border-2 border-ink px-4 py-2 text-sm font-bold uppercase ${
                  type === value
                    ? "translate-y-0.5 bg-brand-yellow shadow-none"
                    : "bg-white shadow-brutal-xs"
                }`}
              >
                {value === "mcp" ? "MCP endpoint" : "Builtin"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="border-2 border-dashed border-ink px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-600">
          Type: {type}
        </p>
      )}

      {type === "mcp" ? (
        <div className="flex flex-col gap-4 border-2 border-ink bg-brand-orange/20 p-3">
          <p className="text-xs font-bold uppercase tracking-wide">
            MCP endpoint settings
          </p>
          <div>
            <Label htmlFor="f_url">Endpoint URL</Label>
            <Input
              id="f_url"
              required
              type="url"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://mcp.example.com/sse"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="f_header">Auth header</Label>
              <Input
                id="f_header"
                value={authHeader}
                onChange={(e) => setAuthHeader(e.target.value)}
                placeholder="Authorization"
              />
            </div>
            <div>
              <Label htmlFor="f_token">Auth token</Label>
              <Input
                id="f_token"
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder={
                  editing && cfg.auth_token
                    ? "•••• (leave blank to keep)"
                    : "secret token"
                }
              />
            </div>
          </div>
          <div>
            <Label htmlFor="f_timeout">Timeout (ms)</Label>
            <Input
              id="f_timeout"
              type="number"
              min={1000}
              max={300000}
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(Number(e.target.value))}
            />
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Toggle checked={isActive} onChange={setIsActive} label="Feature active" />
        <div>
          <p className="text-sm font-bold">Active in catalog</p>
          <p className="text-xs font-medium text-gray-600">
            Inactive features cannot be enabled on any device.
          </p>
        </div>
      </div>

      {error ? (
        <p className="border-2 border-ink bg-brand-red px-3 py-2 text-sm font-bold text-white">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Create"}
        </Button>
      </div>
    </form>
  );
}
