import type { Context } from "hono";
import { APP_CONFIG } from "@/config/constants";

export function healthHandler(c: Context) {
  return c.json({ status: "ok", service: APP_CONFIG.serviceName });
}
