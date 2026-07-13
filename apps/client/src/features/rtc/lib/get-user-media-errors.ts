function deniedMessage(device: "microphone" | "camera" | "screen"): string {
  if (device === "screen") {
    return "Screen sharing was blocked or cancelled. Allow screen capture for this site if prompted, then try again.";
  }
  const label = device === "microphone" ? "Microphone" : "Camera";
  const labelLower = device === "microphone" ? "microphone" : "camera";
  return `${label} is blocked or denied for this site. Open site settings from the lock or info icon in the address bar, set ${labelLower} to Allow, then turn ${labelLower} on again — that will ask for permission.`;
}

export function formatGetUserMediaError(e: unknown, device: "microphone" | "camera" | "screen"): string {
  const name =
    typeof DOMException !== "undefined" && e instanceof DOMException
      ? e.name
      : e instanceof Error
        ? e.name
        : "";
  const msg = e instanceof Error ? e.message : String(e);
  if (
    name === "NotAllowedError" ||
    name === "SecurityError" ||
    /Permission denied|NotAllowed|blocked/i.test(msg)
  ) {
    return deniedMessage(device);
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    if (device === "screen") return "No screen or window was selected.";
    return device === "microphone" ? "No microphone was found." : "No camera was found.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    if (device === "screen") return "Screen capture could not be started (it may be in use elsewhere).";
    return device === "microphone"
      ? "Microphone could not be opened (it may be in use elsewhere)."
      : "Camera could not be opened (it may be in use elsewhere).";
  }
  if (device === "screen") return `Screen share: ${msg}`;
  return device === "microphone" ? `Microphone: ${msg}` : `Camera: ${msg}`;
}
