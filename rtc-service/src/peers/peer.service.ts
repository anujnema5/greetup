// TODO: peer lifecycle
// Uses: peer.repository.ts (Redis metadata) + in-memory Maps (mediasoup handles)
//
// In-memory mediasoup state (C++ handles — cannot go into Redis):
//   peerSockets    Map<peerId, Socket>
//   transports     Map<transportId, WebRtcTransport>
//   producers      Map<producerId, Producer>
//   consumers      Map<consumerId, Consumer>
//
// - addPeer(roomId, peerId, socket): Promise<void>
// - removePeer(peerId): Promise<void>  ← closes all transports/producers/consumers
// - addTransport(peerId, transport): void
// - addProducer(peerId, producer): void
// - addConsumer(peerId, consumer): void
// - getTransport(transportId): WebRtcTransport | undefined
// - getConsumer(consumerId): Consumer | undefined
// - getPeerSocket(peerId): Socket | undefined
