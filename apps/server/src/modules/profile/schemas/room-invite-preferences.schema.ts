import { z } from "zod";

export const roomInviteSettingsBodySchema = z.object({
  policy: z.enum(["all_connections", "selected_only"]),
  /** Used when policy is `selected_only` (may be empty). Ignored for `all_connections`. */
  allowlistedUserIds: z.array(z.string().min(1)).max(200).default([]),
});
