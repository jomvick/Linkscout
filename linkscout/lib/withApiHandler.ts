import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

type Handler<T> = (req: NextRequest, ctx: T) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a Next.js route handler with consistent error handling, optional Zod
 * body validation, and structured logging.
 *
 * Usage:
 *   export const POST = withApiHandler(async (req) => {
 *     const { jobId } = await parseJson(req, schema);
 *     // ...
 *     return NextResponse.json({ ok: true });
 *   });
 */
export function withApiHandler<T = unknown>(
  handler: Handler<T>,
  options: { schema?: ZodSchema; tag?: string } = {},
) {
  const tag = options.tag ?? "API";

  return async (req: NextRequest, ctx: T): Promise<NextResponse> => {
    try {
      if (options.schema) {
        // Validate body when a schema is provided
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
        }
        const result = options.schema.safeParse(raw);
        if (!result.success) {
          return NextResponse.json(
            {
              error: "Validation échouée",
              details: result.error.flatten().fieldErrors,
            },
            { status: 400 },
          );
        }
        // Attach the parsed body so the handler can read it via req.json() replacement.
        // We mutate a clone so we don't poison the original request across handlers.
        (req as NextRequest & { _parsed?: unknown })._parsed = result.data;
      }
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation échouée", details: err.flatten().fieldErrors },
          { status: 400 },
        );
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${tag}] Unhandled error:`, msg);
      return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
    }
  };
}

/**
 * Helper for handlers that need the validated body without going through
 * `req.json()` again. Returns the body previously stashed by `withApiHandler`.
 */
export function getParsedBody<T>(req: NextRequest): T {
  return (req as NextRequest & { _parsed?: T })._parsed as T;
}
