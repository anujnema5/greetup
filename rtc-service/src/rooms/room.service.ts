// TODO: room lifecycle
// Uses: room.repository.ts (Redis metadata) + mediasoup.service.ts (router)
//
// - getOrCreateRoom(roomId: string): Promise<RoomRecord>
//   → check Redis, create if not exists, spin up mediasoup Router
//
// - removeRoom(roomId: string): Promise<void>
//   → close mediasoup Router, delete from Redis
//
// - getRouter(roomId: string): MediasoupTypes.Router
//   → returns in-memory mediasoup Router for this room
