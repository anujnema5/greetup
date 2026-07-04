import { Hono } from "hono";
import {
  handleFetchProfileSteps,
  handleGetMyProfile,
  handleSaveProfileSetup,
  handleUpdateRoomInviteSettings,
} from "./controllers/profile-setup.controller";
import { handleGetProfileInsights } from "./controllers/profile-insights.controller";
import {
  handleEnsureProfilePhotoPublic,
  handlePresignProfileImageUpload,
} from "./controllers/profile-image-upload.controller";
import { handleGetPublicProfile } from "./controllers/public-profile.controller";
import {
  handleGetMatchPrepCurrent,
  handleGetMatchPrepOptions,
  handleGetMatchPrepPromptStatus,
  handleSaveMatchPrep,
} from "./controllers/match-prep.controller";
import {
  handleGeocodeLocation,
  handleGeocodeLocationSuggestions,
  handleReverseGeocodeLocation,
} from "./controllers/location-geocode.controller";
import {
  handleGetWelcomeTourStatus,
  handleMarkWelcomeTourSeen,
} from "./controllers/welcome-tour.controller";
import {
  handleCheckUsername,
  handleSuggestUsernames,
} from "./controllers/username.controller";

export const profileRoute = new Hono();

/** PROFILE ROUTES */
profileRoute.get("/me", handleGetMyProfile);
profileRoute.get("/me/insights", handleGetProfileInsights);
profileRoute.get("/public/:username", handleGetPublicProfile);
profileRoute.put("/room-invite-settings", handleUpdateRoomInviteSettings);
profileRoute.get("/welcome-tour-status", handleGetWelcomeTourStatus);
profileRoute.post("/welcome-tour-seen", handleMarkWelcomeTourSeen);

/** PROFILE SETUP ROUTES */
profileRoute.get("/setup-steps", handleFetchProfileSteps);
profileRoute.get("/username/check", handleCheckUsername);
profileRoute.get("/username/suggestions", handleSuggestUsernames);
profileRoute.get("/match-prep/current", handleGetMatchPrepCurrent);
profileRoute.get("/match-prep/options", handleGetMatchPrepOptions);
profileRoute.get("/match-prep/prompt-status", handleGetMatchPrepPromptStatus);
profileRoute.get("/location/suggestions", handleGeocodeLocationSuggestions);
profileRoute.post("/location/geocode", handleGeocodeLocation);
profileRoute.post("/location/reverse-geocode", handleReverseGeocodeLocation);
profileRoute.post("/match-prep", handleSaveMatchPrep);
profileRoute.post("/profile-setup", handleSaveProfileSetup);

/** Profile images — presigned PUT to DigitalOcean Spaces */
profileRoute.post("/photos/presign", handlePresignProfileImageUpload);
profileRoute.post("/photos/ensure-public", handleEnsureProfilePhotoPublic);