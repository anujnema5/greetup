import { Hono } from "hono";
import {
  handleFetchProfileSteps,
  handleGetMyProfile,
  handleGetOnboardingStatus,
  handleSaveProfileSetup,
  handleUpdateRoomInviteSettings,
} from "./controllers/profile-setup.controller";
import { handlePresignProfileImageUpload } from "./controllers/profile-image-upload.controller";
import { handleGetPublicProfile } from "./controllers/public-profile.controller";
import {
  handleGetMatchPrepCurrent,
  handleGetMatchPrepOptions,
  handleGetMatchPrepPromptStatus,
  handleSaveMatchPrep,
} from "./controllers/match-prep.controller";

export const profileRoute = new Hono();

/** PROFILE ROUTES */
profileRoute.get("/me", handleGetMyProfile);
profileRoute.get("/public/:username", handleGetPublicProfile);
profileRoute.put("/room-invite-settings", handleUpdateRoomInviteSettings);
profileRoute.get("/onboarding-status", handleGetOnboardingStatus);

/** PROFILE SETUP ROUTES */
profileRoute.get("/setup-steps", handleFetchProfileSteps);
profileRoute.get("/match-prep/current", handleGetMatchPrepCurrent);
profileRoute.get("/match-prep/options", handleGetMatchPrepOptions);
profileRoute.get("/match-prep/prompt-status", handleGetMatchPrepPromptStatus);
profileRoute.post("/match-prep", handleSaveMatchPrep);
profileRoute.post("/profile-setup", handleSaveProfileSetup);

/** Profile images — presigned PUT to DigitalOcean Spaces */
profileRoute.post("/photos/presign", handlePresignProfileImageUpload);