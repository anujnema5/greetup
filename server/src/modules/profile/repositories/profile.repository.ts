// import { db } from "@/core/database";
// import { users, userProfiles, userLocations } from '@/core/database/schema/users';
// import {
//     profileLanguages,
//     profileInterests,
//     profileMoods,
//     profileMusicGenres,
//     profilePersonalityTraits,
// } from "@/core/database/schema/profile-attributes.schema";
// import {
//     matchingPreferences,
//     engagementPreferences,
//     profileConversationBoundaries,
//     profileLookingFor,
// } from "@/core/database/schema/preferences.schema";
// import { eq } from "drizzle-orm";

// export const profileRepository = {
//     // Get full profile with all relations
//     getProfile(userId: string) {
//         return db.query.userProfiles.findFirst({
//             where: (p, { eq }) => eq(p.userId, userId),
//             with: {
//                 user: true,
//                 location: {
//                     columns: {
//                         country: true,
//                         countryCode: true
//                     }
//                 },
//                 languages: {
//                     with: {
//                         language: true,
//                     }
//                 },
//                 interests: {
//                     with: {
//                         interest: true,
//                     }
//                 },
//                 moods: {
//                     with: {
//                         mood: true,
//                     }
//                 },
//                 musicGenres: {
//                     with: {
//                         genre: true,
//                     }
//                 },
//                 personalityTraits: {
//                     with: {
//                         trait: true,
//                     }
//                 },
//                 photos: true,
//                 engagementPreference: true,
//                 matchingPreference: true,
//                 conversationBoundary: {
//                     with: {
//                         boundary: true,
//                     }
//                 },
//                 lookingFor: {
//                     with: {
//                         lookingForOption: true,
//                     }
//                 },
//             },
//         });
//     },

//     // Fetch all available options for profile setup
//     async fetchProfileOptions() {
//         const [
//             languages,
//             interests,
//             moods,
//             musicGenres,
//             personalityTraits,
//             lookingForOptions
//         ] = await Promise.all([
//             db.query.languages.findMany({
//                 orderBy: (l, { asc }) => [asc(l.name)],
//             }),
//             db.query.interests.findMany({
//                 orderBy: (i, { asc }) => [asc(i.category), asc(i.interest)],
//             }),
//             db.query.moodTags.findMany({
//                 orderBy: (m, { asc }) => [asc(m.name)],
//             }),
//             db.query.musicGenres.findMany({
//                 orderBy: (g, { asc }) => [asc(g.name)],
//             }),
//             db.query.personalityTraits.findMany({
//                 orderBy: (t, { asc }) => [asc(t.category), asc(t.name)],
//             }),
//             db.query.lookingForOptions.findMany({
//                 orderBy: (lf, { asc }) => [asc(lf.option)],
//             }),
//         ]);

//         return {
//             languages,
//             interests,
//             moods,
//             musicGenres,
//             personalityTraits,
//             lookingForOptions,
//         };
//     },

//     // Update user display name
//     async updateUserDisplayName(userId: string, displayName: string) {
//         return db.update(users)
//             .set({ displayName })
//             .where(eq(users.id, userId));
//     },

//     // Update basic profile fields
//     async updateBasicProfile(profileId: string, data: any) {
//         return db.update(userProfiles)
//             .set(data)
//             .where(eq(userProfiles.id, profileId));
//     },

//     // Location operations
//     async findLocation(profileId: string) {
//         return db.query.userLocations.findFirst({
//             where: (loc, { eq }) => eq(loc.profileId, profileId),
//         });
//     },

//     async updateLocation(profileId: string, data: { country: string; countryCode: string }) {
//         return db.update(userLocations)
//             .set(data)
//             .where(eq(userLocations.profileId, profileId));
//     },

//     async createLocation(profileId: string, data: { country: string; countryCode: string }) {
//         return db.insert(userLocations).values({
//             id: crypto.randomUUID(),
//             profileId,
//             ...data,
//         });
//     },

//     // Language operations
//     async deleteLanguages(profileId: string) {
//         return db.delete(profileLanguages)
//             .where(eq(profileLanguages.profileId, profileId));
//     },

//     async createLanguages(profileId: string, languages: any[], primaryLanguageId: string) {
//         return db.insert(profileLanguages).values(
//             languages.map((lang: any) => ({
//                 id: crypto.randomUUID(),
//                 profileId,
//                 languageId: lang.id,
//                 isPrimary: lang.id === primaryLanguageId,
//                 isPreferredForConversation: lang.isPreferredForConversation ?? false,
//             }))
//         );
//     },

//     // Interest operations
//     async deleteInterests(profileId: string) {
//         return db.delete(profileInterests)
//             .where(eq(profileInterests.profileId, profileId));
//     },

//     async createInterests(profileId: string, interests: any[]) {
//         return db.insert(profileInterests).values(
//             interests.map((interest: any) => ({
//                 id: crypto.randomUUID(),
//                 profileId,
//                 interestId: interest.id,
//             }))
//         );
//     },

//     // Mood operations
//     async deleteMoods(profileId: string) {
//         return db.delete(profileMoods)
//             .where(eq(profileMoods.profileId, profileId));
//     },

//     async createMoods(profileId: string, moods: any[]) {
//         return db.insert(profileMoods).values(
//             moods.map((mood: any) => ({
//                 id: crypto.randomUUID(),
//                 profileId,
//                 moodId: mood.id,
//                 isActive: true,
//             }))
//         );
//     },

//     // Music genre operations
//     async deleteMusicGenres(profileId: string) {
//         return db.delete(profileMusicGenres)
//             .where(eq(profileMusicGenres.profileId, profileId));
//     },

//     async createMusicGenres(profileId: string, genres: any[]) {
//         return db.insert(profileMusicGenres).values(
//             genres.map((genre: any) => ({
//                 id: crypto.randomUUID(),
//                 profileId,
//                 genreId: genre.id,
//             }))
//         );
//     },

//     // Personality traits operations
//     async deletePersonalityTraits(profileId: string) {
//         return db.delete(profilePersonalityTraits)
//             .where(eq(profilePersonalityTraits.profileId, profileId));
//     },

//     async createPersonalityTraits(profileId: string, traits: any[]) {
//         return db.insert(profilePersonalityTraits).values(
//             traits.map((trait: any) => ({
//                 id: crypto.randomUUID(),
//                 profileId,
//                 traitId: trait.id,
//             }))
//         );
//     },

//     // Matching preference operations
//     async findMatchingPreference(profileId: string) {
//         return db.query.matchingPreferences.findFirst({
//             where: (pref, { eq }) => eq(pref.profileId, profileId),
//         });
//     },

//     async updateMatchingPreference(profileId: string, data: any) {
//         return db.update(matchingPreferences)
//             .set(data)
//             .where(eq(matchingPreferences.profileId, profileId));
//     },

//     async createMatchingPreference(profileId: string, data: any) {
//         return db.insert(matchingPreferences).values({
//             id: crypto.randomUUID(),
//             profileId,
//             ...data,
//         });
//     },

//     // Looking for operations
//     async deleteLookingFor(profileId: string) {
//         return db.delete(profileLookingFor)
//             .where(eq(profileLookingFor.profileId, profileId));
//     },

//     async createLookingFor(profileId: string, lookingFor: any[]) {
//         return db.insert(profileLookingFor).values(
//             lookingFor.map((lf: any, index: number) => ({
//                 id: crypto.randomUUID(),
//                 profileId,
//                 lookingForId: lf.id,
//                 isPrimary: lf.isPrimary ?? index === 0,
//             }))
//         );
//     },

//     // Engagement preference operations
//     async findEngagementPreference(profileId: string) {
//         return db.query.engagementPreferences.findFirst({
//             where: (pref, { eq }) => eq(pref.profileId, profileId),
//         });
//     },

//     async updateEngagementPreference(profileId: string, data: any) {
//         return db.update(engagementPreferences)
//             .set(data)
//             .where(eq(engagementPreferences.profileId, profileId));
//     },

//     async createEngagementPreference(profileId: string, data: any) {
//         return db.insert(engagementPreferences).values({
//             id: crypto.randomUUID(),
//             profileId,
//             ...data,
//         });
//     },
// };

// export type Profile = Awaited<ReturnType<typeof profileRepository.getProfile>>;
// export type ProfileOptions = Awaited<ReturnType<typeof profileRepository.fetchProfileOptions>>;