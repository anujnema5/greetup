/**
 * Minimal RTP packet parser — RFC 3550
 *
 * Used by the mediasoup adapter to extract the audio payload from raw UDP
 * packets received via a mediasoup PlainTransport.
 *
 * We only parse what VoiceIQ needs:
 *   - SSRC  → identifies which participant sent this packet
 *   - Payload → the raw Opus-encoded audio frame(s)
 *
 * RTP fixed header layout (12 bytes minimum):
 *
 *  0                   1                   2                   3
 *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |V=2|P|X|  CC   |M|     PT      |       Sequence Number         |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                           Timestamp                           |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |           Synchronisation Source (SSRC) identifier           |
 * +=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+
 * |  Header Extension (if X=1) + CSRC list (CC entries × 4 bytes)|
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                         Payload …                             |
 */

export type RTPPacket = {
  ssrc:           number  // identifies the participant (mapped to participantId)
  sequenceNumber: number  // used to detect packet loss / reordering
  timestamp:      number  // RTP media clock (48 kHz for Opus)
  payloadType:    number  // should be 100 (Opus) based on mediasoup codec config
  payload:        Buffer  // raw Opus frame(s) — pass directly to the audio buffer
}

export function parseRTP(buf: Buffer): RTPPacket | null {
  if (buf.length < 12) return null

  const version = (buf[0] >> 6) & 0x3
  if (version !== 2) return null  // not a valid RTP packet

  const hasExtension  = (buf[0] >> 4) & 0x1
  const csrcCount     = buf[0] & 0x0f
  const payloadType   = buf[1] & 0x7f
  const sequenceNumber = buf.readUInt16BE(2)
  const timestamp      = buf.readUInt32BE(4)
  const ssrc           = buf.readUInt32BE(8)

  // Fixed header (12 B) + CSRC list (csrcCount × 4 B)
  let offset = 12 + csrcCount * 4

  // Skip header extension block if present (RFC 3550 §5.3.1)
  if (hasExtension) {
    if (buf.length < offset + 4) return null
    const extWordCount = buf.readUInt16BE(offset + 2)
    offset += 4 + extWordCount * 4
  }

  if (offset >= buf.length) return null  // no payload

  return {
    ssrc,
    sequenceNumber,
    timestamp,
    payloadType,
    payload: buf.subarray(offset),
  }
}
