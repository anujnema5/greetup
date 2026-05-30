const CLIENT_SAFE_CHAT_ERRORS = new Set([
  'UNAUTHORIZED',
  'MESSAGING_BLOCKED',
  'NOT_FOUND',
]);

export function chatSocketErrorCode(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (CLIENT_SAFE_CHAT_ERRORS.has(msg)) return msg;
  return 'INTERNAL_ERROR';
}

export function isClientSafeChatError(code: string): boolean {
  return CLIENT_SAFE_CHAT_ERRORS.has(code);
}
