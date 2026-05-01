# WebRTC Direct and Circle Call Flow

This document explains how calling works in the frontend for:

- Direct call (1:1 match)
- Circle call (group room)

It is a practical guide for debugging and onboarding.

## 1) Core frontend entry points

- `client/src/features/room/pages/room-page.tsx`
  - Route-level entry for `/circle/[roomId]`.
  - Decides direct vs circle and starts the join/video flow.
- `client/src/features/room/components/room-video-layer.tsx`
  - Connects room UI to RTC state from `useRtcSocketContext`.
- `client/src/features/room/components/room-video-view.tsx`
  - Main presentational layout for stage, overlays, controls, and side panels.
- `client/src/features/rtc/hooks/use-mediasoup-room.ts`
  - Composes mediasoup room session + local media producers.
- `client/src/features/rtc/hooks/use-mediasoup-room-session.ts`
  - Socket signaling join, transport setup, producer/consumer sync.
- `client/src/features/rtc/hooks/use-mediasoup-local-media.ts`
  - Mic/camera/screen-share producer lifecycle.

## 2) Shared startup flow (direct and circle)

1. User lands on `/circle/[roomId]` (`RoomPage`).
2. `useRoomJoinAndStartVideo` joins app room + dispatches video session start in Redux.
3. `RtcSocketProvider` fetches RTC token and opens Socket.IO to the RTC service.
4. `useMediasoupRoomSession`:
   - emits `join`
   - creates recv/send transports
   - consumes existing producers
   - subscribes to `peerJoined`, `peerLeft`, `newProducer`, `producerPaused`, `producerResumed`
5. `useMediasoupLocalMedia` produces local mic/camera and manages toggles.
6. UI receives:
   - `remoteStreamsByPeerId`
   - peer metadata (`displayName`, `image`, `cameraActive`, `micActive`)
   - local/remote stream derivatives used by `RoomVideoLayer` and `RoomVideoView`.

## 3) Direct call behavior

Direct mode is active when room/session type is not group.

Primary UX rules:

- Main stage shows remote stream.
- Local video appears as PiP (or inset depending on state).
- Skip button is available.
- Add-to-circle flow can be shown.
- `direct-call-partner-disconnect-handler.tsx` runs recovery/search logic when partner leaves.

Media-stage specifics:

- During screen share, direct mode can promote screen to main stage and move camera to inset.
- `remotePeerCameraOff` and `remotePeerMicOff` drive camera-off avatars and mute indicators.

## 4) Circle call behavior

Circle mode is active for group rooms (`roomType/sessionKind` and RTC room type indicate group).

Primary UX rules:

- Gallery layout from participant roster.
- No skip behavior.
- No direct-partner disconnect recovery path.
- Participant tiles use per-peer stream + metadata maps.

Media-state specifics:

- Participant roster is merged with streams so peers can render before media arrives.
- Tile status icons come from `cameraActive`/`micActive`.

## 5) Key state contracts

From RTC hooks:

- `status`: `"idle" | "connecting_socket" | "joining" | "negotiating" | "ready" | "error"`
- `remoteStreamsByPeerId`: `peerId -> MediaStream`
- `peers`: `peerId -> { displayName, image, cameraActive, micActive }`
- `micEnabled`, `cameraEnabled`, `screenSharing`

From room session layer:

- `sessionActive`: call UI should be mounted
- `activeRoomId`: room currently bound to RTC connection
- `phase`: `in_call`, `searching`, etc.

## 6) Common debugging checklist

If remote media/status looks wrong:

1. Confirm RTC socket is connected and mediasoup status reaches `ready`.
2. Check `peers[peerId]` has `cameraActive` and `micActive` populated.
3. Verify `remoteStreamsByPeerId[peerId]` has expected tracks.
4. Validate producer events are arriving (`newProducer`, `producerPaused`, `producerResumed`).
5. For direct mode, confirm selected primary peer id is correct.

If direct/circle UI looks wrong:

1. Verify room type resolution in `RoomPage`.
2. Check props passed from `RoomVideoLayer` into `RoomVideoView`.
3. Confirm `isGroupRoom` and `remoteParticipants` consistency.

## 7) Related docs

- `docs/video-calling-architecture-and-debugging.md` (detailed deep dive)
- `docs/room-activities-and-chess.md` (activity lifecycle in room UI)
