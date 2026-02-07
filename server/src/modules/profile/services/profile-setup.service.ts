// import { CACHE_TTL, getRedis, REDIS_KEYS } from "@/core/redis";
// import { Profile, ProfileOptions, profileRepository } from "../repositories/profile.repository";
// import { FormStep, ProfileSetupData } from "../types";
// import logger from "@/core/logging";
// import { db } from "@/core/database";

// // Generate profile setup steps with options
// export const generateProfileSetupSteps = (profile: Profile, options: ProfileOptions): FormStep[] => {
//     const steps: FormStep[] = [
//         /* STEP 1 – Basic Identity */
//         {
//             step: 1,
//             title: "Tell us about you",
//             fields: [
//                 {
//                     key: "displayName",
//                     name: "displayName",
//                     label: "Display name",
//                     placeholder: "Enter your name",
//                     type: "text",
//                     required: true,
//                     value: profile?.user ?? null,
//                 },
//                 {
//                     key: "age",
//                     name: "age",
//                     label: "Age",
//                     placeholder: "Enter your age",
//                     type: "number",
//                     required: true,
//                     min: 18,
//                     max: 60,
//                     value: profile?.age ?? null,
//                 },
//                 {
//                     key: "gender",
//                     name: "gender",
//                     label: "Gender",
//                     placeholder: "Select gender",
//                     type: "select",
//                     required: true,
//                     options: ["male", "female", "other"],
//                     value: profile?.gender ?? null,
//                 },
//                 {
//                     key: "country",
//                     name: "country",
//                     label: "Country",
//                     placeholder: "Select your country",
//                     type: "country-select",
//                     required: true,
//                     value: profile?.location?.countryCode && profile?.location?.country ? {
//                         code: profile.location.countryCode,
//                         name: profile.location.country,
//                     } : null,
//                 },
//             ],
//         },
//         /* STEP 2 – Language & Communication */
//         {
//             step: 2,
//             title: "Language & communication",
//             fields: [
//                 {
//                     key: "languages",
//                     name: "languages",
//                     label: "Languages you speak",
//                     placeholder: "Select languages",
//                     type: "multi-select",
//                     required: true,
//                     options: options.languages, // ✅ Options from DB
//                     value: profile?.languages?.map((lang) => ({
//                         id: lang.language.id,
//                         name: lang.language.name,
//                         code: lang.language.code,
//                         isPrimary: lang.isPrimary,
//                         isPreferredForConversation: lang.isPreferredForConversation,
//                     })) ?? [],
//                 },
//                 {
//                     key: "primaryLanguage",
//                     name: "primaryLanguage",
//                     label: "Primary language",
//                     placeholder: "Select primary language",
//                     type: "select",
//                     required: true,
//                     options: options.languages, // ✅ Options from DB
//                     value: profile?.languages?.find((lang) => lang.isPrimary)?.language.id ?? null,
//                 },
//             ],
//         },
//         /* STEP 3 – Interests */
//         {
//             step: 3,
//             title: "Your interests",
//             fields: [
//                 {
//                     key: "interests",
//                     name: "interests",
//                     label: "Interests",
//                     placeholder: "Select your interests",
//                     type: "multi-select",
//                     max: 7,
//                     options: options.interests, // ✅ Options from DB
//                     value: profile?.interests?.map((int) => ({
//                         id: int.interest.id,
//                         interest: int.interest.interest,
//                         category: int.interest.category,
//                     })) ?? [],
//                 },
//                 {
//                     key: "musicGenres",
//                     name: "musicGenres",
//                     label: "Music genres",
//                     placeholder: "Select music genres",
//                     type: "multi-select",
//                     max: 5,
//                     options: options.musicGenres, // ✅ Options from DB
//                     value: profile?.musicGenres?.map((genre) => ({
//                         id: genre.genre.id,
//                         name: genre.genre.name,
//                     })) ?? [],
//                 },
//             ],
//         },
//         /* STEP 4 – Mood & Intent */
//         {
//             step: 4,
//             title: "Mood & intent",
//             optional: true,
//             fields: [
//                 {
//                     key: "personalityTraits",
//                     name: "personalityTraits",
//                     label: "Personality traits",
//                     placeholder: "Select personality traits",
//                     type: "multi-select",
//                     max: 5,
//                     options: options.personalityTraits, // ✅ Options from DB
//                     value: profile?.personalityTraits?.map((trait) => ({
//                         id: trait.trait.id,
//                         name: trait.trait.name,
//                         category: trait.trait.category,
//                     })) ?? [],
//                 },
//                 {
//                     key: "dateMode",
//                     name: "dateMode",
//                     label: "Dating mode",
//                     type: "toggle",
//                     value: profile?.dateMode ?? false,
//                 },
//                 {
//                     key: "lookingFor",
//                     name: "lookingFor",
//                     label: "What are you looking for?",
//                     placeholder: "e.g. friendship, dating, just chill",
//                     type: "multi-select",
//                     required: false,
//                     options: options.lookingForOptions,
//                     value: profile?.lookingFor?.map((lf) => ({
//                         id: lf.lookingForOption.id,
//                         option: lf.lookingForOption.option,
//                         isPrimary: lf.isPrimary,
//                     })) ?? [],
//                 },
//                 {
//                     key: "genderPreference",
//                     name: "genderPreference",
//                     label: "Gender preference",
//                     placeholder: "Select gender preference",
//                     type: "select",
//                     required: false,
//                     options: ["male", "female", "any"],
//                     value: profile?.matchingPreference?.genderPreference ?? null,
//                 },
//                 {
//                     key: "ageRange",
//                     name: "ageRange",
//                     label: "Age preference",
//                     type: "range",
//                     min: 18,
//                     max: 60,
//                     value: {
//                         min: profile?.matchingPreference?.minAge ?? 18,
//                         max: profile?.matchingPreference?.maxAge ?? 60,
//                     },
//                 },
//                 {
//                     key: "conversationBoundary",
//                     name: "conversationBoundary",
//                     label: "Conversation style",
//                     placeholder: "Select conversation style",
//                     type: "select",
//                     required: false,
//                     options: ["clean", "casual", "flirty"],
//                     value: profile?.conversationBoundary?.boundary?.level ?? "casual",
//                 },
//             ],
//         },
//         /* STEP 5 – Bio & Photos */
//         {
//             step: 5,
//             title: "Complete your profile",
//             fields: [
//                 {
//                     key: "bio",
//                     name: "bio",
//                     label: "Bio",
//                     placeholder: "Tell us something about yourself",
//                     type: "textarea",
//                     maxLength: 150,
//                     value: profile?.bio ?? null,
//                 },
//                 {
//                     key: "photos",
//                     name: "photos",
//                     label: "Profile photos",
//                     type: "photo-upload",
//                     max: 6,
//                     value: profile?.photos
//                         ?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
//                         .map((photo) => ({
//                             id: photo.id,
//                             url: photo.photoUrl,
//                             order: photo.order,
//                             isVerified: photo.isVerified,
//                         })) ?? [],
//                 },
//                 {
//                     key: "profession",
//                     name: "profession",
//                     label: "Profession",
//                     placeholder: "What do you do?",
//                     type: "text",
//                     value: profile?.profession ?? null,
//                 },
//                 {
//                     key: "educationLevel",
//                     name: "educationLevel",
//                     label: "Education",
//                     placeholder: "Your education level",
//                     type: "select",
//                     options: ["High School", "Bachelor's Degree", "Master's Degree", "PhD", "Other"],
//                     value: profile?.educationLevel ?? null,
//                 },
//             ],
//         }
//     ];
//     return steps;
// };

// // Calculate profile completion percentage
// const calculateCompletion = (steps: FormStep[]) => {
//     let totalFields = 0;
//     let filledFields = 0;

//     steps.forEach((step) => {
//         if (!step.optional) {
//             step.fields.forEach((field) => {
//                 if (field.required) {
//                     totalFields++;
//                     if (
//                         field.value !== null &&
//                         field.value !== "" &&
//                         (Array.isArray(field.value) ? field.value.length > 0 : true)
//                     ) {
//                         filledFields++;
//                     }
//                 }
//             });
//         }
//     });

//     return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
// };

// // Fetch profile steps with caching
// export const fetchProfileStepsService = async (userId: string) => {
//     const redis = getRedis();
//     const cacheKey = `${REDIS_KEYS.PROFILE_STEPS}${userId}`;
//     const optionsCacheKey = REDIS_KEYS.PROFILE_OPTIONS;

//     try {
//         // Check cache first
//         const cachedData = await redis.get(cacheKey);
//         if (cachedData) {
//             logger.info(`[fetchProfileStepsService] Cache hit for user: ${userId}`);
//             return JSON.parse(cachedData);
//         }

//         logger.info(`[fetchProfileStepsService] Cache miss for user: ${userId}. Fetching from DB...`);

//         // Check if options are cached
//         let options: ProfileOptions;
//         const cachedOptions = await redis.get(optionsCacheKey);

//         if (cachedOptions) {
//             logger.info(`[fetchProfileStepsService] Options cache hit`);
//             options = JSON.parse(cachedOptions);
//         } else {
//             logger.info(`[fetchProfileStepsService] Options cache miss. Fetching from DB...`);
//             options = await profileRepository.fetchProfileOptions();
//             console.log(options);
//             // Cache options for longer (they don't change often)
//             await redis.setex(optionsCacheKey, CACHE_TTL.EXTRA_LONG, JSON.stringify(options));
//         }

//         // Fetch profile
//         const profile = await profileRepository.getProfile(userId);
//         logger.info(`[fetchProfileStepsService] Profile retrieved for user: ${userId}`);

//         // Generate steps with options

//         const steps = generateProfileSetupSteps(profile, options);
//         const completion = profile?.profileCompletion ?? calculateCompletion(steps);

//         const result = {
//             status: 200,
//             data: {
//                 steps,
//                 profileCompletion: completion,
//                 isProfileComplete: completion >= 80,
//             },
//         };

//         // Cache result
//         await redis.setex(cacheKey, CACHE_TTL.LONG, JSON.stringify(result));
//         logger.info(`[fetchProfileStepsService] Profile steps cached for user: ${userId}`);

//         return result;
//     } catch (error) {
//         logger.error(`[fetchProfileStepsService] Error fetching profile steps for user: ${userId}`, { error });
//         throw error;
//     }
// };

// // Update profile setup
// export const updateProfileSetupService = async (
//     userId: string,
//     data: ProfileSetupData
// ) => {
//     logger.info(`[updateProfileSetupService] Starting profile update for user: ${userId}`);

//     try {
//         await db.transaction(async (tx) => {
//             // Get profile
//             const profile = await profileRepository.getProfile(userId);
//             if (!profile) {
//                 throw new Error("Profile not found");
//             }
//             const profileId = profile.id;

//             // 1. Update display name
//             if (data.displayName) {
//                 await profileRepository.updateUserDisplayName(userId, data.displayName);
//             }

//             // 2. Update basic profile
//             const basicProfileData: any = {};
//             if (data.age !== undefined) basicProfileData.age = data.age;
//             if (data.gender) basicProfileData.gender = data.gender;
//             if (data.bio) basicProfileData.bio = data.bio;
//             if (data.profession) basicProfileData.profession = data.profession;
//             if (data.educationLevel) basicProfileData.educationLevel = data.educationLevel;
//             if (data.dateMode !== undefined) basicProfileData.dateMode = data.dateMode;

//             if (Object.keys(basicProfileData).length > 0) {
//                 await profileRepository.updateBasicProfile(profileId, basicProfileData);
//             }

//             // 3. Update location
//             if (data.country) {
//                 const locationExists = await profileRepository.findLocation(profileId);
//                 if (locationExists) {
//                     await profileRepository.updateLocation(profileId, {
//                         country: data.country.name,
//                         countryCode: data.country.code,
//                     });
//                 } else {
//                     await profileRepository.createLocation(profileId, {
//                         country: data.country.name,
//                         countryCode: data.country.code,
//                     });
//                 }
//             }

//             // 4. Update languages
//             if (data.languages && data.primaryLanguage && Array.isArray(data.languages)) {
//                 await profileRepository.deleteLanguages(profileId);
//                 if (data.languages.length > 0) {
//                     await profileRepository.createLanguages(profileId, data.languages, data.primaryLanguage);
//                 }
//             }

//             // 5. Update interests
//             if (data.interests && Array.isArray(data.interests)) {
//                 await profileRepository.deleteInterests(profileId);
//                 if (data.interests.length > 0) {
//                     await profileRepository.createInterests(profileId, data.interests);
//                 }
//             }

//             // 6. Update moods
//             if (data.moods && Array.isArray(data.moods)) {
//                 await profileRepository.deleteMoods(profileId);
//                 if (data.moods.length > 0) {
//                     await profileRepository.createMoods(profileId, data.moods);
//                 }
//             }

//             // 7. Update music genres
//             if (data.musicGenres && Array.isArray(data.musicGenres)) {
//                 await profileRepository.deleteMusicGenres(profileId);
//                 if (data.musicGenres.length > 0) {
//                     await profileRepository.createMusicGenres(profileId, data.musicGenres);
//                 }
//             }

//             // 8. Update personality traits
//             if (data.personalityTraits && Array.isArray(data.personalityTraits)) {
//                 await profileRepository.deletePersonalityTraits(profileId);
//                 if (data.personalityTraits.length > 0) {
//                     await profileRepository.createPersonalityTraits(profileId, data.personalityTraits);
//                 }
//             }

//             // 10. Update matching preferences
//             const matchingPrefData: any = {};
//             if (data.genderPreference) matchingPrefData.genderPreference = data.genderPreference;
//             if (data.ageRange) {
//                 matchingPrefData.minAge = data.ageRange.min;
//                 matchingPrefData.maxAge = data.ageRange.max;
//             }

//             if (Object.keys(matchingPrefData).length > 0) {
//                 const existingPref = await profileRepository.findMatchingPreference(profileId);
//                 if (existingPref) {
//                     await profileRepository.updateMatchingPreference(profileId, matchingPrefData);
//                 } else {
//                     await profileRepository.createMatchingPreference(profileId, matchingPrefData);
//                 }
//             }

//             // 11. Update looking for
//             if (data.lookingFor && Array.isArray(data.lookingFor)) {
//                 await profileRepository.deleteLookingFor(profileId);
//                 if (data.lookingFor.length > 0) {
//                     await profileRepository.createLookingFor(profileId, data.lookingFor);
//                 }
//             }

//             // 12. Update engagement preferences
//             const engagementPrefData: any = {};
//             if (data.voiceCallPreference) engagementPrefData.voiceCallPreference = data.voiceCallPreference;
//             if (data.videoCallPreference) engagementPrefData.videoCallPreference = data.videoCallPreference;
//             if (data.interestedInGames !== undefined) engagementPrefData.interestedInGames = data.interestedInGames;

//             if (Object.keys(engagementPrefData).length > 0) {
//                 const existingPref = await profileRepository.findEngagementPreference(profileId);
//                 if (existingPref) {
//                     await profileRepository.updateEngagementPreference(profileId, engagementPrefData);
//                 } else {
//                     await profileRepository.createEngagementPreference(profileId, engagementPrefData);
//                 }
//             }

//             // Clear cache
//             const redis = getRedis();
//             const cacheKey = `${REDIS_KEYS.PROFILE_STEPS}${userId}`;
//             await redis.del(cacheKey);

//             logger.info(`[updateProfileSetupService] Profile updated successfully for user: ${userId}`);
//         });

//         return { status: 200, message: "Profile updated successfully" };
//     } catch (error) {
//         logger.error(
//             `[updateProfileSetupService] Failed to update profile for user: ${userId}`,
//             error
//         );
//         throw error;
//     }
// };