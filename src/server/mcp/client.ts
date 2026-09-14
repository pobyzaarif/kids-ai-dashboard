/**
 * Minimal MCP (Model Context Protocol) client used by the admin "recall test".
 *
 * Speaks JSON-RPC 2.0 over both official MCP HTTP transports without adding a
 * dependency to the project:
 *
 *  - Streamable HTTP (current spec): JSON-RPC is POSTed straight to the
 *    endpoint; responses come back as plain JSON or as an SSE stream, and the
 *    session is tracked via the `Mcp-Session-Id` response header.
 *  - Legacy HTTP+SSE (2024-11-05 spec): a long-lived GET event stream first
 *    advertises a message `endpoint`; JSON-RPC is POSTed there and responses
 *    arrive on the stream, correlated by request id.
 *
 * Every public operation opens a fresh session (`initialize` +
 * `notifications/initialized`), does its work and closes the session again —
 * test calls must not leave state behind on the endpoint.
 */

const CLIENT_NAME = "kids-ai-console";
const CLIENT_VERSION = "0.1.0";
const STREAMABLE_PROTOCOL_VERSION = "2025-03-26";
const LEGACY_PROTOCOL_VERSION = "2024-11-05";
const DEFAULT_TIMEOUT_MS = 30_000;

export type McpEndpointConfig = {
  endpoint_url: string;
  auth_header?: string;
  auth_token?: string;
  timeout_ms?: number;
};

export type McpToolInfo = {
  name: string;
  description: string | null;
  inputSchema: Record<string, unknown> | null;
};

export type McpServerInfo = {
  protocolVersion: string | null;
  serverInfo: { name?: string; version?: string } | null;
};

export type McpListResult = McpServerInfo & { tools: McpToolInfo[] };

/** Failure of/with the remote MCP endpoint (surfaced to the admin as-is). */
export class McpClientError extends Error {
  /** The streamable-HTTP POST was rejected in a way that suggests a legacy SSE endpoint. */
  readonly fallbackToLegacy: boolean;

  constructor(message: string, options: { fallbackToLegacy?: boolean } = {}) {
    super(message);
    this.name = "McpClientError";
    this.fallbackToLegacy = options.fallbackToLegacy ?? false;
  }
}

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: number | string | null;
  result?: Record<string, unknown>;
  error?: { code?: number; message?: string; data?: unknown };
};

type McpSession = McpServerInfo & {
  request(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>>;
  close(): Promise<void>;
};

/* ------------------------------ small helpers ----------------------------- */

function timeoutOf(cfg: McpEndpointConfig): number {
  return typeof cfg.timeout_ms === "number" && cfg.timeout_ms >= 1000
    ? cfg.timeout_ms
    : DEFAULT_TIMEOUT_MS;
}

function authHeaders(cfg: McpEndpointConfig): Record<string, string> {
  if (!cfg.auth_token) return {};
  const header = cfg.auth_header?.trim() || "Authorization";
  const value =
    header.toLowerCase() === "authorization" && !/\s/.test(cfg.auth_token)
      ? `Bearer ${cfg.auth_token}` // conventional bearer token
      : cfg.auth_token;
  return { [header]: value };
}

function rpcErrorMessage(msg: JsonRpcResponse): string {
  const err = msg.error;
  const code = typeof err?.code === "number" ? ` ${err.code}` : "";
  return `MCP error${code}: ${err?.message ?? "unknown JSON-RPC error"}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new McpClientError(`Timed out after ${ms}ms ${what}`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onExternalAbort);
    // NOTE: the listener is deliberately NOT removed when fetch() resolves —
    // a response body (e.g. a long-lived SSE stream) outlives the headers, and
    // session close() must still be able to tear the stream down. Listeners
    // die with the per-session signal, so nothing leaks.
  }
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new McpClientError(
        timedOut
          ? `Timed out after ${ms}ms talking to the MCP endpoint`
          : "Request to the MCP endpoint was cancelled",
      );
    }
    const reason = err instanceof Error ? err.message : String(err);
    throw new McpClientError(`Could not reach the MCP endpoint: ${reason}`);
  } finally {
    clearTimeout(timer);
  }
}

function assertHttpUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new McpClientError("Endpoint URL is not a valid absolute URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new McpClientError("Endpoint URL must use http or https");
  }
}

/* ------------------------------ SSE framing ------------------------------- */

type SseFrame = { event: string | null; data: string };

function parseSseFrame(raw: string): SseFrame {
  let event: string | null = null;
  const data: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice("event:".length).trim();
    else if (line.startsWith("data:")) data.push(line.slice("data:".length).replace(/^ /, ""));
  }
  return { event, data: data.join("\n") };
}

/** Yields SSE frames from a response body, handling CRLF and chunk boundaries. */
async function* sseFrames(body: ReadableStream<Uint8Array>): AsyncGenerator<SseFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, "\n");
      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const frame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        if (frame.trim()) yield parseSseFrame(frame);
        separator = buffer.indexOf("\n\n");
      }
    }
    buffer = (buffer + decoder.decode()).replace(/\r\n/g, "\n");
    if (buffer.trim()) yield parseSseFrame(buffer);
  } finally {
    await reader.cancel().catch(() => {});
  }
}

/** Reads one JSON-RPC response for `requestId` from a JSON or SSE-framed body. */
async function readJsonOrSseResponse(
  res: Response,
  requestId: number,
): Promise<JsonRpcResponse> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream") && res.body) {
    for await (const frame of sseFrames(res.body)) {
      if (!frame.data) continue;
      let msg: JsonRpcResponse;
      try {
        msg = JSON.parse(frame.data) as JsonRpcResponse;
      } catch {
        continue;
      }
      if (msg.id === requestId) return msg;
      // Server→client requests/notifications are ignored by the test client.
    }
    throw new McpClientError("MCP endpoint closed the SSE stream before responding");
  }
  const text = await res.text();
  try {
    return JSON.parse(text) as JsonRpcResponse;
  } catch {
    throw new McpClientError(
      `Unexpected response from the MCP endpoint (content-type: ${contentType || "unknown"})`,
    );
  }
}

function normalizeTools(value: unknown): McpToolInfo[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const tool = (entry ?? {}) as Record<string, unknown>;
    return {
      name: typeof tool.name === "string" && tool.name ? tool.name : "(unnamed tool)",
      description: typeof tool.description === "string" ? tool.description : null,
      inputSchema:
        tool.inputSchema && typeof tool.inputSchema === "object" && !Array.isArray(tool.inputSchema)
          ? (tool.inputSchema as Record<string, unknown>)
          : null,
    };
  });
}

/* ----------------------- transport: streamable HTTP ----------------------- */

async function openStreamableHttpSession(cfg: McpEndpointConfig): Promise<McpSession> {
  const ms = timeoutOf(cfg);
  let sessionId: string | null = null;
  let nextId = 1;

  async function post(payload: unknown): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...authHeaders(cfg),
    };
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;
    return fetchWithTimeout(cfg.endpoint_url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }, ms);
  }

  // initialize — handled inline so the session header can be captured.
  const initId = nextId++;
  const initRes = await post({
    jsonrpc: "2.0",
    id: initId,
    method: "initialize",
    params: {
      protocolVersion: STREAMABLE_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: CLIENT_NAME, version: CLIENT_VERSION },
    },
  });
  if (!initRes.ok) {
    // 404/405/406 typically mean the URL is a legacy SSE stream (GET-only).
    const fallback = initRes.status === 404 || initRes.status === 405 || initRes.status === 406;
    throw new McpClientError(
      `MCP endpoint responded ${initRes.status} ${initRes.statusText} to initialize`,
      { fallbackToLegacy: fallback },
    );
  }
  const sessionHeader = initRes.headers.get("mcp-session-id");
  if (sessionHeader) sessionId = sessionHeader;
  const initMsg = await readJsonOrSseResponse(initRes, initId);
  if (initMsg.error) throw new McpClientError(rpcErrorMessage(initMsg));
  const initResult = initMsg.result ?? {};
  const info =
    initResult.serverInfo && typeof initResult.serverInfo === "object"
      ? (initResult.serverInfo as Record<string, unknown>)
      : null;

  // initialized notification — no response expected (202).
  const notifyRes = await post({ jsonrpc: "2.0", method: "notifications/initialized" });
  if (!notifyRes.ok && notifyRes.status !== 202) {
    throw new McpClientError(
      `MCP endpoint rejected the initialized notification (${notifyRes.status})`,
    );
  }
  await notifyRes.body?.cancel().catch(() => {});

  return {
    protocolVersion:
      typeof initResult.protocolVersion === "string" ? initResult.protocolVersion : null,
    serverInfo: info
      ? {
          name: typeof info.name === "string" ? info.name : undefined,
          version: typeof info.version === "string" ? info.version : undefined,
        }
      : null,
    async request(method, params) {
      const id = nextId++;
      return withTimeout(
        (async () => {
          const res = await post({ jsonrpc: "2.0", id, method, params: params ?? {} });
          if (!res.ok) {
            throw new McpClientError(
              `MCP endpoint responded ${res.status} ${res.statusText} to ${method}`,
            );
          }
          const msg = await readJsonOrSseResponse(res, id);
          if (msg.error) throw new McpClientError(rpcErrorMessage(msg));
          return msg.result ?? {};
        })(),
        ms,
        `waiting for ${method}`,
      );
    },
    async close() {
      if (!sessionId) return;
      await fetchWithTimeout(cfg.endpoint_url, {
        method: "DELETE",
        headers: { ...authHeaders(cfg), "Mcp-Session-Id": sessionId },
      }, Math.min(ms, 5000)).catch(() => {
        // best effort — session cleanup must never break the test
      });
    },
  };
}

/* ------------------- transport: legacy HTTP+SSE (2024) -------------------- */

async function openLegacySseSession(cfg: McpEndpointConfig): Promise<McpSession> {
  const ms = timeoutOf(cfg);
  const controller = new AbortController();
  let nextId = 1;

  const streamRes = await fetchWithTimeout(cfg.endpoint_url, {
    headers: { Accept: "text/event-stream", ...authHeaders(cfg) },
  }, ms, controller.signal);
  if (!streamRes.ok || !streamRes.body) {
    throw new McpClientError(
      `MCP endpoint responded ${streamRes.status} ${streamRes.statusText} to the SSE stream request`,
    );
  }
  const streamBody = streamRes.body;

  const pending = new Map<number, {
    resolve: (msg: JsonRpcResponse) => void;
    reject: (err: Error) => void;
  }>();
  let endpointSettled = false;
  let resolveEndpoint!: (url: string) => void;
  let rejectEndpoint!: (err: Error) => void;
  const endpointPromise = new Promise<string>((resolve, reject) => {
    resolveEndpoint = resolve;
    rejectEndpoint = reject;
  });

  const failAll = (err: Error) => {
    if (!endpointSettled) {
      endpointSettled = true;
      rejectEndpoint(err);
    }
    for (const waiter of pending.values()) waiter.reject(err);
    pending.clear();
  };

  const pump = (async () => {
    try {
      for await (const frame of sseFrames(streamBody)) {
        if (frame.event === "endpoint" && frame.data && !endpointSettled) {
          endpointSettled = true;
          resolveEndpoint(new URL(frame.data, cfg.endpoint_url).toString());
          continue;
        }
        if (!frame.data) continue;
        let msg: JsonRpcResponse;
        try {
          msg = JSON.parse(frame.data) as JsonRpcResponse;
        } catch {
          continue;
        }
        if (typeof msg.id === "number") {
          const waiter = pending.get(msg.id);
          if (waiter) {
            pending.delete(msg.id);
            waiter.resolve(msg);
          }
        }
      }
      failAll(new McpClientError("MCP endpoint closed the SSE stream"));
    } catch (err) {
      failAll(err instanceof Error ? err : new McpClientError(String(err)));
    }
  })();

  let messageUrl: string;
  try {
    messageUrl = await withTimeout(endpointPromise, ms, "waiting for the endpoint event");
  } catch (err) {
    controller.abort();
    throw err;
  }

  async function postMessage(payload: unknown): Promise<Response> {
    return fetchWithTimeout(messageUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(cfg) },
      body: JSON.stringify(payload),
    }, ms, controller.signal);
  }

  async function request(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const id = nextId++;
    const waiter = withTimeout<JsonRpcResponse>(
      new Promise<JsonRpcResponse>((resolve, reject) => {
        pending.set(id, { resolve, reject });
      }),
      ms,
      `waiting for ${method}`,
    );
    void waiter.catch(() => {}); // never leave an unhandled rejection behind
    try {
      const res = await postMessage({ jsonrpc: "2.0", id, method, params: params ?? {} });
      if (!res.ok) {
        throw new McpClientError(
          `MCP endpoint responded ${res.status} ${res.statusText} to ${method}`,
        );
      }
      await res.body?.cancel().catch(() => {});
      const msg = await waiter;
      if (msg.error) throw new McpClientError(rpcErrorMessage(msg));
      return msg.result ?? {};
    } catch (err) {
      pending.delete(id);
      throw err;
    }
  }

  const initResult = await request("initialize", {
    protocolVersion: LEGACY_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: CLIENT_NAME, version: CLIENT_VERSION },
  });
  const info =
    initResult.serverInfo && typeof initResult.serverInfo === "object"
      ? (initResult.serverInfo as Record<string, unknown>)
      : null;

  const notifyRes = await postMessage({ jsonrpc: "2.0", method: "notifications/initialized" });
  if (!notifyRes.ok && notifyRes.status !== 202) {
    throw new McpClientError(
      `MCP endpoint rejected the initialized notification (${notifyRes.status})`,
    );
  }
  await notifyRes.body?.cancel().catch(() => {});

  return {
    protocolVersion:
      typeof initResult.protocolVersion === "string" ? initResult.protocolVersion : null,
    serverInfo: info
      ? {
          name: typeof info.name === "string" ? info.name : undefined,
          version: typeof info.version === "string" ? info.version : undefined,
        }
      : null,
    request,
    async close() {
      controller.abort();
      // The abort ends the pump via failAll; cap the wait as a safety net.
      await Promise.race([
        pump.catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    },
  };
}

/* ------------------------------- public API ------------------------------- */

async function openMcpSession(cfg: McpEndpointConfig): Promise<McpSession> {
  assertHttpUrl(cfg.endpoint_url);
  try {
    return await openStreamableHttpSession(cfg);
  } catch (err) {
    if (err instanceof McpClientError && err.fallbackToLegacy) {
      try {
        return await openLegacySseSession(cfg);
      } catch (legacyErr) {
        throw legacyErr instanceof McpClientError
          ? legacyErr
          : new McpClientError(`Could not open an MCP session: ${String(legacyErr)}`);
      }
    }
    throw err;
  }
}

/** Lists every tool the endpoint exposes (follows `nextCursor` pagination). */
export async function listMcpTools(cfg: McpEndpointConfig): Promise<McpListResult> {
  const session = await openMcpSession(cfg);
  try {
    const tools: McpToolInfo[] = [];
    let cursor: string | undefined;
    do {
      const result = await session.request("tools/list", cursor ? { cursor } : {});
      tools.push(...normalizeTools(result.tools));
      cursor = typeof result.nextCursor === "string" ? result.nextCursor : undefined;
    } while (cursor);
    return { protocolVersion: session.protocolVersion, serverInfo: session.serverInfo, tools };
  } finally {
    await session.close();
  }
}

/** Invokes a single tool and returns the raw `tools/call` result. */
export async function callMcpTool(
  cfg: McpEndpointConfig,
  tool: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const session = await openMcpSession(cfg);
  try {
    return await session.request("tools/call", { name: tool, arguments: args });
  } finally {
    await session.close();
  }
}
