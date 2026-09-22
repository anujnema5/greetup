export {
  assertLocalImageObjectAllowed,
  buildLocalPublicObjectUrl,
  completeLocalObjectUpload,
  createLocalPresignedUpload,
  isLocalObjectStorageEnabled,
  localObjectStoragePublicPathPrefix,
  parseLocalObjectKeyFromPublicUrl,
  readLocalObject,
} from "./local-object-storage.service";

export { mountLocalObjectStorageRoutes } from "./local-object-storage.routes";
