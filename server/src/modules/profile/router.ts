import { Hono } from "hono";
import { handleFetchProfileSteps } from "./controllers/profile-setup.controller";

export const profileRoute = new Hono();

/** PROFILE SETUP ROUTES */
profileRoute.get('/setup-steps', handleFetchProfileSteps);