/**
 * Seeds 12 dev users (email/password + profiles + junction rows + user_connections).
 * Run after: bun run db:seed (lookup tables must exist).
 *
 * Usage: bun run db:seed:dev-users
 */

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { inArray } from "drizzle-orm";
import { db } from "@/core/database";
import {
  account,
  users,
  userProfiles,
  behavior,
  goals,
  interests,
  professions,
  profileGoals,
  profileInterests,
  profileProfessions,
  profilePreferences,
  userConnections,
} from "@/core/database/schema";

const DEV_EMAIL_DOMAIN = "circlo.local";
const DEV_PASSWORD = "CircloSeed2026!";

/** Row order matches dev-users.credentials.csv */
const SEED_USERS = [
  { email: `seed01@${DEV_EMAIL_DOMAIN}`, name: "Riley", displayName: "Seed Riley", username: "seed_riley" },
  { email: `seed02@${DEV_EMAIL_DOMAIN}`, name: "Morgan", displayName: "Seed Morgan", username: "seed_morgan" },
  { email: `seed03@${DEV_EMAIL_DOMAIN}`, name: "Avery", displayName: "Seed Avery", username: "seed_avery" },
  { email: `seed04@${DEV_EMAIL_DOMAIN}`, name: "Jordan", displayName: "Seed Jordan", username: "seed_jordan" },
  { email: `seed05@${DEV_EMAIL_DOMAIN}`, name: "Casey", displayName: "Seed Casey", username: "seed_casey" },
  { email: `seed06@${DEV_EMAIL_DOMAIN}`, name: "Quinn", displayName: "Seed Quinn", username: "seed_quinn" },
  { email: `seed07@${DEV_EMAIL_DOMAIN}`, name: "Skyler", displayName: "Seed Skyler", username: "seed_skyler" },
  { email: `seed08@${DEV_EMAIL_DOMAIN}`, name: "Reese", displayName: "Seed Reese", username: "seed_reese" },
  { email: `seed09@${DEV_EMAIL_DOMAIN}`, name: "Drew", displayName: "Seed Drew", username: "seed_drew" },
  { email: `seed10@${DEV_EMAIL_DOMAIN}`, name: "Jamie", displayName: "Seed Jamie", username: "seed_jamie" },
  { email: `seed11@${DEV_EMAIL_DOMAIN}`, name: "Taylor", displayName: "Seed Taylor", username: "seed_taylor" },
  { email: `seed12@${DEV_EMAIL_DOMAIN}`, name: "Cameron", displayName: "Seed Cameron", username: "seed_cameron" },
] as const;

const BIOS = [
  "Building things, breaking things, fixing things.",
  "Here for good chats and bad coffee.",
  "Runner. Reader. Weekend chef.",
  "Design by day, playlists by night.",
  "Ask me about cities I've gotten lost in.",
  "Learning something new every week.",
  "Quiet until you get me talking.",
  "Startup hours, farmer's market weekends.",
  "Film buff, terrible at spoilers.",
  "Gym, then noodles. Always noodles.",
  "Remote work, loud music.",
  "Here to meet interesting people.",
];

const GENDERS = ["male", "female", "non_binary", "prefer_not_say"] as const;
const EDUCATION = ["bachelors", "masters", "some_college", "phd"] as const;
const PURPOSES = ["make_friends", "networking", "casual_chat", "share_ideas"] as const;

type ConnectionSeed = {
  requesterIdx: number;
  addresseeIdx: number;
  status: "pending" | "accepted" | "rejected" | "cancelled";
};

/** Indices refer to SEED_USERS order (0..11). */
const CONNECTION_SEEDS: ConnectionSeed[] = [
  { requesterIdx: 0, addresseeIdx: 1, status: "accepted" },
  { requesterIdx: 1, addresseeIdx: 2, status: "accepted" },
  { requesterIdx: 0, addresseeIdx: 2, status: "accepted" },
  { requesterIdx: 3, addresseeIdx: 0, status: "accepted" },
  { requesterIdx: 4, addresseeIdx: 5, status: "accepted" },
  { requesterIdx: 6, addresseeIdx: 7, status: "accepted" },
  { requesterIdx: 8, addresseeIdx: 9, status: "accepted" },
  { requesterIdx: 10, addresseeIdx: 11, status: "accepted" },
  { requesterIdx: 5, addresseeIdx: 6, status: "accepted" },
  { requesterIdx: 7, addresseeIdx: 8, status: "accepted" },
  { requesterIdx: 2, addresseeIdx: 3, status: "pending" },
  { requesterIdx: 4, addresseeIdx: 6, status: "pending" },
  { requesterIdx: 9, addresseeIdx: 10, status: "pending" },
  { requesterIdx: 11, addresseeIdx: 0, status: "rejected" },
];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

async function removeExistingDevUsers() {
  const emails = SEED_USERS.map((u) => u.email);
  await db.delete(users).where(inArray(users.email, emails));
}

async function seed() {
  console.log("🌱 Seeding dev users (12) + profiles + connections...");

  await removeExistingDevUsers();

  const passwordHash = await hashPassword(DEV_PASSWORD);

  const rows: {
    userId: string;
    accountId: string;
    email: string;
    name: string;
    displayName: string;
    username: string;
  }[] = [];

  for (const u of SEED_USERS) {
    const userId = randomUUID();
    rows.push({
      userId,
      accountId: randomUUID(),
      email: u.email,
      name: u.name,
      displayName: u.displayName,
      username: u.username,
    });
  }

  await db.insert(users).values(
    rows.map((r, i) => ({
      id: r.userId,
      name: r.name,
      email: r.email,
      emailVerified: true,
      displayName: r.displayName,
      username: r.username,
      image: null,
      phoneNumber: null,
      phoneNumberVerified: null,
      isBanned: "no" as const,
    })),
  );

  await db.insert(account).values(
    rows.map((r) => ({
      id: r.accountId,
      userId: r.userId,
      accountId: r.userId,
      providerId: "credential",
      password: passwordHash,
    })),
  );

  const goalRows = await db.select({ id: goals.id, name: goals.name }).from(goals);
  const interestRows = await db.select({ id: interests.id, name: interests.name }).from(interests);
  const professionRows = await db
    .select({ id: professions.id, name: professions.name })
    .from(professions);

  if (goalRows.length === 0 || interestRows.length === 0 || professionRows.length === 0) {
    throw new Error(
      "Lookup tables empty. Run `bun run db:seed` first so goals, interests, and professions exist.",
    );
  }

  const goalByName = new Map(goalRows.map((g) => [g.name, g.id]));
  const interestByName = new Map(interestRows.map((x) => [x.name, x.id]));
  const professionByName = new Map(professionRows.map((p) => [p.name, p.id]));

  const insertedProfiles = await db
    .insert(userProfiles)
    .values(
      rows.map((r, i) => ({
        userId: r.userId,
        purpose: pick(PURPOSES, i),
        bio: BIOS[i] ?? BIOS[0],
        gender: pick(GENDERS, i),
        age: 22 + ((i * 3) % 18),
        profession: pick(
          ["software_engineer", "designer", "student", "marketing", "writer", "teacher"],
          i,
        ),
        educationLevel: pick(EDUCATION, i),
        personalityTags: ["curious", "friendly", "direct"].slice(0, (i % 3) + 1).join(","),
        profileCompletion: 55 + (i * 3) % 40,
        trustScore: 70 + (i * 7) % 25,
        isOnboarded: true,
      })),
    )
    .returning({ id: userProfiles.id, userId: userProfiles.userId });

  const profileIdByUserId = new Map(insertedProfiles.map((p) => [p.userId, p.id]));

  for (const p of insertedProfiles) {
    await db.insert(behavior).values({
      userProfileId: p.id,
      reportCount: 0,
      trustScore: 80 + (p.id.charCodeAt(0) % 15),
      successfulConnections: (p.id.charCodeAt(2) ?? 0) % 12,
      averageSessionDuration: 300 + ((p.id.charCodeAt(4) ?? 0) % 1200),
    });

    await db.insert(profilePreferences).values({
      profileId: p.id,
    });
  }

  for (let i = 0; i < rows.length; i++) {
    const profileId = profileIdByUserId.get(rows[i]!.userId);
    if (!profileId) continue;

    const g1 = goalByName.get(pick(["make_friends", "networking", "casual_chat"], i));
    const g2 = goalByName.get(pick(["dating", "share_ideas", "practice_language"], i));
    const goalIds = [...new Set([g1, g2].filter(Boolean))] as string[];
    if (goalIds.length) {
      await db.insert(profileGoals).values(
        goalIds.map((goalId) => ({ profileId, goalId })),
      );
    }

    const i1 = interestByName.get(pick(["music", "gaming", "travel"], i));
    const i2 = interestByName.get(pick(["technology", "fitness", "reading"], i));
    const i3 = interestByName.get(pick(["movies", "cooking", "photography"], i));
    const interestIds = [...new Set([i1, i2, i3].filter(Boolean))] as string[];
    if (interestIds.length) {
      await db.insert(profileInterests).values(
        interestIds.map((interestId) => ({ profileId, interestId })),
      );
    }

    const profId = professionByName.get(
      pick(
        ["software_engineer", "designer", "student", "teacher", "marketing", "writer"],
        i,
      ),
    );
    if (profId) {
      await db.insert(profileProfessions).values({ profileId, professionId: profId });
    }
  }

  const userIdByIdx = rows.map((r) => r.userId);

  await db.insert(userConnections).values(
    CONNECTION_SEEDS.map((c) => ({
      requesterId: userIdByIdx[c.requesterIdx]!,
      addresseeId: userIdByIdx[c.addresseeIdx]!,
      status: c.status,
    })),
  );

  console.log("✅ Dev users seeded.");
  console.log("   Password (all):", DEV_PASSWORD);
  console.log(
    "   User IDs:",
    rows.map((r) => `${r.email} → ${r.userId}`).join("\n   "),
  );
  console.log("   Connections:", CONNECTION_SEEDS.length, "rows (accepted / pending / rejected).");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Dev user seed failed:", err);
    process.exit(1);
  });
