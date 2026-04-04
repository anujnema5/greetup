/** Response shape from match-engine `GET /match/state/user/:userId` */
export type UserMatchState = {
  status: "searching" | "matched" | "no_match" | "idle";
  requestId?: string;
  roomId?: string;
};

/** Data stored in Redis for each user (for matching) */
export interface MatchUserData {
  profileId: string;
  gender: string | null;
  age: number | null;
  preferredGender: string;
  distancePreference: string;
  minAge: number;
  maxAge: number;
  lat: number | null;
  lon: number | null;
  countryCode: string | null;
  city: string | null;
  availability: string;
  interestIds: string[];
  goalIds: string[];
  professionIds: string[];
  trustScore: number;
  lastActiveAt: number;
}

/** Parsed result from Redis HGETALL */
export function parseMatchUserHash(
  entries: string[] | Record<string, string>
): Partial<MatchUserData> {
  const obj: Record<string, string> = Array.isArray(entries)
    ? (() => {
        const o: Record<string, string> = {};
        for (let i = 0; i < entries.length; i += 2) {
          o[entries[i]] = entries[i + 1] ?? "";
        }
        return o;
      })()
    : entries;

  return {
    profileId: obj.profileId ?? "",
    gender: obj.g || null,
    age: obj.a ? parseInt(obj.a, 10) : null,
    preferredGender: obj.pg ?? "any",
    distancePreference: obj.da ?? "random",
    minAge: obj.amin ? parseInt(obj.amin, 10) : 18,
    maxAge: obj.amax ? parseInt(obj.amax, 10) : 99,
    lat: obj.lat ? parseFloat(obj.lat) : null,
    lon: obj.lon ? parseFloat(obj.lon) : null,
    countryCode: obj.cc || null,
    city: obj.city || null,
    availability: obj.av ?? "offline",
    interestIds: obj.i ? obj.i.split(",").filter(Boolean) : [],
    goalIds: obj.gl ? obj.gl.split(",").filter(Boolean) : [],
    professionIds: obj.pr ? obj.pr.split(",").filter(Boolean) : [],
    trustScore: obj.ts ? parseInt(obj.ts, 10) : 100,
    lastActiveAt: obj.la ? parseInt(obj.la, 10) : 0,
  };
}
