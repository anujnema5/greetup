/**
 * Auth-related HTTP helpers. Session normalization lives at `GET /api/auth/get-session`
 * (registered in `create-app.ts`). Better Auth handles all other `/api/auth/*` routes.
 */
export { handleGetSession } from "./controllers/auth-session.controller";
