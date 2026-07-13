import { ApiError } from '@/lib/api/fetch-client';

type ApiErrBody = {
  message?: string;
  code?: string;
  errors?: Array<{ field: string; messages: string[] }>;
};

/** Map POST /profile-setup body paths to react-hook-form names on the current step. */
export function mapSaveErrorFieldToFormName(field: string): string | null {
  if (field === 'step') return null;
  const prefix = 'data.';
  const normalized = field.startsWith(prefix) ? field.slice(prefix.length) : field;
  if (!normalized || normalized === 'data') return null;
  const top = normalized.includes('.') ? normalized.slice(0, normalized.indexOf('.')) : normalized;
  return top || null;
}

export function parseProfileSetupSaveError(error: unknown): {
  message: string;
  code?: string;
  fieldErrors: Array<{ name: string; message: string }>;
} {
  const fieldErrors: Array<{ name: string; message: string }> = [];
  let message = 'Something went wrong';
  let code: string | undefined;

  if (error instanceof ApiError) {
    try {
      const body = JSON.parse(error.body) as ApiErrBody;
      if (typeof body.message === 'string') message = body.message;
      if (typeof body.code === 'string') code = body.code;
      if (Array.isArray(body.errors)) {
        for (const e of body.errors) {
          if (!e?.field || !Array.isArray(e.messages) || e.messages.length === 0) continue;
          const name = mapSaveErrorFieldToFormName(e.field);
          if (!name) continue;
          fieldErrors.push({ name, message: e.messages[0]! });
        }
      }
    } catch {
      if (error.body.trim()) message = error.body.trim();
    }
  } else if (error instanceof Error && error.message) {
    message = error.message;
  }

  return { message, code, fieldErrors };
}
