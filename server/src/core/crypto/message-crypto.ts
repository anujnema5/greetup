import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { getAEK, getOldAEK } from './aek-loader';

export function encryptMessage(plaintext: string): { encryptedContent: string; iv: string } {
  const aek    = getAEK();
  const iv     = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', aek, iv);
  const enc    = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();

  return {
    encryptedContent: Buffer.concat([enc, tag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function decryptMessage(encryptedContent: string, iv: string): string {
  const data  = Buffer.from(encryptedContent, 'base64');
  const ivBuf = Buffer.from(iv, 'base64');
  const tag   = data.subarray(data.length - 16);
  const ct    = data.subarray(0, data.length - 16);

  try {
    const d = createDecipheriv('aes-256-gcm', getAEK(), ivBuf);
    d.setAuthTag(tag);
    return d.update(ct) + d.final('utf8');
  } catch {
    const oldAek = getOldAEK();
    if (oldAek) {
      const d = createDecipheriv('aes-256-gcm', oldAek, ivBuf);
      d.setAuthTag(tag);
      return d.update(ct) + d.final('utf8');
    }
    throw new Error('Decryption failed — wrong key or tampered message');
  }
}
