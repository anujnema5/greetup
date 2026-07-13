import type { SaveProfileSetupPayload } from "@/features/profile-setup/types/profile-setup-api.types";

import type { EditableProfile, ProfileEditSectionId } from "../types/profile-editor.types";

export function validateProfileSection(
  section: ProfileEditSectionId,
  d: EditableProfile
): string | null {
  if (section === "goals" && d.goalIds.length < 1) {
    return "Choose at least one goal.";
  }
  if (section === "interests" && d.interestIds.length < 1) {
    return "Choose at least one interest.";
  }
  if (section === "basics") {
    if (!d.displayName?.trim()) return "Display name is required.";
    const u = d.username?.trim().toLowerCase() ?? "";
    if (u.length < 3) return "Username must be at least 3 characters.";
    if (!/^[a-z0-9_]+$/.test(u)) return "Username can only use letters, numbers, and underscores.";
    if (!d.country?.code || !d.country?.name) return "Country is required.";
  }
  if (section === "prompts") {
    for (const answer of Object.values(d.promptAnswers)) {
      if (answer.trim().length > 0 && answer.trim().length < 10) {
        return "If you answer a prompt, add a few more words—or clear it to skip.";
      }
    }
  }
  return null;
}

export function buildProfileUsernamePayload(d: EditableProfile): SaveProfileSetupPayload {
  return {
    step: 7,
    data: { username: d.username.trim().toLowerCase() },
  };
}

export function buildProfileSavePayload(
  section: ProfileEditSectionId,
  d: EditableProfile
): SaveProfileSetupPayload {
  switch (section) {
    case "basics":
      return {
        step: 1,
        data: {
          displayName: d.displayName.trim(),
          age: d.age,
          gender: d.gender,
          country: { code: d.country.code, name: d.country.name },
        },
      };
    case "goals":
      return {
        step: 2,
        data: { goals: d.goalIds.map((id) => ({ id })) },
      };
    case "interests":
      return {
        step: 3,
        data: { interests: d.interestIds.map((id) => ({ id })) },
      };
    case "work":
      return {
        step: 4,
        data: {
          profession: d.professionId
            ? { id: d.professionId }
            : null,
        },
      };
    case "preferences": {
      const data: Extract<SaveProfileSetupPayload, { step: 5 }>["data"] = {};
      if (d.preferredGender) data.preferredGender = d.preferredGender;
      if (d.distancePreference) data.distancePreference = d.distancePreference;
      data.ageRange = { min: d.ageRange.min, max: d.ageRange.max };
      return { step: 5, data };
    }
    case "bio":
      return {
        step: 5,
        data: { bio: d.bio },
      };
    case "prompts":
      return {
        step: 6,
        data: {
          answers: Object.entries(d.promptAnswers)
            .filter(([, answer]) => answer.trim().length >= 10)
            .map(([questionId, answer]) => ({ questionId, answer: answer.trim() })),
        },
      };
  }
}
