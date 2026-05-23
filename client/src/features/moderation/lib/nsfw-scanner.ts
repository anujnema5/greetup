import type { NsfwPrediction } from "./nsfw-thresholds";

const SAMPLE_SIZE = 224;

type NsfwModel = {
  classify: (
    image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
  ) => Promise<NsfwPrediction[]>;
};

let modelPromise: Promise<NsfwModel> | null = null;

async function loadModel(): Promise<NsfwModel> {
  if (!modelPromise) {
    modelPromise = import("nsfwjs").then((mod) => mod.load() as Promise<NsfwModel>);
  }
  return modelPromise;
}

function getActiveVideoTrack(stream: MediaStream): MediaStreamTrack | null {
  return stream.getVideoTracks().find((t) => t.readyState === "live" && t.enabled) ?? null;
}

/**
 * Classifies one frame from a live MediaStream (camera or screen). Never uploads pixels.
 */
export async function classifyStreamFrame(
  stream: MediaStream,
): Promise<NsfwPrediction[] | null> {
  const track = getActiveVideoTrack(stream);
  if (!track) return null;

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([track]);

  try {
    await video.play();
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise<void>((resolve) => {
        video.onloadeddata = () => resolve();
      });
    }

    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

    const model = await loadModel();
    return (await model.classify(canvas)) as NsfwPrediction[];
  } catch {
    return null;
  } finally {
    video.srcObject = null;
  }
}
