/**
 * DATABASE SCHEMA - MAIN EXPORT
 */

// Core schemas
export * from "./users";
export * from "./auth";
// Goals: export isActiveEnum once (reused by interests & professions)
export {
  goals,
  profileGoals,
  goalsRelations,
  profileGoalsRelations,
  userProfilesGoalsRelations,
  isActiveEnum,
} from "./goals";
export {
  interests,
  profileInterests,
  interestsRelations,
  userProfilesInterestsRelations,
  profileInterestsRelations,
} from "./interests";
export {
  professions,
  profileProfessions,
  professionsRelations,
  userProfilesRelationsProfessions,
  profileProfessionsRelations,
} from "./professions";
export * from "./current-status";
export * from "./match-prep-session";
export * from "./preferences";
export * from "./behavior";
export * from "./connections";
export * from "./blocks";
export * from "./rooms";
export * from "./room-embedded-activities";
export * from "./notifications";
export * from "./chat";
export * from "./prompts";