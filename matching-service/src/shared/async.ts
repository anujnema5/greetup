export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Small jitter to reduce thundering herd on retry backoff. */
export const randomJitter = (maxMs = 250): number => Math.floor(Math.random() * maxMs);
