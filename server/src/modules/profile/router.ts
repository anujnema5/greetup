import { Hono } from "hono";
import {
  handleFetchProfileSteps,
  handleGetMyProfile,
  handleGetOnboardingStatus,
  handleSaveProfileSetup,
  handleUpdateRoomInviteSettings,
} from "./controllers/profile-setup.controller";

export const profileRoute = new Hono();

/** PROFILE ROUTES */
profileRoute.get("/me", handleGetMyProfile);
profileRoute.put("/room-invite-settings", handleUpdateRoomInviteSettings);
profileRoute.get("/onboarding-status", handleGetOnboardingStatus);

/** PROFILE SETUP ROUTES */
profileRoute.get("/setup-steps", handleFetchProfileSteps);
profileRoute.post("/profile-setup", handleSaveProfileSetup);