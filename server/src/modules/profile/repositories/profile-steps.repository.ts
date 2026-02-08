/**
 * Profile steps repository – fetches profile data and lookup options for onboarding steps.
 */

import { db } from "@/core/database";
import { eq } from "drizzle-orm";
import {
  interests,
  professions,
  goals,
  moods,
  lookingForOptions,
  connectionTypes,
} from "@/core/database/schema";

export const profileStepsRepository = {
  /**
   * Get profile with relations needed to pre-fill step values.
   */
  async getProfileForSteps(userId: string): Promise<ProfileForSteps | undefined> {
    const result = await db.query.userProfiles.findFirst({
      where: (p, { eq }) => eq(p.userId, userId),
      columns: {
        id: true,
        userId: true,
        purpose: true,
        bio: true,
        gender: true,
        age: true,
        profession: true,
        educationLevel: true,
        personalityTags: true,
        profileCompletion: true,
      },
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
        photos: {
          columns: {
            id: true,
            photoUrl: true,
            order: true,
            isVerified: true,
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
          with: {
            connectionTypes: {
              with: {
                connectionType: {
                  columns: {
                    id: true,
                    name: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return result as ProfileForSteps | undefined;
  },

  /**
   * Fetch all lookup options for profile steps (goals, interests, professions, moods, lookingFor, connectionTypes).
   */
  async fetchStepOptions() {
    const [goalsList, interestsList, professionsList, moodsList, lookingForList, connectionTypesList] =
      await Promise.all([
        db.query.goals.findMany({
          where: eq(goals.isActive, "yes"),
          columns: { id: true, name: true, displayName: true, description: true },
          orderBy: (g, { asc }) => [asc(g.displayName)],
        }),
        db.query.interests.findMany({
          where: eq(interests.isActive, "yes"),
          columns: { id: true, name: true, displayName: true, category: true },
          orderBy: (i, { asc }) => [asc(i.category), asc(i.displayName)],
        }),
        db.query.professions.findMany({
          where: eq(professions.isActive, "yes"),
          columns: { id: true, name: true, displayName: true, category: true },
          orderBy: (p, { asc }) => [asc(p.category), asc(p.displayName)],
        }),
        db.query.moods.findMany({
          columns: { id: true, name: true, displayName: true, description: true },
          orderBy: (m, { asc }) => [asc(m.displayName)],
        }),
        db.query.lookingForOptions.findMany({
          columns: { id: true, name: true, displayName: true, description: true },
          orderBy: (l, { asc }) => [asc(l.displayName)],
        }),
        db.query.connectionTypes.findMany({
          where: eq(connectionTypes.isActive, "yes"),
          columns: { id: true, name: true, displayName: true, description: true },
          orderBy: (c, { asc }) => [asc(c.displayName)],
        }),
      ]);

    return {
      goals: goalsList,
      interests: interestsList,
      professions: professionsList,
      moods: moodsList,
      lookingForOptions: lookingForList,
      connectionTypes: connectionTypesList,
    };
  },
};

/** Explicit type for profile with relations (Drizzle may not infer relations from merged schema). */
export interface ProfileForSteps {
  id: string;
  userId: string;
  purpose: string | null;
  bio: string | null;
  gender: string | null;
  age: number | null;
  profession: string | null;
  educationLevel: string | null;
  personalityTags: string | null;
  profileCompletion: number | null;
  user?: {
    id: string;
    displayName: string | null;
    name: string;
  } | null;
  location?: {
    country: string | null;
    countryCode: string | null;
    city: string | null;
    region: string | null;
  } | null;
  photos?: Array<{
    id: string;
    photoUrl: string;
    order: number | null;
    isVerified: boolean | null;
  }>;
  goals?: Array<{
    goal: {
      id: string;
      name: string;
      displayName: string;
      description: string | null;
    };
  }>;
  interests?: Array<{
    interest: {
      id: string;
      name: string;
      displayName: string;
      category: string;
    };
  }>;
  professions?: Array<{
    profession: {
      id: string;
      name: string;
      displayName: string;
      category: string;
    };
  }>;
  preferences?: {
    preferredGender: string | null;
    distancePreference: string | null;
    minAge: number | null;
    maxAge: number | null;
    connectionTypes?: Array<{
      connectionType: {
        id: string;
        name: string;
        displayName: string;
      };
    }>;
  } | null;
}

export type StepOptions = Awaited<
  ReturnType<typeof profileStepsRepository.fetchStepOptions>
>;
