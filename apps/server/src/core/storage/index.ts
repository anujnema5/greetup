/**
 * Object storage facades (DigitalOcean Spaces, or local disk in development).
 */
export * from "./spaces";
export {
  isLocalObjectStorageEnabled,
  mountLocalObjectStorageRoutes,
  parseLocalObjectKeyFromPublicUrl,
} from "./local";
