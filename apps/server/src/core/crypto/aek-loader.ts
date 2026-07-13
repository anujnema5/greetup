import logger from '@/core/logging';

let AEK: Buffer | null = null;
let OLD_AEK: Buffer | null = null;

export async function loadAEKs(): Promise<void> {
  if (!process.env.MESSAGE_ENCRYPTION_KEY) {
    throw new Error('MESSAGE_ENCRYPTION_KEY not set — add it to Doppler/env');
  }

  AEK = Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY, 'hex');

  if (AEK.length !== 32) {
    throw new Error('MESSAGE_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  }

  OLD_AEK = process.env.MESSAGE_ENCRYPTION_KEY_PREVIOUS
    ? Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY_PREVIOUS, 'hex')
    : null;

  logger.info('[crypto] AEK loaded');
}

export function getAEK(): Buffer {
  if (!AEK) throw new Error('AEK not loaded — call loadAEKs() on startup');
  return AEK;
}

export function getOldAEK(): Buffer | null {
  return OLD_AEK;
}
