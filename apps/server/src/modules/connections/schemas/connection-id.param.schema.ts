import { z } from "zod";

export const connectionIdParamSchema = z.object({
  connectionId: z.string().uuid(),
});

export type ConnectionIdParam = z.infer<typeof connectionIdParamSchema>;
