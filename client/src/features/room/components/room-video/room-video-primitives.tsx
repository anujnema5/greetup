/**
 * Barrel file — re-exports every primitive used across the room-video feature.
 *
 * Split into focused modules inside ./primitives/:
 *
 *   video-elements   — VideoMirror, CameraOffAvatar
 *   empty-states     — SearchingCandidateState, NoPeerAvailableState
 *   tile-overlays    — TileNameBadge, TileMediaStatus, TileSpeakingRings
 *   toolbar-buttons  — MediaControlButton, CircleToolbarButton, TOOLBAR_CONTROL_CAPTION_CLASS
 *
 * Import from this file as usual — the path hasn't changed.
 */

export * from "./primitives/video-elements";
export * from "./primitives/empty-states";
export * from "./primitives/tile-overlays";
export * from "./primitives/toolbar-buttons";
