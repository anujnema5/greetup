export type ProducerMediaSource = "camera" | "screen";

export function mediaSourceFromProducerAppData(appData: unknown): ProducerMediaSource {
  const raw =
    appData && typeof appData === "object" && "mediaSource" in appData
      ? (appData as { mediaSource?: unknown }).mediaSource
      : undefined;
  return raw === "screen" ? "screen" : "camera";
}
