/**
 * Move / capture SFX (Lichess CDN). `preloadChessSounds` on chess mount avoids a first-move stall.
 */
const MOVE_SRC = "https://lichess1.org/assets/sound/standard/Move.mp3";
const CAPTURE_SRC = "https://lichess1.org/assets/sound/standard/Capture.mp3";

let moveAudio: HTMLAudioElement | null = null;
let captureAudio: HTMLAudioElement | null = null;

function getAudio(src: string, cache: HTMLAudioElement | null): HTMLAudioElement {
  if (cache) return cache;
  const el = new Audio(src);
  el.preload = "auto";
  return el;
}

export type ChessSoundKind = "move" | "capture";

/** Warm decode buffers once (e.g. on chess mount) so first move doesn’t hitch. */
export function preloadChessSounds(): void {
  try {
    moveAudio = getAudio(MOVE_SRC, moveAudio);
    captureAudio = getAudio(CAPTURE_SRC, captureAudio);
    void moveAudio.load();
    void captureAudio.load();
  } catch {
    // ignore
  }
}

/**
 * Plays a one-shot chess SFX. Safe to call from move handlers; failures are ignored
 * (e.g. iOS blocking audio until a user gesture).
 */
export function playChessSound(kind: ChessSoundKind): void {
  try {
    if (kind === "capture") {
      captureAudio = getAudio(CAPTURE_SRC, captureAudio);
      captureAudio.currentTime = 0;
      void captureAudio.play();
      return;
    }
    moveAudio = getAudio(MOVE_SRC, moveAudio);
    moveAudio.currentTime = 0;
    void moveAudio.play();
  } catch {
    // ignore
  }
}
