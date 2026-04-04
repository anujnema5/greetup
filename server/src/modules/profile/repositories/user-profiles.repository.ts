import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { userProfiles } from "@/core/database/schema";

export const userProfilesRepository = {
  async getOnboardingStatus(userId: string): Promise<{ isOnboarded: boolean }> {
    const profile = await db.query.userProfiles.findFirst({
      where: (p, { eq: e }) => e(p.userId, userId),
      columns: { isOnboarded: true },
    });

    return {
      isOnboarded: profile?.isOnboarded ?? false,
    };
  },

  async findProfileSnapshotForCache(userId: string) {
    return db.query.userProfiles.findFirst({
      where: (profile, { eq: e }) => e(profile.userId, userId),
      with: {
        user: {
          columns: {
            id: true,
            displayName: true,
            name: true,
          },
        },
        location: {
          columns: {
            country: true,
            countryCode: true,
            city: true,
            region: true,
          },
        },
        goals: {
          with: {
            goal: {
              columns: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
        interests: {
          with: {
            interest: {
              columns: {
                id: true,
                name: true,
                displayName: true,
                category: true,
              },
            },
          },
        },
        professions: {
          with: {
            profession: {
              columns: {
                id: true,
                name: true,
                displayName: true,
                category: true,
              },
            },
          },
        },
        preferences: {
          columns: {
            preferredGender: true,
            distancePreference: true,
            minAge: true,
            maxAge: true,
          },
        },
        behavior: {
          columns: {
            reportCount: true,
            trustScore: true,
            successfulConnections: true,
            averageSessionDuration: true,
          },
        },
      },
    });
  },

  async findPremiumFieldsByUserId(userId: string) {
    return db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
      columns: {
        isPremium: true,
        premiumExpiresAt: true,
      },
    });
  },
};
