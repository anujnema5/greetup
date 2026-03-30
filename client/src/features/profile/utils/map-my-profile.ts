import { countries } from "country-data-list";

import type { Country } from "@/components/ui/country-dropdown";
import type { MyProfileData } from "@/features/profile-setup/types/profile-setup-api.types";

import type { EditableProfile, ProfileGender } from "../types/profile-editor.types";

const COUNTRY_OPTIONS = countries.all.filter(
  (c: Country) => c.emoji && c.status !== "deleted" && c.ioc !== "PRK"
);

function normalizeGender(g: string | null | undefined): ProfileGender {
  if (g === "male" || g === "female" || g === "other") return g;
  return "other";
}

function normalizePreferredGender(
  v: string | null | undefined
): EditableProfile["preferredGender"] {
  if (v === "any" || v === "male" || v === "female" || v === "others" || v === "same") return v;
  return "any";
}

function normalizeDistance(
  v: string | null | undefined
): EditableProfile["distancePreference"] {
  const allowed: EditableProfile["distancePreference"][] = [
    "nearby",
    "same city",
    "same country",
    "random",
    "global",
  ];
  if (v && allowed.includes(v as EditableProfile["distancePreference"])) {
    return v as EditableProfile["distancePreference"];
  }
  return "same country";
}

function resolveCountry(code: string | null | undefined, name: string | null | undefined) {
  if (!code && !name) {
    return { code: "IND", name: "India" };
  }
  const hit = COUNTRY_OPTIONS.find(
    (c) => c.alpha3 === code || c.alpha2 === code || c.name === name
  );
  if (hit) {
    return { code: hit.alpha3, name: hit.name };
  }
  return { code: code || "IND", name: name || "" };
}

export function mapMyProfileToEditable(api: MyProfileData): EditableProfile {
  const loc = api.location;
  const country = resolveCountry(loc?.countryCode ?? undefined, loc?.country ?? undefined);

  const prefs = api.preferences;

  return {
    displayName: api.displayName?.trim() || "Member",
    age: api.age != null ? Math.min(99, Math.max(18, api.age)) : 25,
    gender: normalizeGender(api.gender),
    country,
    goalIds: api.goals.map((g) => g.id),
    interestIds: api.interests.map((i) => i.id),
    professionId: api.profession?.id ?? null,
    bio: api.bio?.trim() ?? "",
    preferredGender: normalizePreferredGender(prefs?.preferredGender),
    distancePreference: normalizeDistance(prefs?.distancePreference),
    ageRange: {
      min: prefs?.minAge != null ? Math.max(18, prefs.minAge) : 18,
      max: prefs?.maxAge != null ? Math.min(99, prefs.maxAge) : 99,
    },
    connectionTypeIds: prefs?.connectionTypes.map((c) => c.id) ?? [],
    photos: api.photos.length
      ? api.photos.slice(0, 1).map((p) => ({ id: p.id, url: p.url }))
      : [],
  };
}
