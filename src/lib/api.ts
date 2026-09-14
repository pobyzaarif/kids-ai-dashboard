import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

/** Error type for expected (handled) API failures. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

const uuidSchema = z.string().uuid();

/** Validates a dynamic-route id; invalid ids mean the resource does not exist. */
export function assertUuid(value: string, label = "Resource"): string {
  if (!uuidSchema.safeParse(value).success) {
    throw new ApiError(404, `${label} not found`);
  }
  return value;
}

/**
 * Wraps a route-handler body: ApiError -> its status, ZodError -> 422,
 * anything else -> logged 500.
 */
export function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  return fn().catch((err: unknown) => {
    if (err instanceof ApiError) {
      return NextResponse.json(
        {
          error: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
        { status: err.status },
      );
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.flatten() },
        { status: 422 },
      );
    }
    console.error("[api] unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  });
}

/** Maps Postgres unique-violation errors to friendly 409s. */
export function uniqueViolation(
  err: unknown,
  message: string,
): boolean {
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  ) {
    throw new ApiError(409, message);
  }
  return false;
}
