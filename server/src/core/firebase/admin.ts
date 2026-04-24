import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import admin from "firebase-admin";

import config from "@/shared/config/config";

let app: admin.app.App | null = null;

function resolveKeyPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  return isAbsolute(trimmed) ? trimmed : resolve(process.cwd(), trimmed);
}

/** Strip optional outer quotes from a .env value. */
function unwrapQuotedEnvJson(raw: string): string {
  const s = raw.trim();
  if (s.length >= 2 && ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"')))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

function loadServiceAccountJsonString(): string {
  const filePath = config.firebaseServiceAccountPath?.trim();
  if (filePath) {
    try {
      return readFileSync(resolveKeyPath(filePath), "utf8");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[firebase] Could not read FIREBASE_SERVICE_ACCOUNT_PATH (${filePath}): ${msg}`);
    }
  }

  const inline = config.firebaseServiceAccountJson;
  if (!inline) {
    throw new Error(
      "[firebase] Set FIREBASE_SERVICE_ACCOUNT_PATH to your downloaded service account .json file, " +
        "or FIREBASE_SERVICE_ACCOUNT_JSON as a single-line JSON string (multi-line values break .env parsing).",
    );
  }

  return unwrapQuotedEnvJson(inline);
}

/**
 * Firebase Admin for verifying ID tokens from the client Phone Auth flow.
 *
 * Configure either:
 * - `FIREBASE_SERVICE_ACCOUNT_PATH` — recommended for local dev (path to the JSON key file), or
 * - `FIREBASE_SERVICE_ACCOUNT_JSON` — entire JSON on **one line** in `.env`.
 */
export function getFirebaseAdmin(): admin.app.App {
  if (app) return app;

  const raw = loadServiceAccountJsonString();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      "[firebase] Service account JSON is invalid. If you pasted the key into .env, use one line only, " +
        "or set FIREBASE_SERVICE_ACCOUNT_PATH=./env/firebase-service-account.json and save the key in that file.",
    );
  }

  const firebaseProjectId =
    (typeof parsed.project_id === "string" && parsed.project_id) ||
    (typeof parsed.projectId === "string" && parsed.projectId);
  if (!firebaseProjectId) {
    throw new Error("[firebase] Service account JSON must include project_id.");
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(parsed as admin.ServiceAccount),
    projectId: firebaseProjectId,
  });
  return app;
}
