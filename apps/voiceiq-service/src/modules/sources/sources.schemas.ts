import { z } from 'zod'

export const attachSchema = z.discriminatedUnion('source_type', [
  z.object({
    source_type:     z.literal('mediasoup'),
    session_id:      z.string().uuid(),
    room_id:         z.string(),
    rtc_service_url: z.string().url().optional(),
    listen_ip:       z.string().optional(),
  }),
  z.object({
    source_type: z.literal('meeting-bot'),
    session_id:  z.string().uuid(),
    meeting_url: z.string().url(),
    platform:     z.enum(['google_meet', 'zoom', 'ms_teams']),
  }),
  z.object({
    source_type: z.literal('browser-sdk'),
    session_id:  z.string().uuid(),
  }),
  z.object({
    source_type: z.literal('direct-upload'),
    session_id:  z.string().uuid(),
  }),
])

export type AttachBody = z.infer<typeof attachSchema>
