import type { Context } from "hono";

import { auth } from "@/core/auth/auth";
import { getNormalizedSessionService } from "../services/get-normalized-session.service";

export async function handleGetSession(c: Context) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const normalized = await getNormalizedSessionService(session);
  c.header("Cache-Control", "no-store");
  return c.json(normalized ?? null);
}
