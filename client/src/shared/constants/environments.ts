export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
/** rtc-service Socket.IO + mediasoup (browser must reach this URL) */
export const RTC_SOCKET_URL =
  process.env.NEXT_PUBLIC_RTC_SOCKET_URL ?? "http://localhost:5070";
/** App URL for OAuth callbacks - must be NEXT_PUBLIC_ so it's available in the browser */
export const CURRENT_HOST =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.CURRENT_HOST ?? "http://localhost:3000";