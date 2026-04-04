import type { EditableProfile } from "../types/profile-editor.types";

export const INITIAL_EDITABLE_PROFILE: EditableProfile = {
  displayName: "Anuj N.",
  age: 28,
  gender: "male",
  country: { code: "IND", name: "India" },
  goalIds: ["g1", "g3"],
  interestIds: ["i1", "i2", "i5"],
  professionId: "p2",
  bio: "Building cool stuff on the internet. Into deep conversations, indie music, and finding people who get it.",
  preferredGender: "any",
  distancePreference: "same country",
  ageRange: { min: 22, max: 35 },
  /** Single profile image for avatar; optional when wiring APIs */
  photos: [
    { id: "ph1", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop" },
  ],
};

export const MOCK_GOALS = [
  { id: "g1", label: "Meet people", emoji: "✨" },
  { id: "g2", label: "Deep talks", emoji: "💬" },
  { id: "g3", label: "Networking", emoji: "🤝" },
  { id: "g4", label: "Fun & games", emoji: "🎮" },
  { id: "g5", label: "Creative collabs", emoji: "🎨" },
] as const;

export const MOCK_INTERESTS = [
  { id: "i1", label: "Startups", category: "Work" },
  { id: "i2", label: "Design", category: "Creative" },
  { id: "i3", label: "Indie music", category: "Music" },
  { id: "i4", label: "AI & ML", category: "Tech" },
  { id: "i5", label: "Travel", category: "Life" },
  { id: "i6", label: "Coffee", category: "Life" },
  { id: "i7", label: "Photography", category: "Creative" },
] as const;

export const MOCK_PROFESSIONS = [
  { id: "p1", label: "Designer" },
  { id: "p2", label: "Engineer" },
  { id: "p3", label: "Founder" },
  { id: "p4", label: "Student" },
  { id: "p5", label: "Other" },
] as const;
