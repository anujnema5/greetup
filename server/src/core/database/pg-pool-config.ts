import type { PoolConfig } from "pg";

/**
 * DO Managed Postgres URLs often use `sslmode=require`. Newer `pg` treats that like
 * `verify-full` and fails with SELF_SIGNED_CERT_IN_CHAIN unless the DO CA is installed.
 * Encrypted TLS without custom CA trust is sufficient on VPC / App Platform.
 */
export function pgPoolConfig(
  connectionString: string,
  overrides: PoolConfig = {},
): PoolConfig {
  const sslRequested =
    /[?&]sslmode=(require|verify-full|prefer|verify-ca)/i.test(connectionString) ||
    /[?&]ssl=true/i.test(connectionString);

  return {
    connectionString,
    ...overrides,
    ...(sslRequested ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}
