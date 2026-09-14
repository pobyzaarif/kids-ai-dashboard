"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { apiFetch } from "@/lib/client";
import type { FeatureRow } from "@/server/queries/features";

type McpToolInfo = {
  name: string;
  description: string | null;
  inputSchema: Record<string, unknown> | null;
};

type McpListResponse = {
  ok: true;
  protocolVersion?: string | null;
  serverInfo?: { name?: string; version?: string } | null;
  tools: McpToolInfo[];
};

type McpCallResponse = { ok: true; result: Record<string, unknown> };

type PropSpec = {
  name: string;
  type: string;
  required: boolean;
  description: string;
  enumValues: string[] | null;
  default: unknown;
};

const errorBox =
  "border-2 border-ink bg-brand-red px-3 py-2 text-sm font-bold text-white";

/** Flattens a JSON-Schema `inputSchema` into simple field specs (null = raw JSON mode). */
function propSpecs(schema: unknown): PropSpec[] | null {
  if (!schema || typeof schema !== "object") return null;
  const s = schema as Record<string, unknown>;
  if (!s.properties || typeof s.properties !== "object" || Array.isArray(s.properties)) {
    return null;
  }
  const required = Array.isArray(s.required)
    ? s.required.filter((entry): entry is string => typeof entry === "string")
    : [];
  return Object.entries(s.properties as Record<string, unknown>).map(([name, def]) => {
    const d =
      def && typeof def === "object" && !Array.isArray(def)
        ? (def as Record<string, unknown>)
        : {};
    return {
      name,
      type: typeof d.type === "string" ? d.type : "string",
      required: required.includes(name),
      description: typeof d.description === "string" ? d.description : "",
      enumValues: Array.isArray(d.enum) ? d.enum.map((v) => String(v)) : null,
      default: d.default,
    };
  });
}

function initialValues(specs: PropSpec[] | null): Record<string, string> {
  const values: Record<string, string> = {};
  for (const spec of specs ?? []) {
    const dflt = spec.default;
    if (spec.type === "boolean") {
      values[spec.name] = typeof dflt === "boolean" ? String(dflt) : "false";
    } else if (spec.type === "object" || spec.type === "array") {
      values[spec.name] =
        dflt !== undefined && dflt !== null ? JSON.stringify(dflt, null, 2) : "";
    } else if (spec.enumValues && spec.enumValues.length > 0) {
      values[spec.name] =
        typeof dflt === "string" || typeof dflt === "number" ? String(dflt) : "";
    } else {
      values[spec.name] = dflt !== undefined && dflt !== null ? String(dflt) : "";
    }
  }
  return values;
}

function extractTextContent(result: Record<string, unknown>): string[] {
  const content = result.content;
  if (!Array.isArray(content)) return [];
  return content
    .map((item) =>
      item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).text === "string"
        ? ((item as Record<string, unknown>).text as string)
        : null,
    )
    .filter((text): text is string => text !== null);
}

/**
 * Admin MCP "recall test" popup: connects to the registered endpoint,
 * lists its tools and lets the admin run any of them with ad-hoc arguments.
 */
export function McpTestDialog({ feature }: { feature: FeatureRow }) {
  const [tools, setTools] = useState<McpToolInfo[] | null>(null);
  const [serverInfo, setServerInfo] = useState<McpListResponse["serverInfo"]>(null);
  const [protocolVersion, setProtocolVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<McpToolInfo | null>(null);

  const endpointUrl = String(
    (feature.config as Record<string, unknown>)?.endpoint_url ?? "",
  );

  const loadTools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<McpListResponse>(
        `/api/v1/admin/features/${feature.id}/mcp`,
        { method: "POST", body: JSON.stringify({ action: "list_tools" }) },
      );
      setTools(res.tools ?? []);
      setServerInfo(res.serverInfo ?? null);
      setProtocolVersion(res.protocolVersion ?? null);
    } catch (err) {
      setTools(null);
      setError(err instanceof Error ? err.message : "Could not reach the MCP endpoint");
    } finally {
      setLoading(false);
    }
  }, [feature.id]);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  if (testing) {
    return (
      <ToolTester
        key={testing.name}
        featureId={feature.id}
        tool={testing}
        onBack={() => setTesting(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="break-all font-mono text-[11px] text-gray-500">{endpointUrl}</p>

      {loading ? (
        <p className="border-2 border-dashed border-ink px-3 py-6 text-center text-sm font-bold uppercase tracking-wide text-gray-600">
          Connecting to the MCP endpoint…
        </p>
      ) : error ? (
        <div className="flex flex-col gap-3">
          <p className={errorBox}>{error}</p>
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={loadTools}>
              Retry
            </Button>
          </div>
        </div>
      ) : tools !== null ? (
        <ToolList
          tools={tools}
          serverInfo={serverInfo}
          protocolVersion={protocolVersion}
          onRefresh={loadTools}
          onSelect={setTesting}
        />
      ) : null}
    </div>
  );
}

function ToolList({
  tools,
  serverInfo,
  protocolVersion,
  onRefresh,
  onSelect,
}: {
  tools: McpToolInfo[];
  serverInfo: McpListResponse["serverInfo"];
  protocolVersion: string | null;
  onRefresh: () => void;
  onSelect: (tool: McpToolInfo) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {serverInfo?.name ? (
          <Badge tone="cyan">
            {serverInfo.name}
            {serverInfo.version ? ` v${serverInfo.version}` : ""}
          </Badge>
        ) : null}
        {protocolVersion ? <Badge tone="purple">protocol {protocolVersion}</Badge> : null}
        <Badge tone="lime">{tools.length} tools</Badge>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onRefresh}>
          ↻ Refresh
        </Button>
      </div>

      {tools.length === 0 ? (
        <p className="border-2 border-dashed border-ink px-3 py-6 text-center text-sm font-bold uppercase tracking-wide text-gray-600">
          Endpoint connected but exposes no tools.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tools.map((tool) => {
            const specs = propSpecs(tool.inputSchema);
            const requiredNames = specs
              ? specs.filter((s) => s.required).map((s) => s.name)
              : [];
            return (
              <div
                key={tool.name}
                className="flex items-start justify-between gap-3 border-2 border-ink bg-white p-3 shadow-brutal-xs"
              >
                <div className="min-w-0">
                  <p className="break-all font-mono text-sm font-bold">{tool.name}</p>
                  {tool.description ? (
                    <p className="mt-0.5 text-xs font-medium text-gray-600">
                      {tool.description}
                    </p>
                  ) : null}
                  {requiredNames.length > 0 ? (
                    <p className="mt-1 flex flex-wrap gap-1">
                      {requiredNames.map((name) => (
                        <Badge key={name} tone="pink">
                          req: {name}
                        </Badge>
                      ))}
                    </p>
                  ) : null}
                </div>
                <Button size="sm" onClick={() => onSelect(tool)}>
                  ▶ Test
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function ToolTester({
  featureId,
  tool,
  onBack,
}: {
  featureId: string;
  tool: McpToolInfo;
  onBack: () => void;
}) {
  const specs = useMemo(() => propSpecs(tool.inputSchema), [tool]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(specs),
  );
  const [rawArgs, setRawArgs] = useState("{}");
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{
    result: Record<string, unknown>;
    ms: number;
  } | null>(null);

  function setValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function buildArgs(): { args?: Record<string, unknown>; error?: string } {
    if (specs === null) {
      try {
        const parsed: unknown = JSON.parse(rawArgs || "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return { error: "Arguments must be a JSON object" };
        }
        return { args: parsed as Record<string, unknown> };
      } catch {
        return { error: "Arguments are not valid JSON" };
      }
    }
    const args: Record<string, unknown> = {};
    for (const spec of specs) {
      const raw = (values[spec.name] ?? "").trim();
      if (raw === "") {
        if (spec.required) return { error: `"${spec.name}" is required` };
        continue;
      }
      if (spec.type === "number" || spec.type === "integer") {
        const num = Number(raw);
        if (Number.isNaN(num)) return { error: `"${spec.name}" must be a number` };
        args[spec.name] = num;
      } else if (spec.type === "boolean") {
        args[spec.name] = raw === "true";
      } else if (spec.type === "object" || spec.type === "array") {
        try {
          args[spec.name] = JSON.parse(raw);
        } catch {
          return { error: `"${spec.name}" is not valid JSON` };
        }
      } else {
        args[spec.name] = raw;
      }
    }
    return { args };
  }

  async function run() {
    setCallError(null);
    setOutcome(null);
    const built = buildArgs();
    if (built.error || !built.args) {
      setCallError(built.error ?? "Could not build arguments");
      return;
    }
    setCalling(true);
    const startedAt = performance.now();
    try {
      const res = await apiFetch<McpCallResponse>(
        `/api/v1/admin/features/${featureId}/mcp`,
        {
          method: "POST",
          body: JSON.stringify({
            action: "call_tool",
            tool: tool.name,
            arguments: built.args,
          }),
        },
      );
      setOutcome({
        result: res.result ?? {},
        ms: Math.round(performance.now() - startedAt),
      });
    } catch (err) {
      setCallError(err instanceof Error ? err.message : "Tool call failed");
    } finally {
      setCalling(false);
    }
  }

  function renderControl(spec: PropSpec) {
    const id = `mcp_arg_${spec.name}`;
    const value = values[spec.name] ?? "";
    if (spec.enumValues && spec.enumValues.length > 0) {
      return (
        <Select id={id} value={value} onChange={(e) => setValue(spec.name, e.target.value)}>
          {!spec.required ? <option value="">— omit —</option> : null}
          {spec.enumValues.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      );
    }
    if (spec.type === "boolean") {
      return (
        <Select id={id} value={value} onChange={(e) => setValue(spec.name, e.target.value)}>
          {!spec.required ? <option value="">— omit —</option> : null}
          <option value="true">true</option>
          <option value="false">false</option>
        </Select>
      );
    }
    if (spec.type === "object" || spec.type === "array") {
      return (
        <Textarea
          id={id}
          rows={4}
          className="font-mono text-xs"
          value={value}
          onChange={(e) => setValue(spec.name, e.target.value)}
          placeholder={spec.type === "array" ? "[]" : "{}"}
        />
      );
    }
    return (
      <Input
        id={id}
        type={spec.type === "number" || spec.type === "integer" ? "number" : "text"}
        step={spec.type === "integer" ? 1 : undefined}
        value={value}
        onChange={(e) => setValue(spec.name, e.target.value)}
      />
    );
  }

  const textContent = outcome ? extractTextContent(outcome.result) : [];
  const isToolError = outcome?.result.isError === true;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="secondary" size="sm" onClick={onBack}>
          ← All tools
        </Button>
      </div>

      <div className="border-2 border-ink bg-brand-orange/20 p-3">
        <p className="break-all font-mono text-sm font-bold">{tool.name}</p>
        {tool.description ? (
          <p className="mt-1 text-xs font-medium text-gray-600">{tool.description}</p>
        ) : null}
      </div>

      {specs === null ? (
        <div>
          <Label htmlFor="mcp_args">Arguments (JSON object)</Label>
          <Textarea
            id="mcp_args"
            rows={5}
            className="font-mono text-xs"
            value={rawArgs}
            onChange={(e) => setRawArgs(e.target.value)}
            placeholder="{}"
          />
          <p className="mt-1 text-[11px] font-medium text-gray-500">
            The tool did not advertise an input schema — provide arguments as JSON.
          </p>
        </div>
      ) : specs.length === 0 ? (
        <p className="border-2 border-dashed border-ink px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-600">
          This tool takes no arguments.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {specs.map((spec) => (
            <div key={spec.name}>
              <Label htmlFor={`mcp_arg_${spec.name}`}>
                {spec.name}
                {spec.required ? " *" : ""}
                {spec.type !== "string" ? ` (${spec.type})` : ""}
              </Label>
              {renderControl(spec)}
              {spec.description ? (
                <p className="mt-1 text-[11px] font-medium text-gray-500">
                  {spec.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={run} disabled={calling}>
          {calling ? "Running…" : "▶ Run tool"}
        </Button>
      </div>

      {callError ? <p className={errorBox}>{callError}</p> : null}

      {outcome ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge tone={isToolError ? "red" : "lime"}>
              {isToolError ? "tool error" : "ok"} · {outcome.ms}ms
            </Badge>
          </div>
          {textContent.length > 0 ? (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap wrap-break-words border-2 border-ink bg-brand-lime/30 p-3 font-mono text-xs">
              {textContent.join("\n\n")}
            </pre>
          ) : null}
          <pre className="max-h-64 overflow-auto border-2 border-ink bg-ink p-3 font-mono text-[11px] leading-relaxed text-white">
            {JSON.stringify(outcome.result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
