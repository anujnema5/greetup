export const ROOM_ACTIVITY_TOAST = {
  peerJoined: (name: string) => `${name} joined`,
  peerLeft: (name: string) => `${name} left`,
  partnerLeft: "Your partner left",
  screenShareStarted: (name: string) => `${name} started sharing their screen`,
  screenShareStopped: (name: string) => `${name} stopped sharing their screen`,
  youScreenShareStarted: "You started sharing your screen",
  youScreenShareStopped: "You stopped sharing your screen",
} as const;
