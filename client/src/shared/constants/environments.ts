export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
/** App URL for OAuth callbacks - must be NEXT_PUBLIC_ so it's available in the browser */
export const CURRENT_HOST =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.CURRENT_HOST ?? "http://localhost:3000";