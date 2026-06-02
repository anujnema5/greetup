import { SettingsPage } from "@/features/settings/pages/settings-page";
import { createPageMetadata } from "@/lib/routing/page-metadata";

export const metadata = createPageMetadata(
  "Settings",
  "Security, privacy, and account preferences.",
);

export default SettingsPage;
