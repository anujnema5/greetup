import type { Context } from "hono";

import { ApiResponse } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { connectionIdParamSchema } from "../schemas/connection-id.param.schema";

export type ParsedConnectionIdRouteParam =
  | { ok: true; connectionId: string }
  /** Same shape as `c.json(..., status)` from Hono; typed loosely to avoid deep `Context` instantiation. */
  | { ok: false; response: Response };

export function parseConnectionIdRouteParam(c: Context): ParsedConnectionIdRouteParam {
  const parsed = connectionIdParamSchema.safeParse({
    connectionId: c.req.param("connectionId"),
  });
  if (!parsed.success) {
    const response = c.json(
      ApiResponse.error({
        message: "Invalid connection id",
        statusCode: 400,
        code: "VALIDATION_ERROR",
        errors: zodFieldErrorsItems(parsed.error),
      }),
      400,
    );
    return { ok: false, response: response as Response };
  }
  return { ok: true, connectionId: parsed.data.connectionId };
}
