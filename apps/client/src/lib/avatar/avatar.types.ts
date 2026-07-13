export type GenerateAvatarOptions = {
  seed?: string;
  size?: number;
};

export type FetchAvatarPngResult = {
  blob: Blob;
  seed: string;
  filename: string;
};

export type FetchAvatarFileResult = {
  file: File;
  seed: string;
};
