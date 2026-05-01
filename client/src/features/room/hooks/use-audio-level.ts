import { useEffect, useRef, useState } from "react";

/**
 * Returns a 0–1 loudness level derived from the audio tracks in `stream`.
 * Uses Web Audio AnalyserNode + RAF loop; cleans up when stream changes or
 * the component unmounts. Returns 0 immediately when stream is null/empty.
 */
export function useAudioLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) {
      setLevel(0);
      return;
    }

    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }

    // Resume in case it starts suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;          // 64 bins, lightweight
    analyser.smoothingTimeConstant = 0.82; // smooths rapid jitter
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      // Time-domain RMS gives perceptual loudness
      analyser.getByteTimeDomainData(data);
      let sumSq = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128; // –1 … +1
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / data.length);
      setLevel(Math.min(rms * 5, 1)); // scale to usable range
      rafRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ctx.close().catch(() => {});
    };
  }, [stream]);

  return level;
}
