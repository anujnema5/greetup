/** Lightweight repeating ring tone for incoming/outgoing connection calls. */

let audioCtx: AudioContext | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;
let activeCount = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function playTone(frequency: number, durationMs: number, ctx: AudioContext): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.value = 0.08;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

function startRingPattern(): void {
  const ctx = getAudioContext();
  if (!ctx || ringTimer) return;
  void ctx.resume().catch(() => {});

  const pulse = () => {
    playTone(440, 420, ctx);
    window.setTimeout(() => playTone(523, 420, ctx), 480);
  };

  pulse();
  ringTimer = setInterval(pulse, 2400);
}

function stopRingPattern(): void {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
}

export function startConnectionCallRingtone(): void {
  activeCount += 1;
  if (activeCount === 1) {
    startRingPattern();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([180, 120, 180, 120, 180]);
    }
  }
}

export function stopConnectionCallRingtone(): void {
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount === 0) stopRingPattern();
}
