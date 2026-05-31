import { DASHBOARD_GREETING_SUBTITLE } from "@/lib/copy/user-messages";

export { DASHBOARD_GREETING_SUBTITLE };

export function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
