import { NSFW_MODEL_INPUT_PX } from "./nsfw-config";
import { logNsfwModelReady } from "./nsfw-log";
import type { NsfwPrediction } from "./nsfw-thresholds";

type NsfwModel = {
  classify: (image: HTMLCanvasElement) => Promise<NsfwPrediction[]>;
};

let modelPromise: Promise<NsfwModel> | null = null;

function loadModel(): Promise<NsfwModel> {
  if (!modelPromise) {
    modelPromise = import("nsfwjs")
      .then((m) => m.load() as Promise<NsfwModel>)
      .then((model) => {
        logNsfwModelReady();
        return model;
      });
  }
  return modelPromise;
}

export async function classifyStreamFrame(
  stream: MediaStream,
): Promise<NsfwPrediction[] | null> {
  const track =
    stream.getVideoTracks().find((t) => t.readyState === "live" && t.enabled) ?? null;
  if (!track) return null;

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([track]);

  try {
    await video.play();
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise<void>((r) => {
        video.onloadeddata = () => r();
      });
    }

    const canvas = document.createElement("canvas");
    canvas.width = NSFW_MODEL_INPUT_PX;
    canvas.height = NSFW_MODEL_INPUT_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, NSFW_MODEL_INPUT_PX, NSFW_MODEL_INPUT_PX);

    return (await loadModel()).classify(canvas);
  } catch {
    return null;
  } finally {
    video.srcObject = null;
  }
}
