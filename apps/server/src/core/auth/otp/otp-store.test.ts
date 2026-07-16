import { beforeEach, describe, expect, it, mock } from "bun:test";

/** Minimal in-memory stand-in for the ioredis surface `otp-store` uses. */
function createFakeRedis() {
  const store = new Map<string, Record<string, string>>();
  const api = {
    _store: store,
    async hgetall(key: string) {
      return store.get(key) ?? {};
    },
    async del(key: string) {
      store.delete(key);
      return 1;
    },
    async hincrby(key: string, field: string, n: number) {
      const h = store.get(key) ?? {};
      const val = (Number.parseInt(h[field] ?? "0", 10) || 0) + n;
      h[field] = String(val);
      store.set(key, h);
      return val;
    },
    multi() {
      const ops: Array<() => void> = [];
      const chain = {
        del(key: string) {
          ops.push(() => store.delete(key));
          return chain;
        },
        hset(key: string, obj: Record<string, unknown>) {
          ops.push(() => {
            const h: Record<string, string> = {};
            for (const [k, v] of Object.entries(obj)) h[k] = String(v);
            store.set(key, h);
          });
          return chain;
        },
        expire() {
          ops.push(() => {});
          return chain;
        },
        async exec() {
          for (const op of ops) op();
          return [];
        },
      };
      return chain;
    },
  };
  return api;
}

const fake = createFakeRedis();
mock.module("@/core/redis", () => ({ getRedis: () => fake }));

const { createOtp, verifyOtp } = await import("./otp-store");

const PHONE = "+14155550100";

describe("otp-store", () => {
  beforeEach(() => {
    fake._store.clear();
  });

  it("verifies a freshly created code", async () => {
    const code = await createOtp(PHONE);
    expect(await verifyOtp(PHONE, code)).toEqual({ status: "ok" });
  });

  it("is single-use — a code cannot be reused after success", async () => {
    const code = await createOtp(PHONE);
    expect((await verifyOtp(PHONE, code)).status).toBe("ok");
    expect((await verifyOtp(PHONE, code)).status).toBe("not_found");
  });

  it("returns not_found when no code was issued", async () => {
    expect((await verifyOtp(PHONE, "000000")).status).toBe("not_found");
  });

  it("reports mismatch with a decreasing attempt budget, then locks out", async () => {
    await createOtp(PHONE);
    const wrong = "000000";
    // 4 mismatches leave attempts remaining; the 5th trips the lockout.
    for (let i = 0; i < 4; i++) {
      const r = await verifyOtp(PHONE, wrong);
      expect(r.status).toBe("mismatch");
    }
    expect((await verifyOtp(PHONE, wrong)).status).toBe("too_many_attempts");
    // After lockout the code is gone even if the right one is tried.
    expect((await verifyOtp(PHONE, wrong)).status).toBe("not_found");
  });

  it("generates codes of the configured length", async () => {
    const code = await createOtp(PHONE);
    expect(code).toMatch(/^\d{6}$/);
  });
});
