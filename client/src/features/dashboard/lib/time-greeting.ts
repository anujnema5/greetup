import { DASHBOARD_GREETING_SUBTITLE } from "@/lib/copy/user-messages";

export { DASHBOARD_GREETING_SUBTITLE };

export function timeGreeting(): string {
  const h = new Date().getHours();
  // After midnight is still evening until early morning.
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}
