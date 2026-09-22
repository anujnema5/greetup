/**
 * Disk-backed object storage for local/dev when DigitalOcean Spaces is unavailable.
 * Same presign + PUT contract as Spaces so the browser upload path does not change.
 */

import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import logger from "@/core/logging";
import appConfig from "@/shared/config/config";
import { NotFoundError, ValidationError } from "@/shared/errors";

import {
  MAX_UPLOAD_BYTES,
  PROFILE_IMAGE_ALLOWED_CONTENT_TYPES,
  PROFILE_IMAGE_CACHE_CONTROL,
  PROFILE_IMAGE_PRESIGN_TTL_SECONDS,
} from "../spaces/constants";

export type LocalPresignResult = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
  contentType: string;
  uploadHeaders: Record<string, string>;
};

const LOG_PREFIX = "[storage:local]";
const PUBLIC_PATH_PREFIX = "/local-object-storage";
const ROOT_DIR = path.resolve(import.meta.dir, "../../../../.local-object-storage");
const ALLOWED_TYPES = new Set<string>(PROFILE_IMAGE_ALLOWED_CONTENT_TYPES);

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

type PendingUpload = {
  key: string;
  contentType: string;
  contentLength: number;
  expiresAt: number;
};

const pendingUploads = new Map<string, PendingUpload>();
let loggedDriver = false;

export function isLocalObjectStorageEnabled(): boolean {
  return appConfig.objectStorageDriver === "local";
}

export function localObjectStoragePublicPathPrefix(): string {
  return PUBLIC_PATH_PREFIX;
}

function logDriverOnce(): void {
  if (loggedDriver) return;
  loggedDriver = true;
  logger.info(
    `${LOG_PREFIX} Using local disk uploads (DigitalOcean Spaces bypassed)`,
    { dir: ROOT_DIR },
  );
}

function pruneExpiredUploads(): void {
  const now = Date.now();
  for (const [token, item] of pendingUploads) {
    if (item.expiresAt <= now) pendingUploads.delete(token);
  }
}

function assertSafeObjectKey(key: string): string {
  const normalizedKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalizedKey.split("/");
  if (
    !normalizedKey ||
    parts.some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new ValidationError("Invalid object key");
  }
  return normalizedKey;
}

function resolveObjectPath(key: string): string {
  const safeKey = assertSafeObjectKey(key);
  const abs = path.resolve(ROOT_DIR, ...safeKey.split("/"));
  const rel = path.relative(ROOT_DIR, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new ValidationError("Invalid object key");
  }
  return abs;
}

export function buildLocalPublicObjectUrl(objectKey: string): string {
  return `${appConfig.serverUrl}${PUBLIC_PATH_PREFIX}/${assertSafeObjectKey(objectKey)}`;
}

export function parseLocalObjectKeyFromPublicUrl(publicUrl: string): string | null {
  const base = `${appConfig.serverUrl}${PUBLIC_PATH_PREFIX}/`;
  if (!publicUrl.startsWith(base)) return null;
  const key = publicUrl.slice(base.length).split("?")[0];
  if (!key) return null;
  try {
    return assertSafeObjectKey(decodeURIComponent(key));
  } catch {
    return null;
  }
}

export function createLocalPresignedUpload(params: {
  key: string;
  contentType: string;
  contentLength: number;
}): LocalPresignResult {
  logDriverOnce();
  pruneExpiredUploads();

  const key = assertSafeObjectKey(params.key);
  const token = randomUUID();
  pendingUploads.set(token, {
    key,
    contentType: params.contentType,
    contentLength: params.contentLength,
    expiresAt: Date.now() + PROFILE_IMAGE_PRESIGN_TTL_SECONDS * 1000,
  });

  return {
    uploadUrl: `${appConfig.serverUrl}${PUBLIC_PATH_PREFIX}/upload/${token}`,
    publicUrl: buildLocalPublicObjectUrl(key),
    key,
    expiresIn: PROFILE_IMAGE_PRESIGN_TTL_SECONDS,
    contentType: params.contentType,
    uploadHeaders: {
      "Content-Type": params.contentType,
    },
  };
}

export async function completeLocalObjectUpload(
  token: string,
  body: ArrayBuffer,
  contentTypeHeader: string | undefined,
): Promise<void> {
  pruneExpiredUploads();
  const pending = pendingUploads.get(token);
  if (!pending) {
    throw new NotFoundError("Upload URL expired. Try again.");
  }
  pendingUploads.delete(token);

  const declaredType = (contentTypeHeader ?? "").split(";")[0]?.trim().toLowerCase();
  if (declaredType && declaredType !== pending.contentType) {
    throw new ValidationError("Content-Type does not match the presigned upload");
  }
  if (body.byteLength !== pending.contentLength) {
    throw new ValidationError("Uploaded file size does not match the presigned upload");
  }
  if (body.byteLength <= 0 || body.byteLength > MAX_UPLOAD_BYTES) {
    throw new ValidationError(`File must be between 1 and ${MAX_UPLOAD_BYTES} bytes`);
  }

  const abs = resolveObjectPath(pending.key);
  await mkdir(path.dirname(abs), { recursive: true });
  await Bun.write(abs, body);
}

export async function assertLocalImageObjectAllowed(key: string): Promise<void> {
  const abs = resolveObjectPath(key);
  let fileStat;
  try {
    fileStat = await stat(abs);
  } catch {
    throw new NotFoundError("Uploaded image not found");
  }
  if (!fileStat.isFile() || fileStat.size <= 0 || fileStat.size > MAX_UPLOAD_BYTES) {
    throw new ValidationError(`Uploaded image must be at most ${MAX_UPLOAD_BYTES} bytes`);
  }
  const ext = path.extname(key).slice(1).toLowerCase();
  const contentType = MIME_BY_EXT[ext];
  if (!contentType || !ALLOWED_TYPES.has(contentType)) {
    throw new ValidationError("Uploaded image has an unsupported content type");
  }
}

export async function readLocalObject(key: string): Promise<{
  body: ArrayBuffer;
  contentType: string;
  cacheControl: string;
}> {
  const abs = resolveObjectPath(key);
  const file = Bun.file(abs);
  if (!(await file.exists())) {
    throw new NotFoundError("Uploaded image not found");
  }
  const ext = path.extname(key).slice(1).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";
  return {
    body: await file.arrayBuffer(),
    contentType,
    cacheControl: PROFILE_IMAGE_CACHE_CONTROL,
  };
}
