import { API_ORIGIN } from "@/shared/constants/environments";

export function ApiPreconnect() {
  if (process.env.NODE_ENV !== "production" || API_ORIGIN.includes("localhost")) {
    return null;
  }

  return <link rel="preconnect" href={API_ORIGIN} crossOrigin="anonymous" />;
}
