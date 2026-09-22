import type { Hono } from "hono";

import {
  completeLocalObjectUpload,
  localObjectStoragePublicPathPrefix,
  readLocalObject,
} from "./local-object-storage.service";

export function mountLocalObjectStorageRoutes(app: Hono): void {
  const prefix = localObjectStoragePublicPathPrefix();

  app.put(`${prefix}/upload/:token`, async (c) => {
    const token = c.req.param("token");
    const body = await c.req.arrayBuffer();
    await completeLocalObjectUpload(token, body, c.req.header("content-type"));
    return c.body("", 200);
  });

  app.get(`${prefix}/*`, async (c) => {
    const rest = c.req.param("*") ?? c.req.path.slice(`${prefix}/`.length);
    let key: string;
    try {
      key = decodeURIComponent(rest).split("?")[0] ?? "";
    } catch {
      key = "";
    }
    const object = await readLocalObject(key);
    return c.body(object.body, 200, {
      "Content-Type": object.contentType,
      "Cache-Control": object.cacheControl,
    });
  });
}
