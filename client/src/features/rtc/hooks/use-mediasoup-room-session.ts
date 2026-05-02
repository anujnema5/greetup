"use client";

import { useEffect } from "react";
import { Device } from "mediasoup-client";
import type { Consumer, MediaKind, Transport } from "mediasoup-client/types";
import type { Socket } from "socket.io-client";
import { resolveInboundVideoMediaSource } from "@/features/rtc/lib/mediasoup-stream-helpers";
import {
  ICE_RESTART_MIN_GAP_MS,
  isRecoverableTransportState,
} from "@/features/rtc/constants/connection-recovery";
import {
  addRemoteTrackForPeer,
  removeRemoteTrackFromPeers,
  sortPeerIds,
} from "@/features/rtc/lib/remote-participant-streams";
import {
  wireSendTransportProduce,
  wireTransportConnect,
} from "@/features/rtc/lib/mediasoup-transport-wiring";
import { emitRtcAck, isAckErr, isAckOk } from "@/features/rtc/lib/rtc-signaling";
import type {
  ConsumeAck,
  JoinAck,
  ProducerMediaSource,
  RestartIceAck,
  RemotePeer,
  SimpleAck,
  TransportCreateAck,
} from "@/features/rtc/types/mediasoup-room.types";
import type {
  MediasoupRoomSessionOptions,
  MediasoupRoomSessionRefs,
  MediasoupRoomSessionSetters,
} from "@/features/rtc/types/mediasoup-hooks.types";

/**
 * Joins the JWT room over Socket.IO, creates recv/send WebRTC transports, and attaches consumers.
 * Does not call `getUserMedia` — that lives in {@link useMediasoupLocalMedia}.
 */
export function useMediasoupRoomSession(options: MediasoupRoomSessionOptions): void {
  const {
    enabled,
    rtcSocket,
    rtcSocketState,
    rtcRoomId,
    localDisplayName,
    localProfileImageUrl,
    cleanupLocalScreenShareRef,
    refs,
    set
  } = options;

  useEffect(() => {
    if (!enabled) {
      wipeMediasoupRoomUiState(set);
      zeroMediasoupRefs(refs);
      return;
    }

    if (!rtcSocket || rtcSocketState !== "connected") {
      set.setStatus("connecting_socket");
      set.setError(null);
      return;
    }

    let cancelled = false;
    const socket = rtcSocket as Socket;

    // New connection attempt: drop previous session state before `join`.
    refs.socketRef.current = socket;
    refs.videoProducerRef.current = null;
    refs.audioProducerRef.current = null;
    refs.sendTransportRef.current = null;
    refs.deviceRef.current = null;
    set.setMicEnabled(false);
    set.setCameraEnabled(false);
    set.setScreenSharing(false);
    set.setLocalScreenTrackId(null);
    set.setRemoteTrackMediaSource({});
    refs.micEnabledRef.current = false;
    refs.cameraEnabledRef.current = false;
    set.setLocalStream(null);
    refs.localStreamRef.current = null;
    set.setRemoteStreamsByPeerId({});
    set.setPeers({});
    set.setLocalMediaDeviceError(null);
    refs.screenProducerRef.current = null;
    refs.screenShareProducerIdRef.current = null;
    refs.localScreenTrackRef.current = null;

    const consumers = new Map<string, Consumer>();
    const iceRecoveryRuntime = {
      restartInFlightByTransportId: new Set<string>(),
      lastRestartAtByTransportId: new Map<string, number>(),
    };

    const onPeerJoined = (data: {
      peerId?: string;
      displayName?: string | null;
      image?: string | null;
    }) => {
      if (cancelled || !data?.peerId) return;
      if (data.peerId === refs.localUserIdRef.current) return;
      const pid = data.peerId;
      set.setPeers((prev) => ({
        ...prev,
        [pid]: {
          ...(prev[pid] ?? { peerId: pid }),
          displayName: data.displayName ?? prev[pid]?.displayName ?? null,
          image: data.image ?? prev[pid]?.image ?? null,
          // Default to false so the UI shows "off" icons immediately.
          // Producer events (newProducer / consumeRemoteProducer) will flip these to true.
          cameraActive: prev[pid]?.cameraActive ?? false,
          micActive: prev[pid]?.micActive ?? false,
        },
      }));
    };

    const onPeerLeft = (data: { peerId?: string }) => {
      if (cancelled || !data?.peerId) return;
      const pid = data.peerId;
      set.setPeers((prev) => {
        if (!(pid in prev)) return prev;
        const next = { ...prev };
        delete next[pid];
        return next;
      });
      set.setRemoteStreamsByPeerId((prev) => {
        if (!(pid in prev)) return prev;
        const next = { ...prev };
        delete next[pid];
        return next;
      });
    };

    const cleanupMedia = (sendT: Transport | null, recvT: Transport | null) => {
      if (socket.connected) {
        socket.emit("leave");
      }
      socket.off("newProducer", onNewProducer);
      socket.off("producerClosed", onProducerClosed);
      socket.off("producerPaused", onProducerPaused);
      socket.off("producerResumed", onProducerResumed);
      socket.off("peerJoined", onPeerJoined);
      socket.off("peerLeft", onPeerLeft);
      for (const c of consumers.values()) {
        try {
          c.close();
        } catch {
          /* ignore */
        }
      }
      consumers.clear();
      try {
        sendT?.close();
      } catch {
        /* ignore */
      }
      try {
        recvT?.close();
      } catch {
        /* ignore */
      }
      refs.localStreamRef.current?.getTracks().forEach((t) => t.stop());
      refs.localStreamRef.current = null;
      iceRecoveryRuntime.restartInFlightByTransportId.clear();
      iceRecoveryRuntime.lastRestartAtByTransportId.clear();
    };

    const maybeRestartTransportIce = async (transport: Transport): Promise<boolean> => {
      if (cancelled) return false;

      const transportId = transport.id;
      if (iceRecoveryRuntime.restartInFlightByTransportId.has(transportId)) {
        return false;
      }
      const lastRestartAt = iceRecoveryRuntime.lastRestartAtByTransportId.get(transportId) ?? 0;
      if (Date.now() - lastRestartAt < ICE_RESTART_MIN_GAP_MS) {
        return false;
      }
      if (!socket.connected) {
        return false;
      }

      iceRecoveryRuntime.restartInFlightByTransportId.add(transportId);
      try {
        const ack = await emitRtcAck<RestartIceAck>(socket, "restartIce", { transportId });
        if (!isAckOk(ack) || !("iceParameters" in ack)) {
          return false;
        }
        await transport.restartIce({ iceParameters: ack.iceParameters });
        iceRecoveryRuntime.lastRestartAtByTransportId.set(transportId, Date.now());
        return true;
      } catch (err) {
        console.warn("[RTC] restartIce failed", transportId, err);
        return false;
      } finally {
        iceRecoveryRuntime.restartInFlightByTransportId.delete(transportId);
      }
    };

    const attachIceRecovery = (transport: Transport, label: "send" | "recv") => {
      transport.on("connectionstatechange", (state) => {
        if (cancelled) return;

        if (state === "connected") {
          set.setStatus("ready");
          set.setError(null);
          return;
        }

        if (!isRecoverableTransportState(state)) {
          return;
        }

        // Temporary network drops are handled by attempting ICE restart in-place.
        set.setStatus("negotiating");
        void maybeRestartTransportIce(transport).then((restarted) => {
          if (cancelled) return;
          if (restarted) {
            set.setError(null);
            return;
          }
          console.warn(`[RTC] ${label} transport remained unstable`, transport.id);
        });
      });
    };

    let sendTransport: Transport | null = null;
    let recvTransport: Transport | null = null;
    let device: Device | null = null;

    const forgetRemoteTrack = (track: MediaStreamTrack) => {
      if (cancelled) return;
      set.setRemoteTrackMediaSource((prev) => {
        if (!(track.id in prev)) return prev;
        const next = { ...prev };
        delete next[track.id];
        return next;
      });
      set.setRemoteStreamsByPeerId((prev) => removeRemoteTrackFromPeers(prev, track));
    };

    const detachConsumer = (producerId: string) => {
      if (cancelled) return;
      const c = consumers.get(producerId);
      if (!c) return;
      consumers.delete(producerId);
      try {
        c.close();
      } catch {
        /* ignore */
      }
      forgetRemoteTrack(c.track);
    };

    const consumeRemoteProducer = async (
      producerId: string,
      kind: MediaKind,
      peerId: string,
      mediaSource: ProducerMediaSource = "camera",
    ) => {
      if (cancelled || !device || !recvTransport) return;
      if (!peerId) {
        console.warn("[RTC] consumeProducer missing peerId", producerId);
        return;
      }
      if (consumers.has(producerId)) return;

      const raw = await emitRtcAck<ConsumeAck>(socket, "consume", {
        transportId: recvTransport.id,
        producerId,
        rtpCapabilities: device.recvRtpCapabilities,
        paused: true,
      });

      if (cancelled) return;

      if (!raw || typeof raw !== "object" || !("ok" in raw) || !raw.ok) {
        throw new Error(isAckErr(raw) ? (raw.error?.code ?? "consume") : "consume");
      }

      /** Prefer SFU producer `appData` from the consume ack over the `newProducer` event (avoids mis-tagged screen as camera). */
      const resolvedVideoSource: ProducerMediaSource =
        kind === "video" &&
        "mediaSource" in raw &&
        (raw.mediaSource === "screen" || raw.mediaSource === "camera")
          ? raw.mediaSource
          : mediaSource;

      const consumer = await recvTransport.consume({
        id: raw.id,
        producerId: raw.producerId,
        kind: raw.kind,
        rtpParameters: raw.rtpParameters,
      });

      consumers.set(producerId, consumer);

      // Sync camera/mic state from the producer's current pause status.
      if (kind === "video" && resolvedVideoSource === "camera") {
        set.setPeers((prev) => ({
          ...prev,
          [peerId]: { ...(prev[peerId] ?? { peerId }), cameraActive: !raw.producerPaused },
        }));
      } else if (kind === "audio") {
        set.setPeers((prev) => ({
          ...prev,
          [peerId]: { ...(prev[peerId] ?? { peerId }), micActive: !raw.producerPaused },
        }));
      }

      let metaRefreshTimer: ReturnType<typeof setTimeout> | null = null;
      const clearMetaRefresh = () => {
        if (metaRefreshTimer != null) {
          clearTimeout(metaRefreshTimer);
          metaRefreshTimer = null;
        }
      };

      const refreshInboundVideoKind = () => {
        if (cancelled || kind !== "video") return;
        const resolved = resolveInboundVideoMediaSource(consumer.track, resolvedVideoSource);
        set.setRemoteTrackMediaSource((prev) => ({ ...prev, [consumer.track.id]: resolved }));
      };

      consumer.on("transportclose", () => {
        consumers.delete(producerId);
      });

      consumer.on("@close", () => {
        clearMetaRefresh();
        consumers.delete(producerId);
        forgetRemoteTrack(consumer.track);
      });

      consumer.track.addEventListener("ended", () => {
        detachConsumer(producerId);
      });

      set.setRemoteStreamsByPeerId((prev) => addRemoteTrackForPeer(prev, peerId, consumer.track));
      if (kind === "video") {
        refreshInboundVideoKind();
        consumer.track.addEventListener("unmute", refreshInboundVideoKind, { once: true });
        metaRefreshTimer = setTimeout(refreshInboundVideoKind, 400);
      }

      if (raw.paused) {
        const resume = await emitRtcAck<SimpleAck>(socket, "resumeConsumer", { consumerId: consumer.id });
        if (isAckOk(resume)) {
          await consumer.resume();
        }
      } else {
        await consumer.resume();
      }

      if (kind === "video") {
        queueMicrotask(refreshInboundVideoKind);
      }
    };

    const onNewProducer = (data: {
      peerId?: string;
      producerId?: string;
      kind?: MediaKind;
      mediaSource?: string;
    }) => {
      if (cancelled || !data?.producerId || !data.kind || !data.peerId) return;
      if (data.kind !== "audio" && data.kind !== "video") return;
      const ms = data.mediaSource;
      const src: ProducerMediaSource =
        data.kind === "video" && typeof ms === "string" && ms.toLowerCase() === "screen"
          ? "screen"
          : "camera";
      // New producer → mark the peer's camera/mic active immediately.
      const pid = data.peerId;
      if (data.kind === "video" && src === "camera") {
        set.setPeers((prev) => ({
          ...prev,
          [pid]: { ...(prev[pid] ?? { peerId: pid }), cameraActive: true },
        }));
      } else if (data.kind === "audio") {
        set.setPeers((prev) => ({
          ...prev,
          [pid]: { ...(prev[pid] ?? { peerId: pid }), micActive: true },
        }));
      }
      void consumeRemoteProducer(data.producerId, data.kind, data.peerId, src).catch((e) => {
        console.error("[RTC] newProducer consume", e);
      });
    };

    const onProducerClosed = (data: { peerId?: string; producerId?: string }) => {
      if (!data?.producerId) return;
      if (
        data.peerId &&
        data.peerId === refs.localUserIdRef.current &&
        data.producerId === refs.screenShareProducerIdRef.current
      ) {
        cleanupLocalScreenShareRef.current();
        return;
      }
      detachConsumer(data.producerId);
    };

    const onProducerPaused = (data: {
      peerId?: string;
      producerId?: string;
      kind?: string;
      mediaSource?: string;
    }) => {
      if (cancelled || !data?.peerId || data.peerId === refs.localUserIdRef.current) return;
      const pid = data.peerId;
      if (data.kind === "video" && data.mediaSource !== "screen") {
        set.setPeers((prev) => ({
          ...prev,
          [pid]: { ...(prev[pid] ?? { peerId: pid }), cameraActive: false },
        }));
      } else if (data.kind === "audio") {
        set.setPeers((prev) => ({
          ...prev,
          [pid]: { ...(prev[pid] ?? { peerId: pid }), micActive: false },
        }));
      }
    };

    const onProducerResumed = (data: {
      peerId?: string;
      producerId?: string;
      kind?: string;
      mediaSource?: string;
    }) => {
      if (cancelled || !data?.peerId || data.peerId === refs.localUserIdRef.current) return;
      const pid = data.peerId;
      if (data.kind === "video" && data.mediaSource !== "screen") {
        set.setPeers((prev) => ({
          ...prev,
          [pid]: { ...(prev[pid] ?? { peerId: pid }), cameraActive: true },
        }));
      } else if (data.kind === "audio") {
        set.setPeers((prev) => ({
          ...prev,
          [pid]: { ...(prev[pid] ?? { peerId: pid }), micActive: true },
        }));
      }
    };

    socket.on("peerJoined", onPeerJoined);
    socket.on("peerLeft", onPeerLeft);
    socket.on("producerPaused", onProducerPaused);
    socket.on("producerResumed", onProducerResumed);

    set.setError(null);
    set.setStatus("joining");

    void (async () => {
      try {
        const joinRes = await emitRtcAck<JoinAck>(socket, "join", {
          displayName: localDisplayName ?? undefined,
          image: localProfileImageUrl ?? undefined,
        });
        if (cancelled) return;

        if (!joinRes || typeof joinRes !== "object" || !("ok" in joinRes) || !joinRes.ok) {
          const err = joinRes as { error?: { code?: string; ownerInstanceId?: string } };
          const code = err.error?.code;
          if (code === "WRONG_INSTANCE") {
            set.setError(
              `Wrong RTC server. Owner instance: ${err.error?.ownerInstanceId ?? "unknown"} — point client at that node.`,
            );
          } else {
            set.setError(code ?? "join_failed");
          }
          set.setStatus("error");
          return;
        }

        const selfId = refs.localUserIdRef.current;
        const others = selfId ? joinRes.peerIds.filter((id) => id !== selfId) : [...joinRes.peerIds];
        const initialPeers: Record<string, RemotePeer> = Object.fromEntries(
          sortPeerIds(others).map((id) => [
            id,
            {
              peerId: id,
              displayName: joinRes.peerNames?.[id] ?? null,
              image: joinRes.peerImages?.[id] ?? null,
              // Match `onPeerJoined`: assume off until consume / producer events set real state.
              // Otherwise `micActive`/`cameraActive` stay undefined and remote tiles hide status icons.
              cameraActive: false,
              micActive: false,
            },
          ]),
        );
        set.setPeers(initialPeers);

        device = new Device();
        await device.load({ routerRtpCapabilities: joinRes.rtpCapabilities });
        if (cancelled) return;
        refs.deviceRef.current = device;

        set.setStatus("negotiating");

        const recvParams = await emitRtcAck<TransportCreateAck>(socket, "createWebRtcTransport", {
          direction: "recv",
        });
        if (cancelled) return;
        if (!recvParams || typeof recvParams !== "object" || !("ok" in recvParams) || !recvParams.ok) {
          throw new Error(isAckErr(recvParams) ? (recvParams.error?.code ?? "create_recv") : "create_recv");
        }

        const sendParams = await emitRtcAck<TransportCreateAck>(socket, "createWebRtcTransport", {
          direction: "send",
        });
        if (cancelled) return;
        if (!sendParams || typeof sendParams !== "object" || !("ok" in sendParams) || !sendParams.ok) {
          throw new Error(isAckErr(sendParams) ? (sendParams.error?.code ?? "create_send") : "create_send");
        }

        recvTransport = device.createRecvTransport({
          id: recvParams.id,
          iceParameters: recvParams.iceParameters,
          iceCandidates: recvParams.iceCandidates,
          dtlsParameters: recvParams.dtlsParameters,
          sctpParameters: recvParams.sctpParameters ?? undefined,
        });
        wireTransportConnect(socket, recvTransport);
        attachIceRecovery(recvTransport, "recv");

        sendTransport = device.createSendTransport({
          id: sendParams.id,
          iceParameters: sendParams.iceParameters,
          iceCandidates: sendParams.iceCandidates,
          dtlsParameters: sendParams.dtlsParameters,
          sctpParameters: sendParams.sctpParameters ?? undefined,
        });
        wireTransportConnect(socket, sendTransport);
        wireSendTransportProduce(socket, sendTransport);
        attachIceRecovery(sendTransport, "send");
        refs.sendTransportRef.current = sendTransport;

        socket.on("newProducer", onNewProducer);
        socket.on("producerClosed", onProducerClosed);

        for (const p of joinRes.existingProducers) {
          if (p.kind !== "audio" && p.kind !== "video") continue;
          const src: ProducerMediaSource =
            p.kind === "video" && p.mediaSource === "screen" ? "screen" : "camera";
          try {
            await consumeRemoteProducer(p.producerId, p.kind, p.peerId, src);
          } catch (err) {
            // Stale ids after reconnect / reorder — `newProducer` will attach live tracks.
            console.warn("[RTC] existingProducer consume skipped", p.producerId, err);
          }
          if (cancelled) return;
        }

        if (!cancelled) {
          set.setStatus("ready");
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : String(e);
          set.setError(message);
          set.setStatus("error");
        }
        cleanupMedia(sendTransport, recvTransport);
        set.setLocalStream(null);
        set.setRemoteStreamsByPeerId({});
        set.setPeers({});
      }
    })();

    return () => {
      cancelled = true;
      cleanupMedia(sendTransport, recvTransport);
      zeroMediasoupRefs(refs);
      wipeMediasoupRoomUiState(set);
    };
  }, [
    enabled,
    localDisplayName,
    localProfileImageUrl,
    rtcSocket,
    rtcSocketState,
    rtcRoomId,
    cleanupLocalScreenShareRef,
    set,
    refs,
  ]);
}

function wipeMediasoupRoomUiState(set: MediasoupRoomSessionSetters): void {
  set.setStatus("idle");
  set.setError(null);
  set.setLocalStream(null);
  set.setRemoteStreamsByPeerId({});
  set.setPeers({});
  set.setMicEnabled(false);
  set.setCameraEnabled(false);
  set.setScreenSharing(false);
  set.setLocalScreenTrackId(null);
  set.setRemoteTrackMediaSource({});
  set.setLocalMediaDeviceError(null);
}

function zeroMediasoupRefs(refs: MediasoupRoomSessionRefs): void {
  refs.localStreamRef.current = null;
  refs.videoProducerRef.current = null;
  refs.screenProducerRef.current = null;
  refs.screenShareProducerIdRef.current = null;
  refs.localScreenTrackRef.current = null;
  refs.audioProducerRef.current = null;
  refs.sendTransportRef.current = null;
  refs.deviceRef.current = null;
  refs.socketRef.current = null;
  refs.micEnabledRef.current = false;
  refs.cameraEnabledRef.current = false;
}
