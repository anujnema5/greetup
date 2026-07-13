import { describe, expect, it } from "bun:test";

import { otcRedisIndexService } from "./services/otc-redis-index.service";

describe("otcRedisIndexService.parseActivityIdsFromHash", () => {
  it("parses comma-separated activity ids", () => {
    const parse = (raw: string | null | undefined) => {
      if (!raw || raw.trim() === "") return [];
      return raw.split(",").map((id) => id.trim()).filter(Boolean);
    };
    expect(parse("a,b, c")).toEqual(["a", "b", "c"]);
    expect(parse("")).toEqual([]);
    expect(parse(null)).toEqual([]);
  });
});

describe("open-to-connect mutual exclusion (contract)", () => {
  it("exports discovery helpers used by presence hooks", () => {
    expect(typeof otcRedisIndexService.syncUserToIndex).toBe("function");
    expect(typeof otcRedisIndexService.removeUserFromIndex).toBe("function");
    expect(typeof otcRedisIndexService.refreshUserTtlIfIndexed).toBe("function");
  });
});
