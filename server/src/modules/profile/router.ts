import { Hono } from "hono";
import {
  handleFetchProfileSteps,
  handleGetOnboardingStatus,
  handleSaveProfileSetup,
} from "./controllers/profile-setup.controller";

export const profileRoute = new Hono();

/** PROFILE ROUTES */
profileRoute.get("/onboarding-status", handleGetOnboardingStatus);

/** PROFILE SETUP ROUTES */
profileRoute.get("/setup-steps", handleFetchProfileSteps);
profileRoute.post("/profile-setup", handleSaveProfileSetup);