/** Shared site domain constants (root-level so next.config.ts can import at runtime in Docker). */
export const SITE_DOMAIN = "greetup.co";
export const PRODUCTION_ORIGIN = `https://${SITE_DOMAIN}`;
